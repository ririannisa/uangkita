-- Cleanup runs inside the same transaction as the provider's user deletion.
CREATE OR REPLACE FUNCTION dompetku.delete_account_data() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM dompetku.spaces WHERE owner_id = OLD.id::text) THEN
    RAISE EXCEPTION 'Delete owned spaces with their separate confirmation before deleting the account';
  END IF;
  DELETE FROM dompetku.shared_entries WHERE user_id = OLD.id::text;
  DELETE FROM dompetku.space_events WHERE actor_id = OLD.id::text;
  DELETE FROM dompetku.space_members WHERE user_id = OLD.id::text;
  DELETE FROM dompetku.space_invites WHERE lower(email) = lower(OLD.email);
  DELETE FROM dompetku.entries WHERE user_id = OLD.id::text;
  DELETE FROM dompetku.budgets WHERE user_id = OLD.id::text;
  DELETE FROM dompetku.monthly_plans WHERE user_id = OLD.id::text;
  DELETE FROM dompetku.personal_categories WHERE user_id = OLD.id::text;
  DELETE FROM dompetku.finance_settings WHERE user_id = OLD.id::text;
  DELETE FROM dompetku.recurring_bills WHERE user_id = OLD.id::text;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION dompetku.delete_account_data() FROM PUBLIC;
CREATE OR REPLACE TRIGGER uangkita_delete_account_data
AFTER DELETE ON neon_auth."user"
FOR EACH ROW EXECUTE FUNCTION dompetku.delete_account_data();
