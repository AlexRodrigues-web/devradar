CREATE TABLE IF NOT EXISTS user_auth_credentials (
  user_id VARCHAR(64) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  password_updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  email_verified_at TIMESTAMP NULL DEFAULT NULL,
  last_login_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_user_auth_credentials_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
  id VARCHAR(128) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  session_token_hash CHAR(64) NOT NULL,
  user_agent TEXT NULL,
  ip_address VARCHAR(64) NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_sessions_token_hash (session_token_hash),
  KEY idx_user_sessions_user_id (user_id),
  KEY idx_user_sessions_expires_at (expires_at),
  KEY idx_user_sessions_revoked_at (revoked_at),
  CONSTRAINT fk_user_sessions_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_events (
  id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NULL,
  email VARCHAR(255) NULL,
  event_type VARCHAR(64) NOT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_auth_events_user_id (user_id),
  KEY idx_auth_events_email (email),
  KEY idx_auth_events_event_type (event_type),
  KEY idx_auth_events_created_at (created_at),
  CONSTRAINT fk_auth_events_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE saved_searches
  ADD COLUMN user_id VARCHAR(64) NOT NULL DEFAULT 'local-user' AFTER id;

CREATE INDEX idx_saved_searches_user_id ON saved_searches (user_id);

ALTER TABLE saved_searches
  ADD CONSTRAINT fk_saved_searches_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE opportunity_statuses
  ADD COLUMN user_id VARCHAR(64) NOT NULL DEFAULT 'local-user' AFTER id;

ALTER TABLE opportunity_statuses
  DROP INDEX uq_opportunity_statuses_job_id;

CREATE INDEX idx_opportunity_statuses_user_id ON opportunity_statuses (user_id);

ALTER TABLE opportunity_statuses
  ADD UNIQUE KEY uq_opportunity_statuses_user_job (user_id, job_id);

ALTER TABLE opportunity_statuses
  ADD CONSTRAINT fk_opportunity_statuses_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE application_records
  DROP INDEX uq_application_records_job_id;

CREATE INDEX idx_application_records_user_id ON application_records (user_id);

ALTER TABLE application_records
  ADD UNIQUE KEY uq_application_records_user_job (user_id, job_id);

ALTER TABLE application_records
  ADD CONSTRAINT fk_application_records_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE opportunities
  DROP PRIMARY KEY;

ALTER TABLE opportunities
  ADD PRIMARY KEY (user_id, id);

CREATE INDEX idx_opportunities_id ON opportunities (id);
