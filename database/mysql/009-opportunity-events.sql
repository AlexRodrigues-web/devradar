CREATE TABLE IF NOT EXISTS opportunity_events (
  id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  job_id VARCHAR(512) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  status VARCHAR(32) NULL,
  source VARCHAR(80) NULL,
  source_url TEXT NULL,
  job_snapshot JSON NOT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_opportunity_events_user_created (user_id, created_at),
  KEY idx_opportunity_events_user_job_created (user_id, job_id, created_at),
  KEY idx_opportunity_events_event_type (event_type),
  KEY idx_opportunity_events_status (status),
  CONSTRAINT fk_opportunity_events_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
