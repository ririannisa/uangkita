ALTER TABLE dompetku.entries ADD COLUMN IF NOT EXISTS credit_payments jsonb NOT NULL DEFAULT '[]';
ALTER TABLE dompetku.entries ADD COLUMN IF NOT EXISTS recurring_id uuid;
ALTER TABLE dompetku.shared_entries ADD COLUMN IF NOT EXISTS credit_payments jsonb NOT NULL DEFAULT '[]';
ALTER TABLE dompetku.entries DROP CONSTRAINT IF EXISTS entries_partial_check;
ALTER TABLE dompetku.entries ADD CONSTRAINT entries_partial_check CHECK (jsonb_typeof(credit_payments) = 'array' AND (credit_payments = '[]'::jsonb OR (payment_method = 'credit' AND paid_date IS NULL)) AND (recurring_id IS NULL OR type = 'fixed'));
ALTER TABLE dompetku.shared_entries DROP CONSTRAINT IF EXISTS shared_entries_partial_check;
ALTER TABLE dompetku.shared_entries ADD CONSTRAINT shared_entries_partial_check CHECK (jsonb_typeof(credit_payments) = 'array' AND (credit_payments = '[]'::jsonb OR (payment_method = 'credit' AND paid_date IS NULL)));
CREATE UNIQUE INDEX IF NOT EXISTS entries_recurring_month ON dompetku.entries(user_id, recurring_id, (date - (extract(day FROM date)::integer - 1))) WHERE recurring_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS dompetku.finance_settings (user_id text PRIMARY KEY, savings_goal jsonb);
CREATE TABLE IF NOT EXISTS dompetku.recurring_bills (
  user_id text NOT NULL, id uuid NOT NULL, name varchar(80) NOT NULL,
  amount bigint NOT NULL CHECK (amount BETWEEN 1 AND 1000000000000),
  category varchar(80) NOT NULL, day integer NOT NULL CHECK (day BETWEEN 1 AND 31),
  start_month date NOT NULL CHECK (extract(day FROM start_month) = 1), active boolean NOT NULL DEFAULT true,
  PRIMARY KEY(user_id, id)
);
ALTER TABLE dompetku.finance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dompetku.recurring_bills ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON dompetku.finance_settings, dompetku.recurring_bills FROM PUBLIC;
