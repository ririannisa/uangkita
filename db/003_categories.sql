CREATE TABLE IF NOT EXISTS dompetku.personal_categories (
  user_id text NOT NULL,
  name varchar(80) NOT NULL CHECK (length(trim(name)) > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS personal_category_name ON dompetku.personal_categories(user_id, lower(trim(name)));
CREATE TABLE IF NOT EXISTS dompetku.shared_categories (
  space_id uuid NOT NULL REFERENCES dompetku.spaces(id) ON DELETE CASCADE,
  name varchar(80) NOT NULL CHECK (length(trim(name)) > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS shared_category_name ON dompetku.shared_categories(space_id, lower(trim(name)));
ALTER TABLE dompetku.personal_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE dompetku.shared_categories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON dompetku.personal_categories, dompetku.shared_categories FROM PUBLIC;
