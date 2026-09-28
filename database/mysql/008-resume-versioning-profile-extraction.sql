-- DevRadar Phase 4.1
-- Resume versioning + profile extraction schema support.
-- Purpose: prepare CV upload/extraction without implementing upload UI yet.

ALTER TABLE resumes
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1 AFTER user_id,
  ADD COLUMN IF NOT EXISTS original_name VARCHAR(255) NULL AFTER filename,
  ADD COLUMN IF NOT EXISTS mime_type VARCHAR(120) NULL AFTER file_type,
  ADD COLUMN IF NOT EXISTS size_bytes BIGINT NULL AFTER mime_type,
  ADD COLUMN IF NOT EXISTS file_path VARCHAR(500) NULL AFTER size_bytes,
  ADD COLUMN IF NOT EXISTS text_hash VARCHAR(64) NULL AFTER raw_text,
  ADD COLUMN IF NOT EXISTS detected_skills LONGTEXT NULL AFTER text_hash,
  ADD COLUMN IF NOT EXISTS detected_seniority VARCHAR(32) NULL AFTER detected_skills,
  ADD COLUMN IF NOT EXISTS detected_strengths LONGTEXT NULL AFTER detected_seniority,
  ADD COLUMN IF NOT EXISTS extracted_profile LONGTEXT NULL AFTER detected_strengths,
  ADD COLUMN IF NOT EXISTS parser_version VARCHAR(64) NULL AFTER extracted_profile,
  ADD COLUMN IF NOT EXISTS source VARCHAR(32) NOT NULL DEFAULT 'upload' AFTER parser_version,
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP NULL AFTER source;

CREATE INDEX IF NOT EXISTS idx_resumes_user_active_created ON resumes (user_id, active, created_at);
CREATE INDEX IF NOT EXISTS idx_resumes_user_status_created ON resumes (user_id, status, created_at);
