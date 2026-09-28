INSERT INTO users (id, name, email, role, status, plan, created_at, updated_at)
VALUES ('local-user', 'Alex DevRadar', 'local@devradar.test', 'owner', 'active', 'free', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  role = VALUES(role),
  status = VALUES(status),
  plan = VALUES(plan),
  updated_at = NOW();

INSERT INTO user_profiles (user_id, display_name, headline, location, language, onboarding_status, preferences, created_at, updated_at)
VALUES (
  'local-user',
  'Alex DevRadar',
  'Developer looking for remote, junior and freelance opportunities',
  'Portugal',
  'pt',
  'seeded',
  JSON_OBJECT(
    'defaultWorkMode', 'remote',
    'defaultLocation', 'pt-remote-europe',
    'defaultLanguage', 'pt',
    'mobileFirst', true
  ),
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  headline = VALUES(headline),
  location = VALUES(location),
  language = VALUES(language),
  onboarding_status = VALUES(onboarding_status),
  preferences = VALUES(preferences),
  updated_at = NOW();

INSERT INTO dev_profiles (id, user_id, resume_id, title, seniority, skills, languages, locations, work_modes, salary_min, preferences, active, created_at, updated_at)
VALUES (
  'dev-profile-local-default',
  'local-user',
  NULL,
  'Frontend / Full Stack Developer',
  'junior',
  JSON_ARRAY('React', 'Next.js', 'TypeScript', 'WordPress', 'PHP', 'Laravel', 'SQL'),
  JSON_ARRAY('pt', 'en'),
  JSON_ARRAY('Portugal', 'Europe', 'Remote'),
  JSON_ARRAY('remote', 'hybrid'),
  NULL,
  JSON_OBJECT(
    'contractTypes', JSON_ARRAY('freelance', 'contract', 'full-time'),
    'excludedTerms', JSON_ARRAY('senior', 'staff', 'lead', 'principal', 'manager', 'german c1', 'deutsch', 'onsite'),
    'minScore', 60
  ),
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  seniority = VALUES(seniority),
  skills = VALUES(skills),
  languages = VALUES(languages),
  locations = VALUES(locations),
  work_modes = VALUES(work_modes),
  preferences = VALUES(preferences),
  active = VALUES(active),
  updated_at = NOW();

INSERT INTO job_sources (id, name, type, enabled, config, created_at, updated_at)
VALUES
  ('source-remotive', 'Remotive', 'api', 1, JSON_OBJECT('kind', 'remote-jobs-api'), NOW(), NOW()),
  ('source-arbeitnow', 'Arbeitnow', 'api', 1, JSON_OBJECT('kind', 'public-jobs-api'), NOW(), NOW())
ON DUPLICATE KEY UPDATE
  type = VALUES(type),
  enabled = VALUES(enabled),
  config = VALUES(config),
  updated_at = NOW();

INSERT INTO loops (id, user_id, name, role, status, frequency, automation_mode, min_score, filters, active, created_at, updated_at)
VALUES (
  'loop-local-default',
  'local-user',
  'Frontend Junior Remote Europe',
  'Frontend Developer',
  'active',
  'manual',
  'manual-review',
  60,
  JSON_OBJECT(
    'keywords', 'react, next.js, wordpress',
    'locationCountry', 'pt',
    'location', 'pt-remote-europe',
    'workMode', 'remote',
    'level', 'junior',
    'category', 'any',
    'contractType', 'any',
    'jobLanguage', 'any',
    'minBudget', '',
    'excludedTerms', 'senior, staff, lead, principal, manager, german c1, deutsch, hybrid, onsite, brazil',
    'dateRange', '7d',
    'selectedSources', JSON_ARRAY('Remotive', 'Arbeitnow')
  ),
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  role = VALUES(role),
  status = VALUES(status),
  frequency = VALUES(frequency),
  automation_mode = VALUES(automation_mode),
  min_score = VALUES(min_score),
  filters = VALUES(filters),
  active = VALUES(active),
  updated_at = NOW();
