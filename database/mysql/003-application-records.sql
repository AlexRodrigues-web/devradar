CREATE TABLE IF NOT EXISTS application_records (
  id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  job_id VARCHAR(255) NOT NULL,
  job_snapshot JSON NOT NULL,
  status VARCHAR(32) NOT NULL,
  channel VARCHAR(32) NOT NULL,
  automation_status VARCHAR(32) NOT NULL,
  match_score INT NOT NULL DEFAULT 0,
  notes TEXT NULL,
  applied_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_application_records_job_id (job_id),
  KEY idx_application_records_status (status),
  KEY idx_application_records_automation_status (automation_status),
  KEY idx_application_records_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS outreach_messages (
  id VARCHAR(64) NOT NULL,
  application_id VARCHAR(64) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  language VARCHAR(8) NOT NULL,
  status VARCHAR(32) NOT NULL,
  sent_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_outreach_messages_application_id (application_id),
  KEY idx_outreach_messages_status (status),
  CONSTRAINT fk_outreach_messages_application_id FOREIGN KEY (application_id) REFERENCES application_records(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
