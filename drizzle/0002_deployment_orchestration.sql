-- Additive migration for the Vercel deployment orchestration and quota features.
-- Safe to run more than once (ADD COLUMN / CREATE INDEX IF NOT EXISTS).

ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS provider_project_id text;
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS provider_project_name text;

ALTER TABLE IF EXISTS deployments ADD COLUMN IF NOT EXISTS logs_url text;
ALTER TABLE IF EXISTS deployments ADD COLUMN IF NOT EXISTS duration_ms integer;

ALTER TABLE IF EXISTS domains ADD COLUMN IF NOT EXISTS last_checked_at timestamptz;

ALTER TABLE IF EXISTS project_settings ADD COLUMN IF NOT EXISTS framework_provider text;

CREATE INDEX IF NOT EXISTS deployments_provider_deployment_idx ON deployments (provider_deployment_id);
CREATE INDEX IF NOT EXISTS usage_records_owner_idx ON usage_records (owner_user_id, event_type, period_start);
CREATE INDEX IF NOT EXISTS usage_records_guest_idx ON usage_records (guest_session_id, event_type, period_start);
CREATE INDEX IF NOT EXISTS domains_status_idx ON domains (status);
