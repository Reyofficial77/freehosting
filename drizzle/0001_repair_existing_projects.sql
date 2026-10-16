-- Safe, repeatable compatibility migration for databases created by earlier FreeHosting builds.
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS owner_user_id uuid;
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS guest_session_id text;
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS framework text;
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'zip';
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS source_reference text;
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS root_directory text NOT NULL DEFAULT '/';
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS build_command text;
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS output_directory text;
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'uploaded';
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS projects_slug_unique ON projects (slug);
CREATE INDEX IF NOT EXISTS projects_owner_idx ON projects (owner_user_id);
CREATE INDEX IF NOT EXISTS projects_created_idx ON projects (created_at);
