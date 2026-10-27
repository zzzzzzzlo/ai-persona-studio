CREATE TABLE persona_profile (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    profile_id VARCHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    owner_user_id VARCHAR(64) NOT NULL,
    current_version INT NOT NULL,
    status VARCHAR(24) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT uk_profile_id UNIQUE (profile_id),
    CONSTRAINT ck_profile_version CHECK (current_version >= 1),
    CONSTRAINT ck_profile_status CHECK (status IN ('DRAFT', 'READY')),
    INDEX idx_profile_owner (owner_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE persona_profile_version (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    profile_id VARCHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    version_number INT NOT NULL,
    schema_version VARCHAR(24) NOT NULL,
    profile_json JSON NOT NULL,
    ready_for_compilation BOOLEAN NOT NULL,
    change_reason VARCHAR(500) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT uk_profile_version UNIQUE (profile_id, version_number),
    CONSTRAINT fk_version_profile FOREIGN KEY (profile_id) REFERENCES persona_profile(profile_id),
    CONSTRAINT ck_version_number CHECK (version_number >= 1),
    CONSTRAINT ck_snapshot_schema CHECK (schema_version = JSON_UNQUOTE(JSON_EXTRACT(profile_json, '$.schemaVersion'))),
    CONSTRAINT ck_snapshot_readiness CHECK (
        JSON_TYPE(JSON_EXTRACT(profile_json, '$.readiness.readyForCompilation')) = 'BOOLEAN'
        AND ready_for_compilation = (JSON_UNQUOTE(JSON_EXTRACT(profile_json, '$.readiness.readyForCompilation')) = 'true')
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE persona_profile_evidence (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    evidence_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    profile_id VARCHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    version_number INT NOT NULL,
    source_type VARCHAR(24) NOT NULL,
    source_ref VARCHAR(200) NOT NULL,
    target_field_path VARCHAR(300) NOT NULL,
    raw_excerpt VARCHAR(1000) NULL,
    extracted_value JSON NOT NULL,
    status VARCHAR(24) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT uk_evidence_id UNIQUE (evidence_id),
    CONSTRAINT fk_evidence_version FOREIGN KEY (profile_id, version_number) REFERENCES persona_profile_version(profile_id, version_number),
    CONSTRAINT ck_evidence_source CHECK (source_type IN ('QUESTIONNAIRE','FREE_TEXT','CLARIFICATION','USER_EDIT','MODEL_INFERENCE')),
    CONSTRAINT ck_evidence_status CHECK (status IN ('PROVISIONAL','CONFIRMED','REJECTED')),
    INDEX idx_evidence_profile (profile_id, version_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
