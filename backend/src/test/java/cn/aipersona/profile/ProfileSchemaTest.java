package cn.aipersona.profile;

import cn.aipersona.profile.validation.*;
import cn.aipersona.profile.domain.*;
import cn.aipersona.profile.domain.ProfileDocument.WriteOrigin;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import java.nio.file.*;
import org.junit.jupiter.api.*;
import static org.assertj.core.api.Assertions.*;

class ProfileSchemaTest {
    final ObjectMapper json = new ObjectMapper();
    ProfileSchemaValidator schema;
    ProfileRules rules;
    ObjectNode ready;
    @BeforeEach void setup() throws Exception {
        schema=new ProfileSchemaValidator(); rules=new ProfileRules(json);
        ready=(ObjectNode)json.readTree(Files.readString(Path.of("../docs/examples/profile-ready.json")));
    }
    @Test void validReadyAndDraftPass() throws Exception {
        assertThat(schema.errors(ready)).isEmpty(); rules.validate(ready);
        var draft=json.readTree(Files.readString(Path.of("../docs/examples/profile-draft.json")));
        assertThat(schema.errors(draft)).isEmpty(); rules.validate(draft);
    }
    @Test void missingTopLevelRejected() { ready.remove("schemaVersion"); assertThat(schema.errors(ready)).anyMatch(e -> e.message().contains("schemaVersion")); }
    @Test void invalidLevelRejected() { ((ObjectNode)ready.at("/dimensions/teasingIntensity")).put("value",6); assertThat(schema.errors(ready)).anyMatch(e -> e.path().contains("teasingIntensity/value")); }
    @Test void allUnknownLikeStatesRejectNonNullValue() {
        for(String state:new String[]{"UNKNOWN","NEEDS_CLARIFICATION","CONFLICTED","USER_SKIPPED"}) {
            ((ObjectNode)ready.at("/dimensions/teasingIntensity")).put("status",state);
            assertThat(schema.errors(ready)).anyMatch(e -> e.path().contains("teasingIntensity"));
        }
    }
    @Test void tentativeNeedsValueAndEvidence() {
        var d=(ObjectNode)ready.at("/dimensions/teasingIntensity"); d.put("status","INFERRED_TENTATIVE"); d.putNull("value");
        assertThat(schema.errors(ready)).isNotEmpty(); d.put("value",2); d.putArray("evidenceRefs"); assertThat(schema.errors(ready)).isNotEmpty();
    }
    @Test void missingConstraintAndPolicyFieldsRejected() {
        ((ObjectNode)ready.at("/hardConstraints/0")).remove("positiveReplacement");
        ((ObjectNode)ready.at("/contextualPolicies/0")).remove("triggerCondition");
        assertThat(schema.errors(ready)).anyMatch(e -> e.path().contains("hardConstraints"));
        assertThat(schema.errors(ready)).anyMatch(e -> e.path().contains("contextualPolicies"));
    }
    @Test void enumMultiselectUnknownKeysAndTypedOverridesRejected() {
        ((ObjectNode)ready.at("/dimensions/adaptationStyle")).put("value","MAGIC");
        ((ArrayNode)ready.at("/dimensions/emotionalSupport/value")).add("MAGIC");
        ((ObjectNode)ready.at("/contextualPolicies/0/overrides/0")).put("value",false);
        ready.put("databaseUserId","forbidden"); assertThat(schema.errors(ready)).hasSizeGreaterThanOrEqualTo(4);
    }
    @Test void computedReadinessCannotBeForged() {
        ((ObjectNode)ready.path("readiness")).put("readyForCompilation",false);
        assertThatThrownBy(() -> rules.validate(ready)).isInstanceOf(ProfileException.class).hasMessageContaining("画像校验失败");
    }
    @Test void policyTargetsAndDuplicateIdsRejected() {
        ((ArrayNode)ready.at("/contextualPolicies/0/affectedTargets")).removeAll();
        ((ArrayNode)ready.path("hardConstraints")).add(ready.at("/hardConstraints/0").deepCopy());
        assertThatThrownBy(() -> rules.validate(ready)).isInstanceOf(ProfileException.class);
    }
    @Test void inferenceCannotChangeConfirmedPreferenceOrDeleteBoundary() {
        ObjectNode candidate=ready.deepCopy(); ((ObjectNode)candidate.at("/dimensions/teasingIntensity")).put("value",1);
        assertThatThrownBy(() -> rules.protectFromInference(ready,candidate,WriteOrigin.MODEL_INFERENCE)).isInstanceOf(ProfileException.class);
        candidate.set("dimensions",ready.path("dimensions").deepCopy()); ((ArrayNode)candidate.path("hardConstraints")).removeAll();
        assertThatThrownBy(() -> rules.protectFromInference(ready,candidate,WriteOrigin.MODEL_INFERENCE)).isInstanceOf(ProfileException.class);
    }
    @Test void inferenceCannotForgeConfirmationOrDisableImmutableFlag() {
        assertThatThrownBy(() -> rules.protectFromInference(null,ready,WriteOrigin.MODEL_INFERENCE)).isInstanceOf(ProfileException.class);
        ObjectNode candidate=ready.deepCopy(); ((ObjectNode)candidate.at("/hardConstraints/0")).put("immutableByInference",false);
        assertThatThrownBy(() -> rules.protectFromInference(ready,candidate,WriteOrigin.MODEL_INFERENCE)).isInstanceOf(ProfileException.class);
    }
    @Test void userCanExplicitlyChangeBoundary() {
        ObjectNode candidate=ready.deepCopy(); ((ObjectNode)candidate.at("/hardConstraints/0")).put("prohibitedBehavior","新的用户边界");
        assertThatCode(() -> rules.protectFromInference(ready,candidate,WriteOrigin.USER)).doesNotThrowAnyException();
    }
    @Test void inferenceCannotForgeUserSkippedToBypassReadiness() throws Exception {
        var draft=(ObjectNode)json.readTree(Files.readString(Path.of("../docs/examples/profile-draft.json")));
        var candidate=draft.deepCopy();
        ((ObjectNode)candidate.at("/dimensions/teasingIntensity")).put("status","USER_SKIPPED");
        assertThatThrownBy(() -> rules.protectFromInference(draft,candidate,WriteOrigin.MODEL_INFERENCE)).isInstanceOf(ProfileException.class);
        assertThatThrownBy(() -> rules.protectFromInference(null,candidate,WriteOrigin.MODEL_INFERENCE)).isInstanceOf(ProfileException.class);
    }
    @Test void catalogAndSchemaDimensionsStayAligned() throws Exception {
        var catalog=json.readTree(getClass().getResourceAsStream("/schema/dimension-catalog.json"));
        var spec=json.readTree(getClass().getResourceAsStream("/schema/user-preference-profile.schema.json"));
        for(var d:catalog.path("dimensions")) {
            var dimension=spec.at("/properties/dimensions/properties/"+d.path("id").asText());
            assertThat(dimension.isMissingNode()).isFalse();
            if(d.path("valueType").asText().equals("LEVEL")) assertThat(d.path("behaviorAnchors").size()).isEqualTo(5);
        }
        assertThat(catalog.path("dimensions").size()).isEqualTo(spec.at("/properties/dimensions/properties").size());
    }
}
