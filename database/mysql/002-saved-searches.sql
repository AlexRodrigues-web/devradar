CREATE TABLE IF NOT EXISTS saved_searches (
  id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  filters JSON NOT NULL,
  frequency VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_saved_searches_status (status),
  KEY idx_saved_searches_frequency (frequency),
  KEY idx_saved_searches_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
