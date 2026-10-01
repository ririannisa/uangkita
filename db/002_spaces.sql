-- Shared spaces are separate from legacy personal tables. Personal records stay private.
CREATE TABLE IF NOT EXISTS dompetku.spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(80) NOT NULL CHECK (length(trim(name)) > 0),
  kind text NOT NULL CHECK (kind IN ('couple', 'family')),
  owner_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS dompetku.space_members (
  space_id uuid NOT NULL REFERENCES dompetku.spaces(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  name varchar(100) NOT NULL,
  email text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (space_id, user_id)
);
CREATE INDEX IF NOT EXISTS space_members_user ON dompetku.space_members(user_id);
CREATE TABLE IF NOT EXISTS dompetku.space_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES dompetku.spaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  UNIQUE (space_id, email)
);
CREATE TABLE IF NOT EXISTS dompetku.shared_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES dompetku.spaces(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  author_name varchar(100) NOT NULL,
  type text NOT NULL CHECK (type IN ('in','out','deposit','withdraw','fixed','contribution')),
  amount bigint NOT NULL CHECK (amount BETWEEN 1 AND 1000000000000),
  category varchar(80) NOT NULL CHECK (length(trim(category)) > 0),
  note varchar(300) NOT NULL DEFAULT '',
  date date NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shared_entries_space_date ON dompetku.shared_entries(space_id, date DESC);
CREATE TABLE IF NOT EXISTS dompetku.shared_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES dompetku.spaces(id) ON DELETE CASCADE,
  month date NOT NULL CHECK (extract(day from month) = 1),
  name varchar(80) NOT NULL CHECK (length(trim(name)) > 0),
  planned bigint NOT NULL CHECK (planned BETWEEN 1 AND 1000000000000)
);
CREATE UNIQUE INDEX IF NOT EXISTS shared_budgets_name ON dompetku.shared_budgets(space_id, month, lower(trim(name)));
CREATE TABLE IF NOT EXISTS dompetku.space_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  space_id uuid NOT NULL REFERENCES dompetku.spaces(id) ON DELETE CASCADE,
  actor_id text NOT NULL,
  actor_name varchar(100) NOT NULL,
  action varchar(40) NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS space_events_recent ON dompetku.space_events(space_id, created_at DESC);
ALTER TABLE dompetku.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE dompetku.space_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE dompetku.space_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE dompetku.shared_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE dompetku.shared_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dompetku.space_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA dompetku FROM PUBLIC;
