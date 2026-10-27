package cn.aipersona.profile.persistence;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.*;

public interface ProfileMapper extends BaseMapper<ProfileEntity> {
    @Select("SELECT * FROM persona_profile WHERE profile_id=#{profileId} AND owner_user_id=#{ownerId}")
    ProfileEntity findOwned(String profileId, String ownerId);

    @Select("SELECT * FROM persona_profile WHERE profile_id=#{profileId} AND owner_user_id=#{ownerId} FOR UPDATE")
    ProfileEntity lockOwned(String profileId, String ownerId);

    @Update("UPDATE persona_profile SET current_version=#{next}, status=#{status}, updated_at=CURRENT_TIMESTAMP(6) WHERE profile_id=#{profileId} AND current_version=#{expected}")
    int advance(String profileId, int expected, int next, String status);
}
