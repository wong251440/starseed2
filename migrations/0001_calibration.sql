CREATE TABLE participants (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE attempts (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  feedback_token_hash TEXT NOT NULL,
  model_version TEXT NOT NULL,
  production_hashes TEXT NOT NULL CHECK(json_valid(production_hashes)),
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  started_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  duration_ms INTEGER NOT NULL CHECK(duration_ms >= 0),
  raw_answers TEXT NOT NULL CHECK(json_valid(raw_answers) AND json_array_length(raw_answers)=80),
  status TEXT NOT NULL CHECK(status IN ('SCORED','ZERO_VECTOR')),
  primary_id INTEGER CHECK(primary_id BETWEEN 1 AND 23),
  scores TEXT NOT NULL CHECK(json_valid(scores)),
  metrics TEXT NOT NULL CHECK(json_valid(metrics)),
  imported INTEGER NOT NULL CHECK(imported IN (0,1)),
  app_version TEXT NOT NULL,
  build_version TEXT NOT NULL,
  CHECK((status='ZERO_VECTOR' AND primary_id IS NULL) OR (status='SCORED' AND primary_id IS NOT NULL))
);
CREATE INDEX attempts_participant ON attempts(participant_id, received_at);
CREATE TABLE feedback (
  attempt_id TEXT PRIMARY KEY REFERENCES attempts(id),
  fit INTEGER NOT NULL CHECK(fit BETWEEN 1 AND 7),
  self_lineage INTEGER CHECK(self_lineage BETWEEN 1 AND 23),
  prior_identity TEXT NOT NULL CHECK(prior_identity IN ('yes','no','unsure')),
  prior_lineage INTEGER CHECK(prior_lineage BETWEEN 1 AND 23),
  comment TEXT NOT NULL CHECK(length(comment) <= 2000),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
