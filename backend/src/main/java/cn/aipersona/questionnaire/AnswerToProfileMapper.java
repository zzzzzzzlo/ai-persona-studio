package cn.aipersona.questionnaire;

import cn.aipersona.profile.api.ProfileDtos.*;
import cn.aipersona.profile.domain.ProfileDocument;
import cn.aipersona.profile.domain.ProfileDocument.*;
import cn.aipersona.profile.validation.*;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import java.util.*;
import org.springframework.stereotype.Component;
import static cn.aipersona.questionnaire.QuestionnaireDtos.*;

/** Deterministic server-side compilation of answers, not final persona prompt generation. */
@Component
public class AnswerToProfileMapper {
    private final QuestionnaireConfiguration config;
    private final AnswerValidator validator;
    private final ObjectMapper json;
    private final ProfileSchemaValidator schema;
    private final ProfileRules rules;
    public record Mapped(ObjectNode profile,List<EvidenceInput> evidence) {}
    public AnswerToProfileMapper(QuestionnaireConfiguration config,AnswerValidator validator,ObjectMapper json,ProfileSchemaValidator schema,ProfileRules rules){this.config=config;this.validator=validator;this.json=json;this.schema=schema;this.rules=rules;}
    public Mapped map(SubmissionRequest request){validator.validate(request);return new Build(request).run();}
    private final class Build {
        final SubmissionRequest request;final ObjectNode profile=json.createObjectNode();final List<EvidenceInput> evidence=new ArrayList<>();
        final ArrayNode policies=profile.putArray("contextualPolicies"),constraints=profile.putArray("hardConstraints"),anchors=profile.putArray("memoryAnchors"),unresolved=profile.putArray("unresolvedItems"),conflicts=profile.putArray("conflicts");
        final ObjectNode dimensions=profile.putObject("dimensions");
        Build(SubmissionRequest request){this.request=request;}
        Answer answer(String id){var a=request.answers().get(id);return a==null||a.isSkipped()?null:a;}
        List<JsonNode> selected(String id){return selected(config.question(id),answer(id));}
        List<JsonNode> selected(JsonNode q,Answer a){if(a==null)return List.of();var values=new HashSet<>(a.selected());var list=new ArrayList<JsonNode>();q.path("options").forEach(o->{if(values.contains(o.path("id").asText()))list.add(o);});return list;}
        String proof(String question,String target,JsonNode value,boolean confirmed,SourceType source){
            String id="ev_"+request.submissionId()+"_"+evidence.size();
            String excerpt=json.valueToTree(request.answers().get(question)).toString();if(excerpt.length()>1000)excerpt=excerpt.substring(0,1000);
            evidence.add(new EvidenceInput(id,source,request.questionnaireId()+":"+request.questionnaireVersion()+":"+question,target,excerpt,value.deepCopy(),confirmed?EvidenceStatus.CONFIRMED:EvidenceStatus.PROVISIONAL));return id;
        }
        void refs(ObjectNode node,String ref){node.putArray("evidenceRefs").add(ref);}
        void pending(String path,String question,boolean blocking){var item=unresolved.addObject();item.put("itemId","pending-"+unresolved.size());item.put("targetPath",path);item.put("question",question);item.put("blocking",blocking);item.put("status","OPEN");}
        Mapped run(){
            profile.put("schemaVersion",config.questionnaire.path("targetSchemaVersion").asText());
            var identity=config.engine.path("structuredMappings");String identityId=identity.path("identityQuestion").asText();var a=answer(identityId);
            var target=profile.putObject("targetPersona");
            String name=a.fieldValues().get(identity.path("nameField").asText());target.put("name",name);proof(identityId,"/targetPersona/name",json.valueToTree(name),false,SourceType.QUESTIONNAIRE);
            String archetypeField=identity.path("archetypeField").asText(),preset=a.fieldValues().get(archetypeField);
            var presetConfig=find(find(config.question(identityId).path("fields"),"fieldId",archetypeField).path("options"),"id",preset);
            String archetype="ARC_CUSTOM".equals(preset)?a.custom().get(archetypeField):presetConfig.path("label").asText();
            target.put("relationshipArchetype",archetype);proof(identityId,"/targetPersona/relationshipArchetype",json.valueToTree(archetype),false,SourceType.QUESTIONNAIRE);
            var core=target.putArray("coreSettings");core.add(a.fieldValues().get(identity.path("coreField").asText()));proof(identityId,"/targetPersona/coreSettings/0",core.get(0),false,SourceType.QUESTIONNAIRE);
            for(var q:config.questions()) for(var option:selected(q,answer(q.path("questionId").asText()))) if(option.path("mapping").has("coreSettingAppend")) {
                core.add(option.path("mapping").path("coreSettingAppend").asText());proof(q.path("questionId").asText(),"/targetPersona/coreSettings/"+(core.size()-1),core.get(core.size()-1),false,SourceType.QUESTIONNAIRE);
            }
            mapDimensions();mapPolicies();mapStructured(identity);mapText(identity);crossChecks();
            profile.set("readiness",json.valueToTree(rules.readiness(json.convertValue(profileWithEmptyReadiness(),ProfileDocument.class))));
            var schemaErrors=schema.errors(profile);
            if(!schemaErrors.isEmpty())throw new cn.aipersona.profile.domain.ProfileException(org.springframework.http.HttpStatus.UNPROCESSABLE_ENTITY,"PROFILE_SCHEMA_INVALID","候选画像不符合正式 Schema",schemaErrors);
            try{rules.validate(profile);}catch(cn.aipersona.profile.domain.ProfileException e){throw new cn.aipersona.profile.domain.ProfileException(org.springframework.http.HttpStatus.UNPROCESSABLE_ENTITY,"PROFILE_RULES_INVALID","候选画像业务规则校验失败",e.errors());}
            return new Mapped(profile,List.copyOf(evidence));
        }
        ObjectNode profileWithEmptyReadiness(){profile.set("readiness",json.valueToTree(new Readiness(false,List.of(),List.of())));return profile;}
        void mapDimensions(){
            for(var definition:config.catalog.path("dimensions")) {
                String id=definition.path("id").asText(),path="/dimensions/"+id;var rule=config.mapping.path("dimensionSynthesisRules").path(id);
                var values=new ArrayList<JsonNode>();var weights=new ArrayList<Double>();var refs=new ArrayList<String>();
                for(var source:rule.path("primaryQuestions")) {
                    String qid=source.path("questionId").asText();if(config.question(qid)==null)continue;
                    var options=selected(qid);if(options.isEmpty())continue;
                    if(definition.path("valueType").asText().equals("MULTI_SELECT")) {
                        var value=json.createArrayNode();for(var o:options)value.add(o.path("mapping").path("enumValue").asText());
                        values.add(value);weights.add(1.0);refs.add(proof(qid,path+"/value",value,false,SourceType.QUESTIONNAIRE));
                    } else for(var option:options) {
                        var m=option.path("mapping");if(!id.equals(m.path("dimension").asText()))continue;
                        JsonNode value=m.has("level")?m.path("level"):m.path("enumValue");
                        values.add(value);weights.add(source.path("weight").asDouble(1));refs.add(proof(qid,path+"/value",value,false,SourceType.QUESTIONNAIRE));
                    }
                }
                var d=dimensions.putObject(id);d.put("valueType",definition.path("valueType").asText());d.put("importance",config.engine.path("importanceDefault").asText());
                var refArray=d.putArray("evidenceRefs");refs.forEach(refArray::add);
                if(values.isEmpty()){d.putNull("value");d.put("status","UNKNOWN");d.put("evidenceStrength","NONE");}
                else if(values.get(0).isInt()) {
                    int min=values.stream().mapToInt(JsonNode::asInt).min().orElseThrow(),max=values.stream().mapToInt(JsonNode::asInt).max().orElseThrow();
                    if(max-min>=config.engine.path("levelConflictGap").asInt()) {
                        d.putNull("value");d.put("status","CONFLICTED");var conflict=conflicts.addObject();conflict.put("conflictId","gap-"+id);conflict.putArray("targetPaths").add(path+"/value").add(path+"/status");
                        conflict.put("description","同一维度的候选档位差达到 "+(max-min)+"，保留来源证据并等待澄清，不取平均值。");conflict.put("status","OPEN");conflict.putNull("resolution");
                    } else {double sum=0,total=0;for(int i=0;i<values.size();i++){sum+=values.get(i).asInt()*weights.get(i);total+=weights.get(i);}d.put("value",(int)Math.round(sum/total));d.put("status",config.engine.path("initialDimensionStatus").asText());}
                    d.put("evidenceStrength",values.size()>1?"STRONG":"MODERATE");
                } else {d.set("value",values.get(0).deepCopy());d.put("status",config.engine.path("initialDimensionStatus").asText());d.put("evidenceStrength","MODERATE");}
            }
            String importanceQ=config.mapping.path("importanceRules").path("sourceQuestionId").asText();var explicitlySelected=new HashSet<String>();
            for(var option:selected(importanceQ)) {
                var m=option.path("mapping");String dim=m.path("targetDimension").asText();explicitlySelected.add(dim);var d=(ObjectNode)dimensions.path(dim);d.put("importance",m.path("selectedImportance").asText());
                ((ArrayNode)d.path("evidenceRefs")).add(proof(importanceQ,"/dimensions/"+dim+"/importance",m.path("selectedImportance"),false,SourceType.QUESTIONNAIRE));
            }
            dimensions.fieldNames().forEachRemaining(dim->{if(!explicitlySelected.contains(dim))pending("/dimensions/"+dim+"/importance","重要性 MEDIUM 是产品默认值，尚未由你明确确认。",false);});
        }
        void mapPolicies(){
            for(var spec:config.mapping.path("contextualPolicySynthesisRules")) for(var option:selected(spec.path("questionId").asText())) {
                String qid=spec.path("questionId").asText();var m=option.path("mapping");String instruction=m.path("behaviorInstruction").asText(option.path("behaviorMeaning").asText(option.path("text").asText()));
                policy(m,qid,config.engine.path("policyTriggers").path(qid).asText(),instruction);
            }
            config.mapping.path("tradeoffRules").properties().forEach(entry->{var r=entry.getValue();var source=r.path("source");String qid=source.path("questionId").asText();var a=answer(qid);
                if(a==null||!a.subValues().getOrDefault(source.path("subQuestionId").asText(),List.of()).contains(source.path("optionId").asText()))return;
                var adapted=(ObjectNode)r.deepCopy();var overrides=adapted.putArray("overrides");
                for(var bridge:config.engine.path("tradeoffOverrides").path(entry.getKey())) {
                    var override=(ObjectNode)bridge.deepCopy();if(override.has("fromProfile")){override.set("value",profile.at(override.path("fromProfile").asText()).deepCopy());override.remove("fromProfile");}overrides.add(override);
                }
                policy(adapted,qid,r.path("triggerCondition").asText(),r.path("instruction").asText());if(r.has("hardConstraint"))constraint(r.path("hardConstraint"),qid);
            });
            for(var qid:config.mapping.path("hardConstraintSynthesisRules").path("sourceQuestionIds")) if(config.question(qid.asText())!=null) for(var o:selected(qid.asText())) {
                var m=o.path("mapping");if(m.has("constraintId"))constraint(m,qid.asText());
                if(m.path("noConstraintSelection").asBoolean())proof(qid.asText(),"/hardConstraints",m,true,SourceType.QUESTIONNAIRE);
            }
        }
        void policy(JsonNode source,String qid,String trigger,String instruction){
            var p=policies.addObject();p.put("policyId",source.path("policyId").asText());p.put("triggerCondition",trigger);p.put("priority",source.path("priority").asInt());
            var targets=p.putArray("affectedTargets");for(var t:source.path("affectedTargets"))if(!t.asText().equals("USER_AUTONOMY"))targets.add(t.asText());
            boolean confirmed=config.directlyConfirmsPolicy(qid);
            p.set("overrides",source.has("overrides")?source.path("overrides").deepCopy():json.createArrayNode());p.put("instruction",instruction);p.put("status",confirmed?"USER_CONFIRMED":"EXTRACTED_PROVISIONAL");
            refs(p,proof(qid,"/contextualPolicies/"+(policies.size()-1),p,confirmed,SourceType.QUESTIONNAIRE));
        }
        void constraint(JsonNode source,String qid){
            var c=constraints.addObject();for(String field:List.of("constraintId","category","ruleType","triggerCondition","prohibitedBehavior","positiveReplacement"))c.set(field,source.path(field).deepCopy());
            c.put("sourceType","QUESTIONNAIRE");c.put("immutableByInference",true);c.put("status","USER_CONFIRMED");refs(c,proof(qid,"/hardConstraints/"+(constraints.size()-1),c,true,SourceType.QUESTIONNAIRE));
        }
        void mapStructured(JsonNode identity){
            var narrative=profile.putObject("narrativeConfig");String qid=identity.path("narrativeQuestion").asText();var a=answer(qid);
            for(var sub:config.question(qid).path("subQuestions")){var option=find(sub.path("options"),"id",a.subValues().get(sub.path("subId").asText()).get(0));var m=option.path("mapping");String path=m.path("targetPath").asText();narrative.set(last(path),m.path("value").deepCopy());proof(qid,path,m.path("value"),false,SourceType.QUESTIONNAIRE);}
            qid=identity.path("linguisticQuestion").asText();a=answer(qid);var language=profile.putObject("linguisticConfig");
            for(var f:config.question(qid).path("fields")) {
                String field=f.path("fieldId").asText();JsonNode value;
                if(f.path("type").asText().startsWith("MULTI_")) {
                    var list=new LinkedHashSet<String>();for(String selected:a.multiple().getOrDefault(field,List.of()))list.add(find(f.path("options"),"id",selected).path("value").asText());
                    String extra=a.custom().get(field);if(extra!=null&&!extra.isBlank())list.add(extra.trim());value=json.valueToTree(list);
                } else value=json.valueToTree(a.fieldValues().get(field));
                String key=field.equals("toneTags")?"tone":field;language.set(key,value);proof(qid,"/linguisticConfig/"+key,value,false,SourceType.QUESTIONNAIRE);
            }
            qid=identity.path("memoryQuestion").asText();a=answer(qid);
            if(a!=null) for(var slot:config.question(qid).path("slots")){String slotId=slot.path("slotId").asText(),content=a.anchorValues().get(slotId);if(content==null||content.isBlank())continue;
                var anchor=anchors.addObject();anchor.put("anchorId",slotId);anchor.put("content",content);anchor.put("status","EXTRACTED_PROVISIONAL");refs(anchor,proof(qid,"/memoryAnchors/"+(anchors.size()-1),anchor,false,SourceType.QUESTIONNAIRE));}
        }
        void mapText(JsonNode identity){
            for(var id:identity.path("freeTextQuestions")){String qid=id.asText();var a=answer(qid);if(a==null||a.text()==null||a.text().isBlank())continue;
                String target=config.question(qid).path("targetPaths").get(0).asText();var raw=json.createObjectNode().put("rawText",a.text()).put("interpretation","NOT_ANALYZED");
                proof(qid,target,raw,false,SourceType.FREE_TEXT);pending(target,qid+" 的自由文本已保留，尚未进行语义分析和用户确认。",false);
            }
        }
        void crossChecks(){
            for(var check:config.engine.path("boundaryCrossChecks")) {
                if(!isSelected(check.path("when")))continue;
                String qid=check.path("when").path("questionId").asText(),path="/targetPersona/coreSettings";
                var core=(ArrayNode)profile.at(path);int boundaryStart=core.size();
                for(var boundary:check.path("requiredBoundaries")) {
                    core.add(boundary.asText());proof(qid,path+"/"+(core.size()-1),boundary,true,SourceType.QUESTIONNAIRE);
                }
                // Absence of a Q19 prohibition never implies consent or a conflict.
                pending(path,check.path("reviewQuestion").asText(),false);
                for(var signal:check.path("conflictingSelections"))if(isSelected(signal)) {
                    var conflict=conflicts.addObject();conflict.put("conflictId",check.path("checkId").asText()+"-"+conflicts.size());
                    conflict.putArray("targetPaths").add(path+"/"+(boundaryStart+signal.path("boundaryIndex").asInt())).add(signal.path("targetPath").asText());
                    conflict.put("description",qid+" 的最低边界与 "+signal.path("questionId").asText()+" 的明确选择冲突："+signal.path("description").asText());
                    conflict.put("status","OPEN");conflict.putNull("resolution");
                    proof(signal.path("questionId").asText(),"/conflicts/"+(conflicts.size()-1),conflict,false,SourceType.QUESTIONNAIRE);
                }
            }
            for(var check:config.engine.path("clarificationChecks")){
                String qid=check.path("selectedQuestion").asText();var a=answer(qid);if(a==null||!a.selected().contains(check.path("selectedOption").asText()))continue;
                boolean triggered=false;
                for(var term:check.path("anyOf")){var b=answer(term.path("question").asText());if(b==null)continue;var chosen=term.has("subQuestion")?b.subValues().getOrDefault(term.path("subQuestion").asText(),List.of()):b.selected();if(chosen.contains(term.path("option").asText()))triggered=true;}
                if(triggered){String path="/dimensions/"+check.path("dimension").asText();var d=(ObjectNode)profile.at(path);d.putNull("value");d.put("status","NEEDS_CLARIFICATION");pending(path,check.path("question").asText(),true);}
            }
        }
        boolean isSelected(JsonNode ref){var a=answer(ref.path("questionId").asText());if(a==null)return false;return (ref.has("subQuestionId")?a.subValues().getOrDefault(ref.path("subQuestionId").asText(),List.of()):a.selected()).contains(ref.path("optionId").asText());}
    }
    static JsonNode find(JsonNode array,String key,String value){for(var n:array)if(n.path(key).asText().equals(value))return n;throw new IllegalStateException("Invalid validated reference "+key);}
    static String last(String path){return path.substring(path.lastIndexOf('/')+1);}
}
