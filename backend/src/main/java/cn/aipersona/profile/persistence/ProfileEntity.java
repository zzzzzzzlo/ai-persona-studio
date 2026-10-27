package cn.aipersona.profile.persistence;

import com.baomidou.mybatisplus.annotation.*;
import java.time.Instant;

@TableName("persona_profile")
public class ProfileEntity {
    @TableId(type=IdType.AUTO) public Long id;
    public String profileId;
    public String ownerUserId;
    public Integer currentVersion;
    public String status;
    public Instant createdAt;
    public Instant updatedAt;
}
