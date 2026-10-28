package cn.aipersona.questionnaire;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import java.io.IOException;
import java.util.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class QuestionnaireConfiguration {
    public final JsonNode questionnaire, mapping, clarificationBank, catalog, engine;
    private final ObjectMapper json;
    private final Map<String,JsonNode> questions=new LinkedHashMap<>();
    private static final Set<String> DISPLAY=Set.of("questionnaireId","version","title","estimatedMinutes","totalQuestions","modules","questions","moduleId","description","questionIds","questionId","questionType","required","allowSkip","minSelections","maxSelections","options","id","text","label","value","fields","fieldId","placeholder","maxLength","type","defaultValue","minItems","maxItems","subQuestions","subId","prompt","slots","slotId","selectionRules","exclusiveOptionIds","exclusiveOptionsApplyToAllOtherOptions","message");
    public QuestionnaireConfiguration(ObjectMapper json) throws IOException {
        this.json=json;
        questionnaire=read("questionnaire/paid-questionnaire-v1.json"); mapping=read("questionnaire/paid-scoring-mapping-v1.json");
        clarificationBank=read("questionnaire/paid-clarification-bank-v1.json"); catalog=read("schema/dimension-catalog.json");engine=read("questionnaire/engine-rules-v1.json");
        for(var q:questionnaire.path("questions")) {
            String id=q.path("questionId").asText();
            if(questions.put(id,q)!=null || q.path("required").asBoolean()==q.path("allowSkip").asBoolean()) throw new IllegalStateException("Invalid questionnaire definition "+id);
        }
        if(questions.size()!=questionnaire.path("totalQuestions").asInt() || !questionnaire.path("version").equals(mapping.path("version"))) throw new IllegalStateException("Questionnaire version mismatch");
        // Fail startup on invalid server-controlled mapping references.
        var dims=new HashSet<String>();catalog.path("dimensions").forEach(d->dims.add(d.path("id").asText()));
        for(var q:questions.values()) for(var option:q.path("options")) {
            var rule=option.path("mapping");
            if(rule.has("dimension")&&!dims.contains(rule.path("dimension").asText())) throw new IllegalStateException("Unknown dimension");
            for(var override:rule.path("overrides")) if(!override.path("target").asText().matches("/dimensions/("+String.join("|",dims)+")/value")) throw new IllegalStateException("Unknown override target");
        }
        var allIds=new HashSet<>(questions.keySet());questions.values().forEach(q->q.path("subQuestions").forEach(s->allIds.add(s.path("subId").asText())));
        mapping.path("dimensionSynthesisRules").properties().forEach(e->{if(!dims.contains(e.getKey()))throw new IllegalStateException("Unknown mapped dimension");for(var ref:e.getValue().path("primaryQuestions"))if(!allIds.contains(ref.path("questionId").asText()))throw new IllegalStateException("Unknown source question");});
        for(var module:questionnaire.path("modules"))for(var id:module.path("questionIds"))if(!questions.containsKey(id.asText()))throw new IllegalStateException("Unknown module question");
        var confirmation=engine.path("policyConfirmation");
        requireConfirmation(confirmation.path("default").asText());
        confirmation.path("byQuestionId").properties().forEach(e->{
            if(!questions.containsKey(e.getKey()))throw new IllegalStateException("Unknown confirmation question");
            requireConfirmation(e.getValue().asText());
        });
        for(var check:engine.path("boundaryCrossChecks")) {
            requireSelection(check.path("when"));
            if(!questions.containsKey(check.path("relatedQuestionId").asText())||check.path("requiredBoundaries").isEmpty()||check.path("reviewQuestion").asText().isBlank())throw new IllegalStateException("Invalid boundary cross-check");
            for(var signal:check.path("conflictingSelections")){
                requireSelection(signal);
                var index=signal.path("boundaryIndex");
                if(!index.isInt()||index.asInt()<0||index.asInt()>=check.path("requiredBoundaries").size()||!signal.path("targetPath").asText().startsWith("/")||signal.path("description").asText().isBlank())throw new IllegalStateException("Invalid boundary conflict signal");
            }
        }
    }
    private void requireConfirmation(String value){if(!Set.of("EXTRACTED_PROVISIONAL","DIRECT_USER_CONFIRMED").contains(value))throw new IllegalStateException("Unknown confirmation policy: "+value);}
    private void requireSelection(JsonNode ref){
        var q=questions.get(ref.path("questionId").asText());if(q==null)throw new IllegalStateException("Unknown cross-check question");
        JsonNode options=q.path("options");
        if(ref.has("subQuestionId")){options=null;for(var sub:q.path("subQuestions"))if(sub.path("subId").equals(ref.path("subQuestionId")))options=sub.path("options");}
        if(options!=null)for(var option:options)if(option.path("id").equals(ref.path("optionId")))return;
        throw new IllegalStateException("Unknown cross-check option");
    }
    public boolean directlyConfirmsPolicy(String questionId){return engine.path("policyConfirmation").path("byQuestionId").path(questionId).asText(engine.path("policyConfirmation").path("default").asText()).equals("DIRECT_USER_CONFIRMED");}
    private JsonNode read(String path) throws IOException {try(var in=new ClassPathResource(path).getInputStream()){return json.readTree(in);}}
    public Collection<JsonNode> questions(){return questions.values();}
    public JsonNode question(String id){return questions.get(id);}
    public void requireVersion(String id,String version){
        if(!questionnaire.path("questionnaireId").asText().equals(id)||!questionnaire.path("version").asText().equals(version)) throw QuestionnaireDtos.error(HttpStatus.BAD_REQUEST,"UNSUPPORTED_QUESTIONNAIRE_VERSION","问卷 ID 或版本不受支持","/questionnaireVersion");
    }
    public JsonNode display(String id,String version){
        requireVersion(id,version==null?questionnaire.path("version").asText():version);
        var out=(ObjectNode)project(questionnaire);
        // Missing field-level required/maxLength mean the Schema-required structured field contract.
        for(var q:out.path("questions")) {
            ((ObjectNode)q).put("maxTextLength",4000);
            for(var f:q.path("fields")) {
                if(!f.has("required")) ((ObjectNode)f).put("required",true);
                if(!f.has("maxLength")) ((ObjectNode)f).put("maxLength",400);
            }
        }
        return out;
    }
    private JsonNode project(JsonNode node){
        if(node.isArray()){var a=json.createArrayNode();node.forEach(n->a.add(project(n)));return a;}
        if(!node.isObject()) return node.deepCopy();
        var out=json.createObjectNode();node.properties().forEach(e->{if(DISPLAY.contains(e.getKey()))out.set(e.getKey(),project(e.getValue()));});return out;
    }
}
