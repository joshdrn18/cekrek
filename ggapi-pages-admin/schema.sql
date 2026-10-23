-- Jalankan di Cloudflare D1 Console sebelum deploy.
CREATE TABLE IF NOT EXISTS checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('bank','ewallet')),
  service_code TEXT NOT NULL,
  service_name TEXT NOT NULL,
  account_masked TEXT NOT NULL,
  status TEXT NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  provider_status INTEGER,
  ip_hash TEXT
);
CREATE INDEX IF NOT EXISTS idx_checks_created_at ON checks(created_at);
CREATE INDEX IF NOT EXISTS idx_checks_status ON checks(status);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO settings(key,value) VALUES
 ('daily_limit','100'),
 ('minute_limit','10');

CREATE TABLE IF NOT EXISTS service_overrides (
  type TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(type,code)
);

CREATE TABLE IF NOT EXISTS managed_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  daily_limit INTEGER NOT NULL DEFAULT 100,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_expiry ON rate_limits(expires_at);
