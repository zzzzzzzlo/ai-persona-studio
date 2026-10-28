-- H2 fast service/HTTP tests only. The production MySQL migration is verified separately.
CREATE TABLE IF NOT EXISTS persona_questionnaire_submission (
 submission_id VARCHAR(36) PRIMARY KEY, owner_user_id VARCHAR(64) NOT NULL, questionnaire_id VARCHAR(100) NOT NULL,
 questionnaire_version VARCHAR(24) NOT NULL, request_hash CHAR(64) NOT NULL, request_json CLOB NOT NULL,
 processing_status VARCHAR(24) NOT NULL, profile_id VARCHAR(36), profile_version INT, response_json CLOB,
 created_at TIMESTAMP(6) NOT NULL, processed_at TIMESTAMP(6)
);
CREATE TABLE IF NOT EXISTS persona_profile (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, profile_id VARCHAR(36) NOT NULL UNIQUE,
 owner_user_id VARCHAR(64) NOT NULL, current_version INT NOT NULL, status VARCHAR(24) NOT NULL,
 created_at TIMESTAMP(6) NOT NULL, updated_at TIMESTAMP(6) NOT NULL
);
CREATE TABLE IF NOT EXISTS persona_profile_version (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, profile_id VARCHAR(36) NOT NULL,
 version_number INT NOT NULL, schema_version VARCHAR(24) NOT NULL,
 profile_json CLOB NOT NULL, ready_for_compilation BOOLEAN NOT NULL,
 change_reason VARCHAR(500) NOT NULL, created_at TIMESTAMP(6) NOT NULL,
 UNIQUE(profile_id,version_number), FOREIGN KEY(profile_id) REFERENCES persona_profile(profile_id)
);
CREATE TABLE IF NOT EXISTS persona_profile_evidence (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, evidence_id VARCHAR(64) NOT NULL UNIQUE,
 profile_id VARCHAR(36) NOT NULL, version_number INT NOT NULL, source_type VARCHAR(24) NOT NULL,
 source_ref VARCHAR(200) NOT NULL, target_field_path VARCHAR(300) NOT NULL, raw_excerpt VARCHAR(1000),
 extracted_value CLOB NOT NULL, status VARCHAR(24) NOT NULL, created_at TIMESTAMP(6) NOT NULL,
 FOREIGN KEY(profile_id,version_number) REFERENCES persona_profile_version(profile_id,version_number)
);
