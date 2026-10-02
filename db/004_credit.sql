ALTER TABLE dompetku.entries ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'direct';
ALTER TABLE dompetku.entries ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE dompetku.entries DROP CONSTRAINT IF EXISTS entries_payment_check;
ALTER TABLE dompetku.entries ADD CONSTRAINT entries_payment_check CHECK (
  (payment_method = 'direct' AND due_date IS NULL) OR
  (payment_method = 'credit' AND type IN ('out', 'fixed') AND due_date IS NOT NULL AND due_date >= date)
);
ALTER TABLE dompetku.shared_entries ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'direct';
ALTER TABLE dompetku.shared_entries ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE dompetku.shared_entries DROP CONSTRAINT IF EXISTS shared_entries_payment_check;
ALTER TABLE dompetku.shared_entries ADD CONSTRAINT shared_entries_payment_check CHECK (
  (payment_method = 'direct' AND due_date IS NULL) OR
  (payment_method = 'credit' AND type = 'out' AND due_date IS NOT NULL AND due_date >= date)
);
