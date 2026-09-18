CREATE TABLE shared_reports (
  code TEXT PRIMARY KEY CHECK(code NOT GLOB '*[^A-Za-z0-9_-]*' AND length(code)=16),
  payload TEXT NOT NULL CHECK(json_valid(payload)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
