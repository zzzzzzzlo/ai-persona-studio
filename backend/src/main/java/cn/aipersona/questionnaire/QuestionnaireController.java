package cn.aipersona.questionnaire;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.*;
import static cn.aipersona.questionnaire.QuestionnaireDtos.*;
@RestController
@RequestMapping("/api/v1")
@ConditionalOnProperty(name="app.development-api-enabled",havingValue="true")
public class QuestionnaireController {
    private final QuestionnaireConfiguration config;private final QuestionnaireSubmissionService service;
    public QuestionnaireController(QuestionnaireConfiguration config,QuestionnaireSubmissionService service){this.config=config;this.service=service;}
    @GetMapping("/questionnaires/{id}") public JsonNode get(@PathVariable String id,@RequestParam(required=false)String version){return config.display(id,version);}
    @PostMapping("/questionnaire-submissions") public SubmissionResponse submit(@Valid @RequestBody SubmissionRequest request){return service.submit(request);}
    @GetMapping("/questionnaire-submissions/{id}") public SubmissionResponse receipt(@PathVariable String id){return service.get(id);}
}
