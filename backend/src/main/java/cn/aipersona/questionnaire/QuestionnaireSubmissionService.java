package cn.aipersona.questionnaire;

import cn.aipersona.profile.application.ProfileService;
import cn.aipersona.profile.api.ProfileDtos.*;
import cn.aipersona.profile.domain.ProfileException;
import cn.aipersona.profile.persistence.*;
import com.fasterxml.jackson.databind.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static cn.aipersona.questionnaire.QuestionnaireDtos.*;

@Service
public class QuestionnaireSubmissionService {
    private final QuestionnaireSubmissionMapper submissions;private final ProfileService profiles;
    private final AnswerToProfileMapper mapper;private final ObjectMapper json;private final TransactionTemplate transaction;private final String owner;
    public QuestionnaireSubmissionService(QuestionnaireSubmissionMapper submissions,ProfileService profiles,AnswerToProfileMapper mapper,ObjectMapper json,PlatformTransactionManager tx,@Value("${app.development-owner-id}")String owner){this.submissions=submissions;this.profiles=profiles;this.mapper=mapper;this.json=json;this.transaction=new TransactionTemplate(tx);this.owner=owner;}
    public SubmissionResponse get(String id){var stored=submissions.selectById(id);if(stored==null||!stored.ownerUserId.equals(owner))throw error(HttpStatus.NOT_FOUND,"SUBMISSION_NOT_FOUND","提交记录不存在","/submissionId");return decode(stored);}
    public SubmissionResponse submit(SubmissionRequest request){
        String hash=hash(request);var existing=submissions.selectById(request.submissionId());if(existing!=null)return same(existing,hash);
        var mapped=mapper.map(request);
        try {
            return transaction.execute(status->{
                var row=new QuestionnaireSubmissionEntity();row.submissionId=request.submissionId();row.ownerUserId=owner;row.questionnaireId=request.questionnaireId();row.questionnaireVersion=request.questionnaireVersion();row.requestHash=hash;row.requestJson=encode(json.valueToTree(request));row.processingStatus="PROCESSING";row.createdAt=Instant.now();submissions.insert(row);
                ProfileResponse saved=request.profileId()==null
                    ? profiles.create(new CreateProfileRequest(mapped.profile(),"付费问卷 "+request.questionnaireVersion()+" 提交",mapped.evidence(),null))
                    : profiles.addVersion(request.profileId(),new NewVersionRequest(request.expectedCurrentVersion(),mapped.profile(),"新的付费问卷答卷",mapped.evidence(),null));
                var readiness=saved.current().profile().readiness();
                var response=new SubmissionResponse(request.submissionId(),saved.profileId(),saved.currentVersion(),request.questionnaireVersion(),"COMPLETED",saved.status(),readiness.readyForCompilation(),readiness.blockers().size()+readiness.warnings().size(),readiness.blockers(),readiness.warnings(),Instant.now());
                row.profileId=saved.profileId();row.profileVersion=saved.currentVersion();row.processingStatus="COMPLETED";row.responseJson=encode(json.valueToTree(response));row.processedAt=response.processedAt();
                if(submissions.updateById(row)!=1)throw new IllegalStateException("Submission write failed");return response;
            });
        } catch(DataAccessException failure){
            // A concurrent identical insert waits for the other transaction, then reads its receipt.
            var stored=submissions.selectById(request.submissionId());if(stored!=null)return same(stored,hash);
            throw error(HttpStatus.INTERNAL_SERVER_ERROR,"DATABASE_SAVE_FAILED","保存失败，事务已回滚；请用相同提交 ID 重试","/submissionId");
        }
    }
    private SubmissionResponse same(QuestionnaireSubmissionEntity row,String hash){
        if(!row.ownerUserId.equals(owner)||!row.requestHash.equals(hash))throw error(HttpStatus.CONFLICT,"SUBMISSION_ID_CONFLICT","同一提交 ID 的内容不同，请创建新提交","/submissionId");
        return decode(row);
    }
    private SubmissionResponse decode(QuestionnaireSubmissionEntity row){
        if(!"COMPLETED".equals(row.processingStatus))throw error(HttpStatus.CONFLICT,"SUBMISSION_IN_PROGRESS","提交仍在处理中，请使用相同 ID 重试","/submissionId");
        try{return json.readValue(row.responseJson,SubmissionResponse.class);}catch(Exception e){throw new IllegalStateException("Stored receipt invalid",e);}
    }
    private String hash(SubmissionRequest request){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(canonical(json.valueToTree(request)).getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
    private String canonical(JsonNode node){
        if(node.isObject()){var map=new TreeMap<String,String>();node.properties().forEach(e->map.put(e.getKey(),canonical(e.getValue())));return map.entrySet().stream().map(e->json.valueToTree(e.getKey()).toString()+":"+e.getValue()).collect(java.util.stream.Collectors.joining(",","{","}"));}
        if(node.isArray()){var values=new ArrayList<String>();node.forEach(n->values.add(canonical(n)));Collections.sort(values);return "["+String.join(",",values)+"]";}
        return node.toString();
    }
    private String encode(JsonNode node){return node.toString();}
}
