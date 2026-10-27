package cn.aipersona.profile;

import cn.aipersona.profile.api.ProfileDtos.*;
import cn.aipersona.profile.application.ProfileService;
import cn.aipersona.profile.persistence.*;
import cn.aipersona.profile.domain.ProfileException;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class ProfileIntegrationTest {
    @Autowired ObjectMapper json;
    @Autowired ProfileService service;
    @Autowired ProfileVersionMapper versions;
    @Autowired MockMvc http;
    @Autowired JdbcTemplate jdbc;
    ObjectNode request;
    @BeforeEach void setup() throws Exception {
        // Unique evidence IDs make the same tests safe to rerun on an isolated test database.
        request=(ObjectNode)json.readTree(Files.readString(Path.of("../docs/examples/create-profile.json")).replace("e-questionnaire",UUID.randomUUID().toString()));
    }
    CreateProfileRequest createRequest() { return json.convertValue(request,CreateProfileRequest.class); }
    ProfileResponse create() { return service.create(createRequest()); }
    NewVersionRequest next(int expected) { return new NewVersionRequest(expected,request.path("profile"),"用户再次确认",List.of(),null); }
    @Test void persistsAndReadsDtoWithoutEntities() throws Exception {
        var created=create(); var loaded=service.get(created.profileId());
        assertThat(loaded.current().profile()).isEqualTo(created.current().profile());
        assertThat(loaded.ownerUserId()).isEqualTo("test-owner");
        assertThat(loaded.current().readyForCompilation()).isEqualTo(loaded.current().profile().readiness().readyForCompilation());
        http.perform(get("/api/v1/profiles/"+created.profileId())).andExpect(status().isOk()).andExpect(jsonPath("$.id").doesNotExist()).andExpect(jsonPath("$.current.profile.schemaVersion").value("1.0.0"));
    }
    @Test void newSnapshotRetainsHistoryAndEvidence() {
        var p=create(); String initial=versions.findVersion(p.profileId(),1).profileJson;
        var updated=service.addVersion(p.profileId(),next(1));
        assertThat(updated.currentVersion()).isEqualTo(2);
        assertThat(versions.findVersion(p.profileId(),1).profileJson).isEqualTo(initial);
        assertThat(versions.findVersion(p.profileId(),2)).isNotNull();
    }
    @Test void staleVersionReturns409() throws Exception {
        var p=create(); service.addVersion(p.profileId(),next(1));
        http.perform(post("/api/v1/profiles/"+p.profileId()+"/versions").contentType("application/json").content(json.writeValueAsString(next(1))))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("VERSION_CONFLICT"));
        assertThat(versions.findVersion(p.profileId(),3)).isNull();
    }
    @Test void invalidProfileCannotBeWritten() throws Exception {
        Long count=jdbc.queryForObject("SELECT COUNT(*) FROM persona_profile",Long.class);
        ((ObjectNode)request.path("profile")).remove("dimensions");
        http.perform(post("/api/v1/profiles").contentType("application/json").content(request.toString()))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors[0].path").exists());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM persona_profile",Long.class)).isEqualTo(count);
    }
    @Test void validationEndpointDoesNotWriteAndReportsPaths() throws Exception {
        Long count=jdbc.queryForObject("SELECT COUNT(*) FROM persona_profile",Long.class);
        http.perform(post("/api/v1/profiles/validate").contentType("application/json").content(json.createObjectNode().set("profile",request.path("profile")).toString()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.valid").value(true));
        ((ObjectNode)request.at("/profile/dimensions/teasingIntensity")).put("value",0);
        http.perform(post("/api/v1/profiles/validate").contentType("application/json").content(json.createObjectNode().set("profile",request.path("profile")).toString()))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM persona_profile",Long.class)).isEqualTo(count);
    }
    @Test void missingEvidenceAndFakeModelConfirmationRejected() {
        request.putArray("evidence"); assertThatThrownBy(this::create).isInstanceOf(ProfileException.class);
        ((ObjectNode)request.path("profile").path("dimensions").path("teasingIntensity")).putArray("evidenceRefs");
        assertThatThrownBy(this::create).isInstanceOf(ProfileException.class);
    }
    @Test void evidenceDatabaseFailureRollsBackMetadataAndSnapshot() throws Exception {
        create(); // Second create reuses globally unique evidence ID; insert fails after profile and version inserts.
        Long count=jdbc.queryForObject("SELECT COUNT(*) FROM persona_profile",Long.class);
        Long snapshots=jdbc.queryForObject("SELECT COUNT(*) FROM persona_profile_version",Long.class);
        http.perform(post("/api/v1/profiles").contentType("application/json").content(request.toString())).andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM persona_profile",Long.class)).isEqualTo(count);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM persona_profile_version",Long.class)).isEqualTo(snapshots);
    }
    @Test void modelCannotRemoveHardConstraintsThroughApi() throws Exception {
        var p=create(); ((ArrayNode)request.at("/profile/hardConstraints")).removeAll();
        var version=json.valueToTree(next(1)); ((ObjectNode)version).put("origin","MODEL_INFERENCE");
        http.perform(post("/api/v1/profiles/"+p.profileId()+"/versions").contentType("application/json").content(version.toString()))
            .andExpect(status().isBadRequest()); assertThat(service.get(p.profileId()).currentVersion()).isEqualTo(1);
    }
    @Test void twoConcurrentWritersOnlyOneSucceeds() throws Exception {
        var p=create(); var start=new CountDownLatch(1);
        try(var executor=Executors.newFixedThreadPool(2)) {
            Callable<String> update=() -> { start.await(); try { service.addVersion(p.profileId(),next(1)); return "OK"; } catch(ProfileException e) { return e.code(); } };
            var a=executor.submit(update); var b=executor.submit(update); start.countDown();
            assertThat(List.of(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS))).containsExactlyInAnyOrder("OK","VERSION_CONFLICT");
        }
        assertThat(service.get(p.profileId()).currentVersion()).isEqualTo(2);
    }
    @Test void malformedAndUnknownFieldsReturn400AndNotFound404() throws Exception {
        http.perform(post("/api/v1/profiles/validate").contentType("application/json").content("{" )).andExpect(status().isBadRequest());
        request.put("ownerUserId","forged-client-id");
        http.perform(post("/api/v1/profiles").contentType("application/json").content(request.toString())).andExpect(status().isBadRequest());
        http.perform(get("/api/v1/profiles/"+UUID.randomUUID())).andExpect(status().isNotFound());
        http.perform(delete("/api/v1/profiles/"+UUID.randomUUID())).andExpect(status().isMethodNotAllowed());
    }
}
