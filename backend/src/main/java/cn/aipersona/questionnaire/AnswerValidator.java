package cn.aipersona.questionnaire;

import cn.aipersona.profile.api.ProfileDtos.FieldError;
import cn.aipersona.profile.domain.ProfileException;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import static cn.aipersona.questionnaire.QuestionnaireDtos.*;

@Component
public class AnswerValidator {
    private final QuestionnaireConfiguration config;
    public AnswerValidator(QuestionnaireConfiguration config){this.config=config;}
    public void validate(SubmissionRequest request){
        config.requireVersion(request.questionnaireId(),request.questionnaireVersion());
        var errors=new ArrayList<FieldError>();
        if((request.profileId()==null)!=(request.expectedCurrentVersion()==null)) errors.add(new FieldError("/expectedCurrentVersion","更新画像必须同时传入画像 ID 与预期版本"));
        for(String id:request.answers().keySet()) if(config.question(id)==null) errors.add(new FieldError("/answers/"+id,"未知题目"));
        for(var q:config.questions()) {
            String id=q.path("questionId").asText(),path="/answers/"+id;
            Answer a=request.answers().get(id);
            if(a==null||a.isSkipped()||empty(a)) {
                if(q.path("required").asBoolean()||!q.path("allowSkip").asBoolean()) errors.add(new FieldError(path,"此题必答"));
                if(a!=null&&a.isSkipped()&&!empty(a)) errors.add(new FieldError(path,"跳过不能同时包含答案"));
                continue;
            }
            String type=q.path("questionType").asText();
            if(type.startsWith("SINGLE_")||type.startsWith("MULTI_")) {
                choices(a.selected(),q.path("options"),type.startsWith("SINGLE_")?1:q.path("minSelections").asInt(1),type.startsWith("SINGLE_")?1:q.path("maxSelections").asInt(1),path,errors);
                for(var exclusive:q.path("selectionRules").path("exclusiveOptionIds")) if(a.selected().contains(exclusive.asText())&&a.selected().size()>1) errors.add(new FieldError(path,"无禁区选项不能与其他禁区同时选择"));
                shape(a,true,false,false,false,false,false,false,path,errors);
            } else if(q.has("fields")) {
                var known=new HashSet<String>();var multi=new HashSet<String>();var custom=new HashSet<String>();
                for(var f:q.path("fields")) {
                    String field=f.path("fieldId").asText();boolean many=f.path("type").asText().startsWith("MULTI_");
                    if(many) {multi.add(field);custom.add(field);var ids=Optional.ofNullable(a.multiple().get(field)).orElse(List.of());
                        choices(ids,f.path("options"),0,f.path("maxItems").asInt(4),path+"/selections/"+field,errors);
                        String extra=a.custom().getOrDefault(field,"");text(extra,400,false,path+"/customTexts/"+field,errors);
                        int count=ids.size()+(extra==null||extra.isBlank()?0:1);
                        if(count<f.path("minItems").asInt(1)||count>f.path("maxItems").asInt(4)) errors.add(new FieldError(path+"/selections/"+field,"选择数量不符合限制"));
                    } else {known.add(field);String value=a.fieldValues().get(field);
                        text(value,f.path("maxLength").asInt(400),f.path("required").asBoolean(true),path+"/fields/"+field,errors);
                        if(f.has("options")&&value!=null) choices(List.of(value),f.path("options"),1,1,path+"/fields/"+field,errors);
                        if(f.path("type").asText().equals("SINGLE_SELECT_WITH_CUSTOM")) {custom.add(field);String extra=a.custom().get(field);text(extra,400,"ARC_CUSTOM".equals(value),path+"/customTexts/"+field,errors);}
                    }
                }
                keys(a.fieldValues(),known,path+"/fields",errors);keys(a.multiple(),multi,path+"/selections",errors);keys(a.custom(),custom,path+"/customTexts",errors);
                shape(a,false,false,true,true,false,true,false,path,errors);
            } else if(q.has("subQuestions")) {
                var known=new HashSet<String>();
                for(var sub:q.path("subQuestions")) {String subId=sub.path("subId").asText();known.add(subId);choices(a.subValues().getOrDefault(subId,List.of()),sub.path("options"),1,1,path+"/subAnswers/"+subId,errors);}
                keys(a.subValues(),known,path+"/subAnswers",errors);shape(a,false,false,false,false,true,false,false,path,errors);
            } else if(q.has("slots")) {
                var known=new HashSet<String>();for(var slot:q.path("slots")){String key=slot.path("slotId").asText();known.add(key);text(a.anchorValues().get(key),2000,false,path+"/anchors/"+key,errors);}
                keys(a.anchorValues(),known,path+"/anchors",errors);shape(a,false,false,false,false,false,false,true,path,errors);
            } else {text(a.text(),4000,true,path+"/text",errors);shape(a,false,true,false,false,false,false,false,path,errors);}
        }
        if(!errors.isEmpty()) throw new ProfileException(HttpStatus.BAD_REQUEST,"INVALID_ANSWERS","请检查答卷字段与选择数量",errors);
    }
    private boolean empty(Answer a){return a.selected().isEmpty()&&(a.text()==null||a.text().isBlank())&&a.fieldValues().isEmpty()&&a.multiple().isEmpty()&&a.subValues().isEmpty()&&a.custom().isEmpty()&&a.anchorValues().isEmpty();}
    private void choices(List<String> selected,JsonNode options,int min,int max,String path,List<FieldError> errors){
        if(selected==null){errors.add(new FieldError(path,"必须为选项 ID 数组"));return;}
        var known=new HashSet<String>();options.forEach(o->known.add(o.path("id").asText()));
        if(selected.size()<min||selected.size()>max||new HashSet<>(selected).size()!=selected.size()) errors.add(new FieldError(path,"选择数量不符合限制或含重复项"));
        for(String id:selected) if(id==null||!known.contains(id)) errors.add(new FieldError(path,"选项不属于该题目"));
    }
    private void text(String value,int max,boolean required,String path,List<FieldError> errors){if((required&&(value==null||value.isBlank()))||(value!=null&&value.length()>max))errors.add(new FieldError(path,"必填内容为空或超过 "+max+" 字符"));}
    private void keys(Map<String,?> values,Set<String> allowed,String path,List<FieldError> errors){for(String key:values.keySet())if(!allowed.contains(key)||values.get(key)==null)errors.add(new FieldError(path+"/"+key,"未知字段或空值"));}
    private void shape(Answer a,boolean selected,boolean text,boolean fields,boolean multiple,boolean sub,boolean custom,boolean anchors,String path,List<FieldError> errors){
        if((!selected&&!a.selected().isEmpty())||(!text&&a.text()!=null&&!a.text().isBlank())||(!fields&&!a.fieldValues().isEmpty())||(!multiple&&!a.multiple().isEmpty())||(!sub&&!a.subValues().isEmpty())||(!custom&&!a.custom().isEmpty())||(!anchors&&!a.anchorValues().isEmpty()))errors.add(new FieldError(path,"答案结构与题型不匹配"));
    }
}
