package cn.aipersona.profile.persistence;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import java.util.List;
import org.apache.ibatis.annotations.*;

public interface ProfileEvidenceMapper extends BaseMapper<ProfileEvidenceEntity> {
    @Select("SELECT * FROM persona_profile_evidence WHERE profile_id=#{profileId} AND version_number<=#{version}")
    List<ProfileEvidenceEntity> findThroughVersion(String profileId, int version);
}
