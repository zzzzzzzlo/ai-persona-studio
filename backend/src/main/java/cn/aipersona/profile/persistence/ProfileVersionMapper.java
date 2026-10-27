package cn.aipersona.profile.persistence;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.*;

public interface ProfileVersionMapper extends BaseMapper<ProfileVersionEntity> {
    @Select("SELECT * FROM persona_profile_version WHERE profile_id=#{profileId} AND version_number=#{version}")
    ProfileVersionEntity findVersion(String profileId, int version);
}
