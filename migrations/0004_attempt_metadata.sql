-- Raw answers are sufficient to reproduce detailed diagnostics locally.
-- Keep a compact summary in D1, make quiz mode explicit, and associate
-- pre-result identity data with the completed attempt.
PRAGMA defer_foreign_keys = ON;
CREATE TABLE attempts_updated (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  feedback_token_hash TEXT NOT NULL,
  model_version TEXT NOT NULL,
  production_hashes TEXT NOT NULL CHECK(json_valid(production_hashes)),
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
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
  build_version TEXT NOT NULL,
  referral_code TEXT,
  quiz_mode TEXT NOT NULL CHECK(quiz_mode IN ('quick','full')),
  pretest_familiarity TEXT CHECK(pretest_familiarity IN ('none','some','expert')),
  pretest_prior_identity TEXT CHECK(pretest_prior_identity IN ('yes','no','unsure')),
  pretest_prior_lineage INTEGER CHECK(pretest_prior_lineage BETWEEN 1 AND 23),
  CHECK((status IN ('ZERO_VECTOR','no_classification') AND primary_id IS NULL) OR (status IN ('SCORED','classified') AND primary_id IS NOT NULL)),
  CHECK((pretest_familiarity IS NULL AND pretest_prior_identity IS NULL AND pretest_prior_lineage IS NULL) OR (pretest_familiarity IS NOT NULL AND pretest_prior_identity IS NOT NULL AND ((pretest_prior_identity='yes' AND pretest_prior_lineage IS NOT NULL) OR (pretest_prior_identity IN ('no','unsure') AND pretest_prior_lineage IS NULL))))
);
INSERT INTO attempts_updated(id,participant_id,feedback_token_hash,model_version,production_hashes,received_at,duration_ms,raw_answers,status,primary_id,scores,metrics,imported,build_version,referral_code,quiz_mode)
SELECT id,participant_id,feedback_token_hash,model_version,production_hashes,received_at,duration_ms,raw_answers,status,primary_id,scores,metrics,imported,build_version,referral_code,
  CASE WHEN json_type(raw_answers,'$.responses')='object' AND (SELECT COUNT(*) FROM json_each(json_extract(raw_answers,'$.responses')))=24 THEN 'quick' ELSE 'full' END
FROM attempts;
DROP TABLE attempts;
ALTER TABLE attempts_updated RENAME TO attempts;
CREATE INDEX attempts_participant ON attempts(participant_id, received_at);
CREATE INDEX attempts_referral_code ON attempts(referral_code, received_at);
CREATE INDEX attempts_mode ON attempts(quiz_mode, received_at);
PRAGMA defer_foreign_keys = OFF;
