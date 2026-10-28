package cn.aipersona.questionnaire;

import cn.aipersona.profile.application.ProfileService;
import cn.aipersona.profile.domain.*;
import cn.aipersona.profile.persistence.*;
import cn.aipersona.profile.validation.*;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import static cn.aipersona.questionnaire.QuestionnaireDtos.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class QuestionnaireIntegrationTest {
    @Autowired ObjectMapper json;@Autowired QuestionnaireConfiguration config;@Autowired AnswerToProfileMapper mapper;
    @Autowired QuestionnaireSubmissionService service;@Autowired ProfileService profiles;@Autowired ProfileSchemaValidator schema;@Autowired ProfileRules rules;
    @Autowired ProfileVersionMapper versions;@Autowired QuestionnaireSubmissionMapper submissions;@Autowired ProfileEvidenceMapper evidence;
    @Autowired JdbcTemplate jdbc;@Autowired MockMvc http;
    ObjectNode body;
    @BeforeEach void setup() throws Exception {body=(ObjectNode)json.readTree(Files.readString(Path.of("../docs/examples/paid-submission.json")));body.put("submissionId",UUID.randomUUID().toString());}
    SubmissionRequest request(){return json.convertValue(body,SubmissionRequest.class);}
    ObjectNode answers(){return (ObjectNode)body.path("answers");}
    void choice(String question,String...ids){var a=answers().putObject(question).putArray("selectedOptionIds");for(String id:ids)a.add(id);}
    @Test void actualAnswersMapValidateAndPersistWithTraceableEvidence() throws Exception {
        AnswerToProfileMapper.Mapped mapped;
        try{mapped=mapper.map(request());}catch(ProfileException e){throw new AssertionError(e.errors().toString(),e);}
        schema.requireValid(mapped.profile());rules.validate(mapped.profile());
        assertThat(mapped.profile().at("/dimensions/conversationInitiative/value").asInt()).isEqualTo(4);
        assertThat(mapped.profile().at("/dimensions/intimacyDirectness/importance").asText()).isEqualTo("MEDIUM");
        assertThat(mapped.evidence()).noneMatch(e->e.targetFieldPath().equals("/dimensions/intimacyDirectness/importance"));
        assertThat(mapped.profile().at("/dimensions/emotionalSupport/status").asText()).isEqualTo("EXTRACTED_PROVISIONAL");
        assertThat(mapped.profile().path("hardConstraints")).allMatch(c->c.path("status").asText().equals("USER_CONFIRMED"));
        var saved=service.submit(request());var loaded=profiles.get(saved.profileId());
        assertThat((JsonNode)json.valueToTree(loaded.current().profile())).isEqualTo(mapped.profile());
        assertThat(saved.readyForCompilation()).isFalse();assertThat(saved.profileStatus()).isEqualTo("DRAFT");
        assertThat(profiles.getEvidence(saved.profileId())).hasSize(mapped.evidence().size());
        assertThat(submissions.selectById(saved.submissionId()).requestJson).contains("Q26");
        http.perform(get("/api/v1/profiles/"+saved.profileId()+"/evidence")).andExpect(status().isOk()).andExpect(jsonPath("$[0].targetFieldPath").exists());
        Path out=Path.of("../output/paid-verification");Files.createDirectories(out);
        Files.writeString(out.resolve("profile.json"),json.writerWithDefaultPrettyPrinter().writeValueAsString(loaded.current().profile()));
        Files.writeString(out.resolve("evidence.json"),json.writerWithDefaultPrettyPrinter().writeValueAsString(profiles.getEvidence(saved.profileId())));
        Files.writeString(out.resolve("receipt.json"),json.writerWithDefaultPrettyPrinter().writeValueAsString(saved));
    }
    @Test void configOnlyExposesDisplayFields() throws Exception {
        var result=http.perform(get("/api/v1/questionnaires/"+config.questionnaire.path("questionnaireId").asText())).andExpect(status().isOk()).andReturn();
        String value=result.getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);assertThat(value).doesNotContain("\"mapping\"","dimensionSynthesisRules","tradeoffRules","evidenceStrength");
        assertThat(json.readTree(value).path("questions")).hasSize(26);
    }
    @Test void invalidReferencesCardinalityAndVersionRejectWithoutWriting() throws Exception {
        for(String variant:List.of("question","option","count","version","none")){
            setup();switch(variant){case "question"->answers().putObject("Q99");case "option"->choice("Q04","IMP_SUPPORT");case "count"->choice("Q12","IMP_SUPPORT");case "version"->body.put("questionnaireVersion","0.0.0");case "none"->choice("Q19","HC_OPT_00","HC_OPT_03");}
            http.perform(post("/api/v1/questionnaire-submissions").contentType("application/json").content(body.toString())).andExpect(status().isBadRequest());assertThat(submissions.selectById(body.path("submissionId").asText())).isNull();
        }
    }
    @Test void numericTextAndClientStatusAreRejected() throws Exception {
        ((ObjectNode)answers().path("Q01").path("fields")).put("personaName",123);
        http.perform(post("/api/v1/questionnaire-submissions").contentType("application/json").content(body.toString())).andExpect(status().isBadRequest());
        setup();body.put("userId","forged");http.perform(post("/api/v1/questionnaire-submissions").contentType("application/json").content(body.toString())).andExpect(status().isBadRequest());
        setup();answers().putObject("Q05").put("skipped","true");http.perform(post("/api/v1/questionnaire-submissions").contentType("application/json").content(body.toString())).andExpect(status().isBadRequest());
    }
    @Test void idempotencyAndDifferentContentsAndConcurrentRetries() throws Exception {
        var req=request();var start=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)){
            Callable<SubmissionResponse> task=()->{start.await();return service.submit(req);};var a=pool.submit(task);var b=pool.submit(task);start.countDown();
            var first=a.get(20,TimeUnit.SECONDS);assertThat(b.get(20,TimeUnit.SECONDS)).isEqualTo(first);assertThat(service.submit(req)).isEqualTo(first);
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM persona_profile_version WHERE profile_id=?",Integer.class,first.profileId())).isEqualTo(1);
        }
        choice("Q04","C");http.perform(post("/api/v1/questionnaire-submissions").contentType("application/json").content(body.toString())).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SUBMISSION_ID_CONFLICT"));
    }
    @Test void newSubmissionAppendsVersionAndStaleVersionRollsBack() {
        var first=service.submit(request());String snapshot=versions.findVersion(first.profileId(),1).profileJson;
        body.put("submissionId",UUID.randomUUID().toString());body.put("profileId",first.profileId());body.put("expectedCurrentVersion",1);choice("Q07","D");
        assertThat(service.submit(request()).profileVersion()).isEqualTo(2);assertThat(versions.findVersion(first.profileId(),1).profileJson).isEqualTo(snapshot);
        body.put("submissionId",UUID.randomUUID().toString());String id=body.path("submissionId").asText();assertThatThrownBy(()->service.submit(request())).isInstanceOf(ProfileException.class).extracting(e->((ProfileException)e).code()).isEqualTo("VERSION_CONFLICT");assertThat(submissions.selectById(id)).isNull();
    }
    @Test void databaseFailureRollsBackSubmissionProfileVersionAndEvidence() {
        var req=request();var mapped=mapper.map(req);var preexisting=mapped.evidence().get(0);
        // Force a unique-evidence DB failure *after* new submission/profile/snapshot inserts.
        profiles.create(new cn.aipersona.profile.api.ProfileDtos.CreateProfileRequest(mapped.profile(),"rollback fixture",mapped.evidence(),null));
        Integer before=jdbc.queryForObject("SELECT COUNT(*) FROM persona_profile",Integer.class),beforeEvidence=jdbc.queryForObject("SELECT COUNT(*) FROM persona_profile_evidence",Integer.class);
        assertThatThrownBy(()->service.submit(req)).isInstanceOf(ProfileException.class).extracting(e->((ProfileException)e).code()).isEqualTo("DATABASE_SAVE_FAILED");
        assertThat(submissions.selectById(req.submissionId())).isNull();assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM persona_profile",Integer.class)).isEqualTo(before);assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM persona_profile_evidence",Integer.class)).isEqualTo(beforeEvidence);
    }
    @Test void missingAuxiliaryPreservesPrimaryAndConflictDoesNotAverage() {
        answers().putObject("Q05").put("skipped",true);assertThat(mapper.map(request()).profile().at("/dimensions/conversationInitiative/value").asInt()).isEqualTo(4);
        choice("Q05","A");var p=mapper.map(request()).profile();assertThat(p.at("/dimensions/conversationInitiative/value").isNull()).isTrue();assertThat(p.at("/dimensions/conversationInitiative/status").asText()).isEqualTo("CONFLICTED");assertThat(p.path("conflicts")).isNotEmpty();
    }
    @Test void constraintsNoneTextAndTradeoffsStayIndependent(){
        answers().putObject("Q13").put("skipped",true);choice("Q19","HC_OPT_00");var mapped=mapper.map(request());
        assertThat(mapped.profile().path("hardConstraints")).isEmpty();assertThat(mapped.evidence()).anyMatch(e->e.sourceType()==ProfileDocument.SourceType.FREE_TEXT&&e.status()==ProfileDocument.EvidenceStatus.PROVISIONAL);
        assertThat(mapped.profile().at("/dimensions/relationshipLeadership/value").asInt()).isEqualTo(4);
    }
    @Test void everyConfiguredOptionMapsWithoutSchemaFailure() throws Exception {
        for(var q:config.questions())if(q.has("options"))for(var option:q.path("options")){
            setup();String qid=q.path("questionId").asText(),id=option.path("id").asText();
            if(qid.equals("Q12")){String other=id.equals("IMP_SUPPORT")?"IMP_AGENCY":"IMP_SUPPORT";choice(qid,id,other);}else choice(qid,id);
            var result=mapper.map(request());schema.requireValid(result.profile());rules.validate(result.profile());
        }
    }
    @Test void deterministicOutputAndOfficialSampleCompatibilityReport() throws Exception {
        assertThat(mapper.map(request())).isEqualTo(mapper.map(request()));
        var sample=json.readTree(Files.readString(Path.of("../docs/paid-bundle-v1.0.1/sample-valid-profile-v1.json")));
        var errors=schema.errors(sample);Files.createDirectories(Path.of("../output/paid-verification"));Files.writeString(Path.of("../output/paid-verification/provided-sample-schema-errors.json"),json.writerWithDefaultPrettyPrinter().writeValueAsString(errors));
        var report=json.createObjectNode();report.set("schemaErrors",json.valueToTree(errors));
        try{rules.validate(sample);report.putArray("businessErrors");}catch(ProfileException e){report.set("businessErrors",json.valueToTree(e.errors()));}
        Files.writeString(Path.of("../output/paid-verification/provided-sample-validation.json"),json.writerWithDefaultPrettyPrinter().writeValueAsString(report));
    }
}
