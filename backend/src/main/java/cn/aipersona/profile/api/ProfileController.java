package cn.aipersona.profile.api;

import cn.aipersona.profile.api.ProfileDtos.*;
import cn.aipersona.profile.application.ProfileService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/profiles")
@ConditionalOnProperty(name="app.development-api-enabled",havingValue="true")
public class ProfileController {
    private final ProfileService service;
    public ProfileController(ProfileService service) { this.service=service; }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary="创建画像和第一个不可变快照（开发身份）")
    public ProfileResponse create(@Valid @RequestBody CreateProfileRequest request) { return service.create(request); }
    @GetMapping("/{profileId}")
    public ProfileResponse get(@PathVariable String profileId) { return service.get(profileId); }
    @GetMapping("/{profileId}/versions/{version}")
    public VersionResponse version(@PathVariable String profileId,@PathVariable int version){return service.getVersion(profileId,version);}
    @GetMapping("/{profileId}/evidence")
    public java.util.List<EvidenceResponse> evidence(@PathVariable String profileId){return service.getEvidence(profileId);}
    @PostMapping("/{profileId}/versions") @ResponseStatus(HttpStatus.CREATED)
    public ProfileResponse addVersion(@PathVariable String profileId,@Valid @RequestBody NewVersionRequest request) { return service.addVersion(profileId,request); }
    @PostMapping("/validate")
    @Operation(summary="离线校验结构与业务规则；证据数据库引用在持久化时检查")
    public ValidationResult validate(@Valid @RequestBody ValidateProfileRequest request) { return service.validate(request.profile()); }
}
