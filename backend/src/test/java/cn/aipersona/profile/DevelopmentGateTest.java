package cn.aipersona.profile;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties="app.development-api-enabled=false")
@AutoConfigureMockMvc @ActiveProfiles("test")
class DevelopmentGateTest {
    @Autowired MockMvc http;
    @Test void developmentRoutesAreUnavailableWhenSwitchOff() throws Exception {
        http.perform(post("/api/v1/profiles/validate").contentType("application/json").content("{}"))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }
}
