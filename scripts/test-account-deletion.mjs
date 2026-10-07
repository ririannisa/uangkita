import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
import { accountDeletionSql } from "../lib/account-deletion.ts";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);

// All test users and rows are synthetic and rolled back by the final exception.
// Never authenticate or delete an existing user's account in this check.
try {
  await sql.query(`DO $$
DECLARE
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  sid uuid := gen_random_uuid(); deleted_id uuid;
  owned uuid := gen_random_uuid(); other_space uuid := gen_random_uuid();
  mail text := gen_random_uuid()::text || '@account-test.invalid';
  month_start date := date_trunc('month',current_date)::date;
  blocked boolean := false;
BEGIN
  INSERT INTO neon_auth."user"(id,name,email,"emailVerified","createdAt","updatedAt")
  VALUES (a,'Deletion test',mail,false,now(),now()),(b,'Other test',b::text||'@account-test.invalid',false,now(),now());
  INSERT INTO neon_auth.account(id,"accountId","providerId","userId","createdAt","updatedAt") VALUES(gen_random_uuid(),a::text,'credential',a,now(),now());
  INSERT INTO neon_auth.session(id,"expiresAt",token,"createdAt","updatedAt","userId") VALUES(sid,now()+interval '1 hour',gen_random_uuid()::text,now()-interval '16 minutes',now(),a);
  INSERT INTO dompetku.spaces(id,name,kind,owner_id) VALUES (owned,'Synthetic owned','family',a::text),(other_space,'Synthetic other','family',b::text);
  BEGIN
    DELETE FROM neon_auth."user" WHERE id=a;
  EXCEPTION WHEN raise_exception THEN blocked := true;
  END;
  IF NOT blocked OR NOT EXISTS(SELECT 1 FROM neon_auth."user" WHERE id=a) OR NOT EXISTS(SELECT 1 FROM neon_auth.account WHERE "userId"=a) OR NOT EXISTS(SELECT 1 FROM neon_auth.session WHERE id=sid) THEN RAISE EXCEPTION 'Owner protection failed'; END IF;
  DELETE FROM dompetku.spaces WHERE id=owned;
  INSERT INTO dompetku.monthly_plans(user_id,month,income) VALUES(a::text,month_start,100);
  INSERT INTO dompetku.budgets(user_id,month,name,planned) VALUES(a::text,month_start,'Synthetic',10);
  INSERT INTO dompetku.entries(user_id,type,amount,category,note,date) VALUES(a::text,'out',10,'Synthetic','Deletion test',current_date);
  INSERT INTO dompetku.personal_categories(user_id,name) VALUES(a::text,'Synthetic');
  INSERT INTO dompetku.finance_settings(user_id,savings_goal) VALUES(a::text,'{}'::jsonb);
  INSERT INTO dompetku.recurring_bills(user_id,id,name,amount,category,day,start_month) VALUES(a::text,gen_random_uuid(),'Synthetic',10,'Synthetic',1,month_start);
  INSERT INTO dompetku.space_members(space_id,user_id,name,email) VALUES(other_space,a::text,'Deletion test',mail),(other_space,b::text,'Other test',b::text||'@account-test.invalid');
  INSERT INTO dompetku.space_invites(space_id,email) VALUES(other_space,mail);
  INSERT INTO dompetku.shared_entries(space_id,user_id,author_name,type,amount,category,note,date)
  VALUES(other_space,a::text,'Deletion test','out',10,'Synthetic','Mine',current_date),(other_space,b::text,'Other test','in',100,'Synthetic','Other',current_date);
  INSERT INTO dompetku.space_events(space_id,actor_id,actor_name,action,detail) VALUES(other_space,a::text,'Deletion test','Synthetic','{}'),(other_space,b::text,'Other test','Synthetic','{}');
  ${accountDeletionSql.replace("$1", "a").replace("$2", "sid")} INTO deleted_id;
  IF deleted_id IS NOT NULL OR NOT EXISTS(SELECT 1 FROM dompetku.entries WHERE user_id=a::text) THEN RAISE EXCEPTION 'Old session was accepted'; END IF;
  UPDATE neon_auth.session SET "createdAt"=now(),"impersonatedBy"=b::text WHERE id=sid;
  ${accountDeletionSql.replace("$1", "a").replace("$2", "sid")} INTO deleted_id;
  IF deleted_id IS NOT NULL THEN RAISE EXCEPTION 'Impersonated session was accepted'; END IF;
  UPDATE neon_auth.session SET "impersonatedBy"=NULL WHERE id=sid;
  UPDATE neon_auth.session SET "expiresAt"=now()-interval '1 minute' WHERE id=sid;
  ${accountDeletionSql.replace("$1", "a").replace("$2", "sid")} INTO deleted_id;
  IF deleted_id IS NOT NULL THEN RAISE EXCEPTION 'Expired session was accepted'; END IF;
  UPDATE neon_auth.session SET "expiresAt"=now()+interval '1 hour',"userId"=b WHERE id=sid;
  ${accountDeletionSql.replace("$1", "a").replace("$2", "sid")} INTO deleted_id;
  IF deleted_id IS NOT NULL THEN RAISE EXCEPTION 'Another user session was accepted'; END IF;
  UPDATE neon_auth.session SET "userId"=a WHERE id=sid;
  ${accountDeletionSql.replace("$1", "a").replace("$2", "sid")} INTO deleted_id;
  IF deleted_id IS DISTINCT FROM a OR EXISTS(SELECT 1 FROM neon_auth.account WHERE "userId"=a) OR EXISTS(SELECT 1 FROM neon_auth.session WHERE id=sid) THEN RAISE EXCEPTION 'Identity/session cleanup failed'; END IF;
  IF EXISTS(SELECT 1 FROM dompetku.entries WHERE user_id=a::text)
    OR EXISTS(SELECT 1 FROM dompetku.budgets WHERE user_id=a::text)
    OR EXISTS(SELECT 1 FROM dompetku.monthly_plans WHERE user_id=a::text)
    OR EXISTS(SELECT 1 FROM dompetku.personal_categories WHERE user_id=a::text)
    OR EXISTS(SELECT 1 FROM dompetku.finance_settings WHERE user_id=a::text)
    OR EXISTS(SELECT 1 FROM dompetku.recurring_bills WHERE user_id=a::text)
    OR EXISTS(SELECT 1 FROM dompetku.space_members WHERE user_id=a::text)
    OR EXISTS(SELECT 1 FROM dompetku.space_invites WHERE email=mail)
    OR EXISTS(SELECT 1 FROM dompetku.shared_entries WHERE user_id=a::text)
    OR EXISTS(SELECT 1 FROM dompetku.space_events WHERE actor_id=a::text)
  THEN RAISE EXCEPTION 'Associated data cleanup failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM dompetku.spaces WHERE id=other_space)
    OR NOT EXISTS(SELECT 1 FROM dompetku.shared_entries WHERE user_id=b::text)
    OR NOT EXISTS(SELECT 1 FROM dompetku.space_events WHERE actor_id=b::text)
    OR NOT EXISTS(SELECT 1 FROM dompetku.space_members WHERE user_id=b::text)
  THEN RAISE EXCEPTION 'Other member data was changed'; END IF;
  RAISE EXCEPTION 'UANGKITA_DELETE_TEST_ROLLBACK_OK';
END;
$$`);
  throw new Error("Expected transaction rollback");
} catch (error) {
  if (!error.message?.includes("UANGKITA_DELETE_TEST_ROLLBACK_OK")) {
    console.error(
      "Account deletion check failed (transaction rolled back):",
      error.message,
    );
    process.exitCode = 1;
  } else
    console.log(
      "Account cleanup and ownership protection passed; all synthetic test data rolled back.",
    );
}
