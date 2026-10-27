package cn.aipersona.profile.application;

import cn.aipersona.profile.api.ProfileDtos.*;
import cn.aipersona.profile.domain.*;
import cn.aipersona.profile.domain.ProfileDocument.*;
import cn.aipersona.profile.persistence.*;
import cn.aipersona.profile.validation.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.*;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {
    private final ProfileMapper profiles;
    private final ProfileVersionMapper versions;
    private final ProfileEvidenceMapper evidence;
    private final ProfileSchemaValidator schema;
    private final ProfileRules rules;
    private final ObjectMapper json;
    private final String ownerId;
    public ProfileService(ProfileMapper profiles, ProfileVersionMapper versions, ProfileEvidenceMapper evidence,
        ProfileSchemaValidator schema, ProfileRules rules, ObjectMapper json,
        @Value("${app.development-owner-id}") String ownerId) {
        this.profiles=profiles; this.versions=versions; this.evidence=evidence;
        this.schema=schema; this.rules=rules; this.json=json; this.ownerId=ownerId;
    }
    /** Database-free structural and deterministic validation. References checked at write time. */
    public ValidationResult validate(JsonNode node) {
        schema.requireValid(node);
        var p = rules.validate(node);
        return new ValidationResult(true,List.of(),p.readiness());
    }

    @Transactional
    public ProfileResponse create(CreateProfileRequest request) {
        validate(request.profile());
        rules.protectFromInference(null,request.profile(),request.effectiveOrigin());
        validateEvidence(request.profile(),request.evidence(),List.of(),request.effectiveOrigin());
        var entity = new ProfileEntity(); entity.profileId=UUID.randomUUID().toString();
        entity.ownerUserId=ownerId; entity.currentVersion=1;
        entity.status=status(request.profile()); entity.createdAt=Instant.now(); entity.updatedAt=entity.createdAt;
        profiles.insert(entity);
        writeSnapshot(entity.profileId,1,request.profile(),request.changeReason(),request.evidence());
        return response(entity);
    }

    public ProfileResponse get(String profileId) { return response(owned(profiles.findOwned(profileId,ownerId))); }

    @Transactional
    public ProfileResponse addVersion(String profileId, NewVersionRequest request) {
        validate(request.profile());
        var entity = owned(profiles.lockOwned(profileId,ownerId));
        if(entity.currentVersion!=request.expectedCurrentVersion()) throw ProfileException.conflict();
        var previous=read(versions.findVersion(profileId,entity.currentVersion).profileJson);
        rules.protectFromInference(previous,request.profile(),request.effectiveOrigin());
        validateEvidence(request.profile(),request.evidence(),evidence.findThroughVersion(profileId,entity.currentVersion),request.effectiveOrigin());
        int next=Math.addExact(entity.currentVersion,1);
        if (profiles.advance(profileId,entity.currentVersion,next,status(request.profile()))!=1) throw ProfileException.conflict();
        writeSnapshot(profileId,next,request.profile(),request.changeReason(),request.evidence());
        return response(profiles.findOwned(profileId,ownerId));
    }

    private ProfileEntity owned(ProfileEntity entity) {
        if(entity==null) throw new ProfileException(HttpStatus.NOT_FOUND,"PROFILE_NOT_FOUND","画像不存在",List.of());
        return entity;
    }
    private String status(JsonNode document) { return document.at("/readiness/readyForCompilation").asBoolean()?"READY":"DRAFT"; }
    private ProfileResponse response(ProfileEntity p) {
        var v=versions.findVersion(p.profileId,p.currentVersion);
        return new ProfileResponse(p.profileId,p.ownerUserId,p.currentVersion,p.status,p.createdAt,p.updatedAt,
            new VersionResponse(v.versionNumber,v.schemaVersion,v.readyForCompilation,v.changeReason,json.convertValue(read(v.profileJson),ProfileDocument.class),v.createdAt));
    }
    private void writeSnapshot(String id,int version,JsonNode node,String reason,List<EvidenceInput> inputs) {
        var v=new ProfileVersionEntity(); v.profileId=id; v.versionNumber=version; v.schemaVersion=node.path("schemaVersion").asText();
        v.profileJson=encode(node); v.readyForCompilation=node.at("/readiness/readyForCompilation").asBoolean();
        v.changeReason=reason; v.createdAt=Instant.now(); versions.insert(v);
        for(var input:inputs) {
            var e=new ProfileEvidenceEntity(); e.profileId=id; e.versionNumber=version; e.evidenceId=input.evidenceId();
            e.sourceType=input.sourceType().name(); e.sourceRef=input.sourceRef(); e.targetFieldPath=input.targetFieldPath();
            e.rawExcerpt=input.rawExcerpt(); e.extractedValue=encode(input.extractedValue()); e.status=input.status().name(); e.createdAt=Instant.now(); evidence.insert(e);
        }
    }

    private void validateEvidence(JsonNode node,List<EvidenceInput> inputs,List<ProfileEvidenceEntity> previous,WriteOrigin origin) {
        var errors=new ArrayList<FieldError>();
        var known=new HashMap<String,ProfileEvidenceEntity>(); previous.forEach(e -> known.put(e.evidenceId,e));
        for(int i=0;i<inputs.size();i++) {
            var input=inputs.get(i); String path="/evidence/"+i;
            if(known.containsKey(input.evidenceId())) errors.add(new FieldError(path+"/evidenceId","证据不可重复或覆盖"));
            if(node.at(input.targetFieldPath()).isMissingNode()) errors.add(new FieldError(path+"/targetFieldPath","必须指向画像内存在的 JSON Pointer；空字符串代表整份问卷"));
            if((origin==WriteOrigin.MODEL_INFERENCE && input.sourceType()!=SourceType.MODEL_INFERENCE)
                || (input.sourceType()==SourceType.MODEL_INFERENCE && input.status()==EvidenceStatus.CONFIRMED))
                errors.add(new FieldError(path,"模型证据不能伪装为用户来源或用户确认"));
            var e=new ProfileEvidenceEntity(); e.evidenceId=input.evidenceId(); e.sourceType=input.sourceType().name();
            e.status=input.status().name(); e.targetFieldPath=input.targetFieldPath(); known.put(input.evidenceId(),e);
        }
        checkReferences(node,"",known,errors);
        if(!errors.isEmpty()) throw ProfileException.invalid(errors);
    }
    private void checkReferences(JsonNode node,String path,Map<String,ProfileEvidenceEntity> known,List<FieldError> errors) {
        if(node.isObject()) {
            if(node.has("evidenceRefs")) {
                boolean userProof=false;
                for(var ref:node.path("evidenceRefs")) {
                    var e=known.get(ref.asText());
                    if(e==null || e.status.equals("REJECTED")) errors.add(new FieldError(path+"/evidenceRefs","证据不存在、被拒绝或属于其他画像: "+ref.asText()));
                    else {
                        boolean covers=e.targetFieldPath.isEmpty() || path.equals(e.targetFieldPath) || path.startsWith(e.targetFieldPath+"/") || e.targetFieldPath.startsWith(path+"/");
                        if(!covers) errors.add(new FieldError(path+"/evidenceRefs","证据目标不覆盖当前条目: "+ref.asText()));
                        if(covers && e.status.equals("CONFIRMED") && !e.sourceType.equals("MODEL_INFERENCE")) userProof=true;
                    }
                }
                if(node.path("status").asText().equals("USER_CONFIRMED") && !userProof) errors.add(new FieldError(path+"/evidenceRefs","用户确认条目必须引用已确认的非模型证据"));
            }
            node.properties().forEach(e -> checkReferences(e.getValue(),path+"/"+e.getKey(),known,errors));
        } else if(node.isArray()) for(int i=0;i<node.size();i++) checkReferences(node.get(i),path+"/"+i,known,errors);
    }
    private String encode(JsonNode node) { try { return json.writeValueAsString(node); } catch(JsonProcessingException e) { throw new IllegalStateException(e); } }
    private JsonNode read(String text) { try { return json.readTree(text); } catch(JsonProcessingException e) { throw new IllegalStateException("已存画像无法解析",e); } }
}
