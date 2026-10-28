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
    @Test void toneOptionsExposeAllEightLabelsAndSelectedValuesPersist() throws Exception {
        var response=http.perform(get("/api/v1/questionnaires/"+config.questionnaire.path("questionnaireId").asText())).andExpect(status().isOk()).andReturn();
        var display=json.readTree(response.getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8));
        var question=AnswerToProfileMapper.find(display.path("questions"),"questionId","Q22");
        var options=AnswerToProfileMapper.find(question.path("fields"),"fieldId","toneTags").path("options");
        var original=AnswerToProfileMapper.find(config.question("Q22").path("fields"),"fieldId","toneTags").path("options");
        assertThat(options).hasSize(8);
        for(int i=0;i<8;i++) {
            var option=options.get(i);assertThat(option.path("id")).isEqualTo(original.get(i).path("id"));
            assertThat(option.path("value").asText()).isNotBlank().isEqualTo(original.get(i).path("value").asText());
            ((ObjectNode)answers().path("Q22")).putObject("selections").putArray("toneTags").add(option.path("id").asText());
            assertThat(mapper.map(request()).profile().at("/linguisticConfig/tone")).containsExactly(option.path("value"));
        }
        var posted=http.perform(post("/api/v1/questionnaire-submissions").contentType("application/json").content(body.toString())).andExpect(status().isOk()).andReturn();
        String profileId=json.readTree(posted.getResponse().getContentAsString()).path("profileId").asText();
        assertThat(profiles.get(profileId).current().profile().linguisticConfig().tone()).containsExactly(original.get(7).path("value").asText());
    }
    @Test void configuredDirectPolicyIsConfirmedButSynthesisStaysProvisional(){
        for(String option:List.of("A","B","C","D")) {
            choice("Q16",option);var mapped=mapper.map(request());var p=mapped.profile();
            var policy=AnswerToProfileMapper.find(p.path("contextualPolicies"),"policyId","pol_conflict_angry_coax");
            assertThat(policy.path("status").asText()).isEqualTo("USER_CONFIRMED");
            var ref=policy.path("evidenceRefs").get(0).asText();
            assertThat(mapped.evidence()).anySatisfy(e->{assertThat(e.evidenceId()).isEqualTo(ref);assertThat(e.sourceType()).isEqualTo(ProfileDocument.SourceType.QUESTIONNAIRE);assertThat(e.status()).isEqualTo(ProfileDocument.EvidenceStatus.CONFIRMED);});
            var candidate=AnswerToProfileMapper.find(p.path("contextualPolicies"),"policyId","pol_sad_wronged_support");
            assertThat(candidate.path("status").asText()).isEqualTo("EXTRACTED_PROVISIONAL");
            assertThat(mapped.evidence()).anySatisfy(e->{assertThat(e.evidenceId()).isEqualTo(candidate.path("evidenceRefs").get(0).asText());assertThat(e.status()).isEqualTo(ProfileDocument.EvidenceStatus.PROVISIONAL);});
            assertThat(p.at("/dimensions/conversationInitiative/status").asText()).isEqualTo("EXTRACTED_PROVISIONAL");
            var readiness=rules.readiness(json.convertValue(p,ProfileDocument.class));
            assertThat(readiness.blockers()).doesNotContain("policy:pol_conflict_angry_coax").contains("policy:pol_sad_wronged_support","dimension:conversationInitiative");
            assertThat(readiness.readyForCompilation()).isFalse();
            ((ObjectNode)policy).put("status","EXTRACTED_PROVISIONAL");
            assertThat(rules.readiness(json.convertValue(p,ProfileDocument.class)).blockers()).hasSize(readiness.blockers().size()+1).contains("policy:pol_conflict_angry_coax");
        }
    }
    @Test void directQuestionnaireConfirmationCannotBeReusedAsModelConfirmation(){
        answers().putObject("Q13").put("skipped",true);choice("Q19","HC_OPT_00");var mapped=mapper.map(request());
        var forged=new cn.aipersona.profile.api.ProfileDtos.CreateProfileRequest(mapped.profile(),"model cannot confirm",mapped.evidence(),ProfileDocument.WriteOrigin.MODEL_INFERENCE);
        assertThatThrownBy(()->profiles.create(forged)).isInstanceOf(ProfileException.class).satisfies(e->assertThat(((ProfileException)e).errors()).anyMatch(f->f.path().equals("/contextualPolicies")));
        var modelProof=mapped.evidence().stream().map(e->new cn.aipersona.profile.api.ProfileDtos.EvidenceInput(e.evidenceId(),ProfileDocument.SourceType.MODEL_INFERENCE,e.sourceRef(),e.targetFieldPath(),e.rawExcerpt(),e.extractedValue(),e.status())).toList();
        assertThatThrownBy(()->profiles.create(new cn.aipersona.profile.api.ProfileDtos.CreateProfileRequest(mapped.profile(),"forged proof",modelProof,null))).isInstanceOf(ProfileException.class).satisfies(e->assertThat(((ProfileException)e).errors()).anyMatch(f->f.message().contains("模型证据不能")));
    }
    @Test void intenseJealousyPreservesMinimumBoundariesWithOrWithoutPrivacyVeto(){
        choice("Q03","D");
        for(String veto:List.of("HC_OPT_00","HC_OPT_05")) {
            choice("Q19",veto);var mapped=mapper.map(request());var p=mapped.profile();
            assertThat(p.path("targetPersona").path("coreSettings")).containsAll(config.engine.path("boundaryCrossChecks").get(0).path("requiredBoundaries"));
            assertThat(p.path("conflicts")).isEmpty();
            assertThat(p.path("unresolvedItems")).anyMatch(i->i.path("question").asText().equals(config.engine.path("boundaryCrossChecks").get(0).path("reviewQuestion").asText())&&!i.path("blocking").asBoolean());
            if(veto.equals("HC_OPT_05"))assertThat(p.path("hardConstraints")).anyMatch(c->c.path("constraintId").asText().equals("hc_no_privacy_intrusion"));
            schema.requireValid(p);rules.validate(p);service.submit(request());body.put("submissionId",UUID.randomUUID().toString());
        }
    }
    @Test void explicitFutureConflictKeepsBothSourcesInsteadOfOverwriting() throws Exception {
        // Isolated server-config fixture: the production questionnaire has no location-reporting demand.
        var isolated=new QuestionnaireConfiguration(json);
        var option=((ArrayNode)isolated.question("Q02").path("options")).addObject();option.put("id","TEST_REQUIRE_LOCATION");option.put("text","要求用户强制汇报现实行踪");option.putObject("mapping").put("coreSettingAppend","要求用户强制汇报现实行踪");
        var signal=((ArrayNode)isolated.engine.path("boundaryCrossChecks").get(0).path("conflictingSelections")).addObject();
        signal.put("questionId","Q02");signal.put("optionId","TEST_REQUIRE_LOCATION");signal.put("boundaryIndex",1);signal.put("targetPath","/targetPersona/coreSettings/1");signal.put("description","强制汇报现实行踪与不逼问现实行踪冲突");
        choice("Q03","D");choice("Q02","TEST_REQUIRE_LOCATION");choice("Q19","HC_OPT_05");
        var localMapper=new AnswerToProfileMapper(isolated,new AnswerValidator(isolated),json,schema,rules);var mapped=localMapper.map(request());var p=mapped.profile();
        assertThat(p.at("/targetPersona/coreSettings")).contains(json.valueToTree("不逼问现实行踪。"),json.valueToTree("要求用户强制汇报现实行踪"));
        assertThat(p.path("conflicts")).hasSize(1);assertThat(p.at("/conflicts/0/status").asText()).isEqualTo("OPEN");
        assertThat(p.at(p.at("/conflicts/0/targetPaths/0").asText()).asText()).isEqualTo("不逼问现实行踪。");
        assertThat(p.at(p.at("/conflicts/0/targetPaths/1").asText()).asText()).isEqualTo("要求用户强制汇报现实行踪");
        assertThat(p.at("/conflicts/0/description").asText()).contains("Q03","Q02");assertThat(p.at("/readiness/blockers")).anyMatch(b->b.asText().startsWith("conflict:"));
        assertThat(mapped.evidence()).anyMatch(e->e.sourceRef().endsWith(":Q02")&&e.targetFieldPath().equals("/conflicts/0"));schema.requireValid(p);rules.validate(p);
    }
    @Test void receiptSeparatesPendingItemsFromActualClarificationAndReadsLegacySnapshots() throws Exception {
        var response=service.submit(request());
        assertThat(response.pendingItemCount()).isEqualTo(21).isEqualTo(response.blockers().size()+response.warnings().size());
        assertThat(response.clarificationCount()).isEqualTo(7);assertThat(response.blockers()).hasSize(14);assertThat(response.warnings()).hasSize(7);
        var p=profiles.get(response.profileId()).current().profile();
        assertThat(response.clarificationCount()).isEqualTo((int)(p.unresolvedItems().stream().filter(i->i.status().equals("OPEN")).count()+p.conflicts().stream().filter(c->c.status().equals("OPEN")).count()));
        var row=submissions.selectById(response.submissionId());var old=(ObjectNode)json.readTree(row.responseJson);old.remove("pendingItemCount");old.put("clarificationCount",999);row.responseJson=old.toString();submissions.updateById(row);
        String legacyStoredJson=submissions.selectById(row.submissionId).responseJson; // MySQL normalizes JSON whitespace on write.
        body.put("submissionId",UUID.randomUUID().toString());body.put("profileId",response.profileId());body.put("expectedCurrentVersion",1);answers().putObject("Q24").put("skipped",true);var next=service.submit(request());
        assertThat(next.pendingItemCount()).isEqualTo(20);assertThat(service.get(response.submissionId())).isEqualTo(response);
        http.perform(get("/api/v1/questionnaire-submissions/"+response.submissionId())).andExpect(status().isOk()).andExpect(jsonPath("$.pendingItemCount").value(21)).andExpect(jsonPath("$.clarificationCount").value(7));
        assertThat(submissions.selectById(response.submissionId()).responseJson).isEqualTo(legacyStoredJson);
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
