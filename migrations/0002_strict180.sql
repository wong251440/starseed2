-- Keep every historical attempt and its feedback while allowing the new
-- versioned response object. Existing numeric civilization IDs remain stable.
PRAGMA defer_foreign_keys = ON;
CREATE TABLE attempts_updated (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  feedback_token_hash TEXT NOT NULL,
  model_version TEXT NOT NULL,
  production_hashes TEXT NOT NULL CHECK(json_valid(production_hashes)),
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  started_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  duration_ms INTEGER NOT NULL CHECK(duration_ms >= 0),
  raw_answers TEXT NOT NULL CHECK(json_valid(raw_answers) AND (
    (status IN ('SCORED','ZERO_VECTOR') AND json_type(raw_answers)='array' AND json_array_length(raw_answers)=80)
    OR (status IN ('classified','no_classification') AND json_type(raw_answers)='object' AND json_type(raw_answers,'$.responses') IS 'object')
  )),
  status TEXT NOT NULL CHECK(status IN ('SCORED','ZERO_VECTOR','classified','no_classification')),
  primary_id INTEGER CHECK(primary_id BETWEEN 1 AND 23),
  scores TEXT NOT NULL CHECK(json_valid(scores)),
  metrics TEXT NOT NULL CHECK(json_valid(metrics)),
  imported INTEGER NOT NULL CHECK(imported IN (0,1)),
  app_version TEXT NOT NULL,
  build_version TEXT NOT NULL,
  CHECK((status IN ('ZERO_VECTOR','no_classification') AND primary_id IS NULL) OR (status IN ('SCORED','classified') AND primary_id IS NOT NULL))
);
INSERT INTO attempts_updated SELECT * FROM attempts;
DROP TABLE attempts;
ALTER TABLE attempts_updated RENAME TO attempts;
CREATE INDEX attempts_participant ON attempts(participant_id, received_at);
PRAGMA defer_foreign_keys = OFF;
