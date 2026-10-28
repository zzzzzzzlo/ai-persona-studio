CREATE TABLE persona_questionnaire_submission (
    submission_id VARCHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    owner_user_id VARCHAR(64) NOT NULL,
    questionnaire_id VARCHAR(100) NOT NULL,
    questionnaire_version VARCHAR(24) NOT NULL,
    request_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    request_json JSON NOT NULL,
    processing_status VARCHAR(24) NOT NULL,
    profile_id VARCHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    profile_version INT NULL,
    response_json JSON NULL,
    created_at TIMESTAMP(6) NOT NULL,
    processed_at TIMESTAMP(6) NULL,
    CONSTRAINT fk_submission_version FOREIGN KEY(profile_id,profile_version) REFERENCES persona_profile_version(profile_id,version_number),
    CONSTRAINT ck_submission_status CHECK(processing_status IN ('PROCESSING','COMPLETED')),
    INDEX idx_submission_owner(owner_user_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
