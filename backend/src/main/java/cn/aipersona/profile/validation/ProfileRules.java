package cn.aipersona.profile.validation;

import cn.aipersona.profile.api.ProfileDtos.FieldError;
import cn.aipersona.profile.domain.ProfileDocument;
import cn.aipersona.profile.domain.ProfileDocument.*;
import cn.aipersona.profile.domain.ProfileException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.springframework.stereotype.Component;

/** Deliberately small deterministic rules, not a personality scoring or merge engine. */
@Component
public class ProfileRules {
    private final ObjectMapper json;
    public ProfileRules(ObjectMapper json) { this.json = json; }

    public ProfileDocument validate(JsonNode node) {
        ProfileDocument p = json.convertValue(node, ProfileDocument.class);
        var errors = new ArrayList<FieldError>();
        unique(node.path("contextualPolicies"), "policyId", "/contextualPolicies", errors);
        unique(node.path("hardConstraints"), "constraintId", "/hardConstraints", errors);
        unique(node.path("memoryAnchors"), "anchorId", "/memoryAnchors", errors);
        unique(node.path("unresolvedItems"), "itemId", "/unresolvedItems", errors);
        unique(node.path("conflicts"), "conflictId", "/conflicts", errors);
        for (int i=0; i<p.hardConstraints().size(); i++) {
            var c = p.hardConstraints().get(i);
            if (c.status() == ConfirmationStatus.USER_CONFIRMED && (!c.immutableByInference() || c.sourceType() == SourceType.MODEL_INFERENCE))
                errors.add(new FieldError("/hardConstraints/"+i, "用户确认的硬约束必须禁止推断覆盖，且来源不能是模型推断"));
        }
        for (int i=0; i<p.contextualPolicies().size(); i++) {
            var rule = p.contextualPolicies().get(i);
            Set<String> targets = new HashSet<>();
            for (var override : rule.overrides()) {
                String target = override.target().startsWith("/dimensions/") ? override.target().split("/")[2] : "unsolicitedAdvice";
                if (!rule.affectedTargets().contains(target)) errors.add(new FieldError("/contextualPolicies/"+i+"/affectedTargets", "必须包含所有覆盖目标"));
                if (!targets.add(override.target())) errors.add(new FieldError("/contextualPolicies/"+i+"/overrides", "同一规则不能多次覆盖同一目标"));
            }
        }
        for (int i=0; i<p.unresolvedItems().size(); i++) {
            if (node.at(p.unresolvedItems().get(i).targetPath()).isMissingNode()) errors.add(new FieldError("/unresolvedItems/"+i+"/targetPath", "目标 JSON Pointer 不存在"));
        }
        for (int i=0; i<p.conflicts().size(); i++) {
            for (String path : p.conflicts().get(i).targetPaths()) if (node.at(path).isMissingNode()) errors.add(new FieldError("/conflicts/"+i+"/targetPaths", "目标 JSON Pointer 不存在: "+path));
        }
        Readiness calculated = readiness(p);
        if (!calculated.equals(p.readiness())) errors.add(new FieldError("/readiness", "应为: "+json.valueToTree(calculated)));
        if (!errors.isEmpty()) throw ProfileException.invalid(errors);
        return p;
    }

    public Readiness readiness(ProfileDocument p) {
        var blockers = new TreeSet<String>(); var warnings = new TreeSet<String>();
        p.dimensions().forEach((key,d) -> status("dimension:"+key,d.status(),blockers,warnings));
        p.contextualPolicies().forEach(r -> status("policy:"+r.policyId(),r.status(),blockers,warnings));
        p.hardConstraints().forEach(c -> status("constraint:"+c.constraintId(),c.status(),blockers,warnings));
        p.memoryAnchors().forEach(a -> status("anchor:"+a.anchorId(),a.status(),blockers,warnings));
        p.unresolvedItems().stream().filter(i -> i.status().equals("OPEN")).forEach(i -> (i.blocking()?blockers:warnings).add("unresolved:"+i.itemId()));
        p.conflicts().stream().filter(c -> c.status().equals("OPEN")).forEach(c -> blockers.add("conflict:"+c.conflictId()));
        return new Readiness(blockers.isEmpty(),List.copyOf(blockers),List.copyOf(warnings));
    }
    private void status(String key, ConfirmationStatus s, Set<String> blockers, Set<String> warnings) {
        if (s==ConfirmationStatus.USER_SKIPPED) warnings.add("skipped:"+key);
        else if (s!=ConfirmationStatus.USER_CONFIRMED) blockers.add(key);
    }
    private void unique(JsonNode nodes, String key, String path, List<FieldError> errors) {
        var ids = new HashSet<String>();
        for (int i=0;i<nodes.size();i++) if (!ids.add(nodes.get(i).path(key).asText())) errors.add(new FieldError(path+"/"+i+"/"+key, "ID 不可重复"));
    }

    public void protectFromInference(JsonNode previous, JsonNode candidate, WriteOrigin origin) {
        if (origin != WriteOrigin.MODEL_INFERENCE) return;
        var errors = new ArrayList<FieldError>();
        if (previous != null) {
            for (String key : List.of("targetPersona", "narrativeConfig", "linguisticConfig"))
                if (!previous.path(key).equals(candidate.path(key))) errors.add(new FieldError("/"+key,"V1 模型候选不能自动修改既有角色和表达设定，请交由用户确认"));
            previous.path("dimensions").properties().forEach(e -> {
                if (userDecision(e.getValue()) && !e.getValue().equals(candidate.path("dimensions").path(e.getKey())))
                    errors.add(new FieldError("/dimensions/"+e.getKey(), "模型不能覆盖用户已确认或跳过的偏好"));
            });
        }
        for (String section : List.of("dimensions", "contextualPolicies", "hardConstraints", "memoryAnchors")) {
            if (section.equals("dimensions")) {
                candidate.path(section).properties().forEach(e -> {
                    if (userDecision(e.getValue()) && (previous==null || !e.getValue().equals(previous.path(section).path(e.getKey()))))
                        errors.add(new FieldError("/dimensions/"+e.getKey(),"模型不能伪造用户确认或跳过"));
                });
                continue;
            }
            String id = switch(section) { case "contextualPolicies" -> "policyId"; case "hardConstraints" -> "constraintId"; default -> "anchorId"; };
            var oldById = byId(previous == null ? null : previous.path(section),id);
            var newById = byId(candidate.path(section),id);
            oldById.forEach((key,old) -> {
                if ((userDecision(old) || old.path("immutableByInference").asBoolean()) && !old.equals(newById.get(key)))
                    errors.add(new FieldError("/"+section,"模型不能删除或覆盖受保护条目: "+key));
            });
            newById.forEach((key,value) -> {
                if (userDecision(value) && !value.equals(oldById.get(key)))
                    errors.add(new FieldError("/"+section,"模型不能伪造用户确认或跳过: "+key));
            });
        }
        if (!errors.isEmpty()) throw ProfileException.invalid(errors);
    }
    private Map<String,JsonNode> byId(JsonNode nodes,String id) {
        var map = new HashMap<String,JsonNode>();
        if(nodes!=null) nodes.forEach(n -> map.put(n.path(id).asText(),n));
        return map;
    }
    private boolean userDecision(JsonNode node) {
        return Set.of("USER_CONFIRMED","USER_SKIPPED").contains(node.path("status").asText());
    }
}
