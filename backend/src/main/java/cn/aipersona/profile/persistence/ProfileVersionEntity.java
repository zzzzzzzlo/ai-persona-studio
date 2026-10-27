package cn.aipersona.profile.persistence;

import com.baomidou.mybatisplus.annotation.*;
import java.time.Instant;

@TableName("persona_profile_version")
public class ProfileVersionEntity {
    @TableId(type=IdType.AUTO) public Long id;
    public String profileId;
    public Integer versionNumber;
    public String schemaVersion;
    public String profileJson;
    public Boolean readyForCompilation;
    public String changeReason;
    public Instant createdAt;
}
