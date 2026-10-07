CREATE TABLE IF NOT EXISTS dompetku.event_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  space_id uuid REFERENCES dompetku.spaces(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('lamaran','wedding')),
  name text NOT NULL,
  date date,
  location text NOT NULL DEFAULT '',
  items jsonb NOT NULL CHECK (jsonb_typeof(items)='array' AND jsonb_array_length(items)<=200),
  revision integer NOT NULL DEFAULT 0 CHECK (revision>=0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((user_id IS NULL) <> (space_id IS NULL))
);
CREATE INDEX IF NOT EXISTS event_plans_user ON dompetku.event_plans(user_id);
CREATE INDEX IF NOT EXISTS event_plans_space ON dompetku.event_plans(space_id);
