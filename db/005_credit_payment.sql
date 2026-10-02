ALTER TABLE dompetku.entries ADD COLUMN IF NOT EXISTS paid_date date;
ALTER TABLE dompetku.entries DROP CONSTRAINT IF EXISTS entries_paid_date_check;
ALTER TABLE dompetku.entries ADD CONSTRAINT entries_paid_date_check CHECK (
  paid_date IS NULL OR (payment_method = 'credit' AND paid_date >= date)
);
ALTER TABLE dompetku.shared_entries ADD COLUMN IF NOT EXISTS paid_date date;
ALTER TABLE dompetku.shared_entries DROP CONSTRAINT IF EXISTS shared_entries_paid_date_check;
ALTER TABLE dompetku.shared_entries ADD CONSTRAINT shared_entries_paid_date_check CHECK (
  paid_date IS NULL OR (payment_method = 'credit' AND paid_date >= date)
);
