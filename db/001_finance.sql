-- Neon Auth owns neon_auth users/sessions/accounts. Do not duplicate passwords here.
-- Financial data is server-only: every query is scoped to the verified session user.
CREATE SCHEMA IF NOT EXISTS dompetku;
CREATE TABLE IF NOT EXISTS dompetku.monthly_plans (
  user_id text NOT NULL,
  month date NOT NULL CHECK (extract(day from month) = 1),
  income bigint NOT NULL DEFAULT 0 CHECK (income BETWEEN 0 AND 1000000000000),
  PRIMARY KEY (user_id, month)
);
CREATE TABLE IF NOT EXISTS dompetku.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  month date NOT NULL CHECK (extract(day from month) = 1),
  name varchar(80) NOT NULL CHECK (length(trim(name)) > 0),
  planned bigint NOT NULL CHECK (planned BETWEEN 1 AND 1000000000000)
);
CREATE UNIQUE INDEX IF NOT EXISTS budgets_user_month_name ON dompetku.budgets (user_id, month, lower(trim(name)));
CREATE TABLE IF NOT EXISTS dompetku.entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  type text NOT NULL CHECK (type IN ('in', 'out', 'deposit', 'withdraw', 'fixed')),
  amount bigint NOT NULL CHECK (amount BETWEEN 1 AND 1000000000000),
  category varchar(80) NOT NULL CHECK (length(trim(category)) > 0),
  note varchar(300) NOT NULL DEFAULT '',
  date date NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS entries_user_date ON dompetku.entries (user_id, date DESC);
-- Deny direct client/Data API access. App server uses the Neon owner connection.
ALTER TABLE dompetku.monthly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE dompetku.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dompetku.entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA dompetku FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA dompetku FROM PUBLIC;
