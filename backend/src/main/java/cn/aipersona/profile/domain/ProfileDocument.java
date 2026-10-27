package cn.aipersona.profile.domain;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Map;

/** Portable content only. Ownership, timestamps and revision numbers live in SQL. */
public record ProfileDocument(
    String schemaVersion, TargetPersona targetPersona, Map<String, Dimension> dimensions,
    List<ContextualPolicy> contextualPolicies, NarrativeConfig narrativeConfig,
    LinguisticConfig linguisticConfig, List<MemoryAnchor> memoryAnchors,
    List<HardConstraint> hardConstraints, List<UnresolvedItem> unresolvedItems,
    List<Conflict> conflicts, Readiness readiness
) {
    public enum ConfirmationStatus { UNKNOWN, INFERRED_TENTATIVE, EXTRACTED_PROVISIONAL, NEEDS_CLARIFICATION, CONFLICTED, USER_CONFIRMED, USER_SKIPPED }
    public enum ValueType { LEVEL, ENUM, MULTI_SELECT }
    public enum Importance { UNSPECIFIED, LOW, MEDIUM, HIGH, CRITICAL }
    public enum EvidenceStrength { NONE, WEAK, MODERATE, STRONG }
    public enum SourceType { QUESTIONNAIRE, FREE_TEXT, CLARIFICATION, USER_EDIT, MODEL_INFERENCE }
    public enum EvidenceStatus { PROVISIONAL, CONFIRMED, REJECTED }
    public enum WriteOrigin { USER, MODEL_INFERENCE }
    public record TargetPersona(String name, String relationshipArchetype, List<String> coreSettings) {}
    public record Dimension(JsonNode value, ValueType valueType, ConfirmationStatus status,
                            Importance importance, EvidenceStrength evidenceStrength, List<String> evidenceRefs) {}
    public record Override(String operation, String target, JsonNode value) {}
    public record ContextualPolicy(String policyId, String triggerCondition, int priority,
        List<String> affectedTargets, List<Override> overrides, String instruction,
        ConfirmationStatus status, List<String> evidenceRefs) {}
    public record NarrativeConfig(String mode, String perspective, String actionDescriptions) {}
    public record LinguisticConfig(String userAddress, String personaSelfAddress, List<String> tone, String language, String replyLength) {}
    public record MemoryAnchor(String anchorId, String content, ConfirmationStatus status, List<String> evidenceRefs) {}
    public record HardConstraint(String constraintId, String category, String ruleType, String triggerCondition,
        String prohibitedBehavior, String positiveReplacement, SourceType sourceType,
        boolean immutableByInference, ConfirmationStatus status, List<String> evidenceRefs) {}
    public record UnresolvedItem(String itemId, String targetPath, String question, boolean blocking, String status) {}
    public record Conflict(String conflictId, List<String> targetPaths, String description, String status, String resolution) {}
    public record Readiness(boolean readyForCompilation, List<String> blockers, List<String> warnings) {}
}
