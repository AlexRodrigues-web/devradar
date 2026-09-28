CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'owner',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  plan VARCHAR(32) NOT NULL DEFAULT 'free',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_status (status),
  KEY idx_users_plan (plan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id VARCHAR(64) NOT NULL,
  display_name VARCHAR(160) NOT NULL,
  headline VARCHAR(255) NULL,
  location VARCHAR(160) NULL,
  language VARCHAR(8) NOT NULL DEFAULT 'pt',
  onboarding_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  preferences JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  KEY idx_user_profiles_onboarding_status (onboarding_status),
  CONSTRAINT fk_user_profiles_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS resumes (
  id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(32) NOT NULL,
  raw_text MEDIUMTEXT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  active TINYINT(1) NOT NULL DEFAULT 0,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_resumes_user_id (user_id),
  KEY idx_resumes_status (status),
  CONSTRAINT fk_resumes_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dev_profiles (
  id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  resume_id VARCHAR(64) NULL,
  title VARCHAR(160) NOT NULL,
  seniority VARCHAR(32) NOT NULL,
  skills JSON NOT NULL,
  languages JSON NOT NULL,
  locations JSON NOT NULL,
  work_modes JSON NOT NULL,
  salary_min INT NULL,
  preferences JSON NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_dev_profiles_user_id (user_id),
  KEY idx_dev_profiles_resume_id (resume_id),
  KEY idx_dev_profiles_active (active),
  CONSTRAINT fk_dev_profiles_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_dev_profiles_resume_id FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_sources (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(64) NOT NULL,
  type VARCHAR(32) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  config JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_job_sources_name (name),
  KEY idx_job_sources_enabled (enabled),
  KEY idx_job_sources_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS loops (
  id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(160) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  frequency VARCHAR(32) NOT NULL DEFAULT 'manual',
  automation_mode VARCHAR(32) NOT NULL DEFAULT 'manual-review',
  min_score INT NOT NULL DEFAULT 60,
  filters JSON NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  last_run_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_loops_user_id (user_id),
  KEY idx_loops_status (status),
  KEY idx_loops_frequency (frequency),
  KEY idx_loops_active (active),
  CONSTRAINT fk_loops_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS loop_runs (
  id VARCHAR(64) NOT NULL,
  loop_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  found INT NOT NULL DEFAULT 0,
  duplicates INT NOT NULL DEFAULT 0,
  rejected INT NOT NULL DEFAULT 0,
  approved INT NOT NULL DEFAULT 0,
  failed_sources JSON NULL,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP NULL DEFAULT NULL,
  metadata JSON NULL,
  PRIMARY KEY (id),
  KEY idx_loop_runs_loop_id (loop_id),
  KEY idx_loop_runs_user_id (user_id),
  KEY idx_loop_runs_status (status),
  KEY idx_loop_runs_started_at (started_at),
  CONSTRAINT fk_loop_runs_loop_id FOREIGN KEY (loop_id) REFERENCES loops(id) ON DELETE CASCADE,
  CONSTRAINT fk_loop_runs_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS opportunities (
  id VARCHAR(255) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  loop_id VARCHAR(64) NULL,
  loop_run_id VARCHAR(64) NULL,
  source_id VARCHAR(64) NULL,
  source VARCHAR(64) NOT NULL,
  source_url TEXT NOT NULL,
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  location VARCHAR(255) NULL,
  match_score INT NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'new',
  job_snapshot JSON NOT NULL,
  first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_opportunities_user_id (user_id),
  KEY idx_opportunities_loop_id (loop_id),
  KEY idx_opportunities_loop_run_id (loop_run_id),
  KEY idx_opportunities_source_id (source_id),
  KEY idx_opportunities_status (status),
  KEY idx_opportunities_match_score (match_score),
  CONSTRAINT fk_opportunities_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_opportunities_loop_id FOREIGN KEY (loop_id) REFERENCES loops(id) ON DELETE SET NULL,
  CONSTRAINT fk_opportunities_loop_run_id FOREIGN KEY (loop_run_id) REFERENCES loop_runs(id) ON DELETE SET NULL,
  CONSTRAINT fk_opportunities_source_id FOREIGN KEY (source_id) REFERENCES job_sources(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMP NULL DEFAULT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_user_id (user_id),
  KEY idx_notifications_type (type),
  KEY idx_notifications_read_at (read_at),
  CONSTRAINT fk_notifications_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
