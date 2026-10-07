import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
import {
  createPlanSql,
  readPlansSql,
  savePlanSql,
  deletePlanSql,
} from "../lib/event-plan-queries.ts";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);
const statement = (query, args) =>
  query.replace(/\$(\d+)/g, (_, n) => args[Number(n) - 1]);
const create = (user, scope) =>
  statement(createPlanSql, [
    user,
    scope,
    "'lamaran'",
    "'Synthetic plan'",
    "'[]'",
  ]);
const read = (user, scope) => statement(readPlansSql, [user, scope]);
const save = (user, scope, id, revision) =>
  statement(savePlanSql, [
    user,
    scope,
    id,
    revision,
    "'Synthetic plan'",
    "NULL",
    "'House'",
    "'[]'",
  ]);
const remove = (user, scope, id, revision, name = "'Synthetic plan'") =>
  statement(deletePlanSql, [user, scope, id, revision, name]);
// Synthetic records only. The final exception rolls back the complete transaction.
try {
  await sql.query(`DO $$
DECLARE a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid();
  room uuid := gen_random_uuid(); personal uuid; shared uuid; removed uuid; n integer;
BEGIN
  INSERT INTO neon_auth."user"(id,name,email,"emailVerified","createdAt","updatedAt")
  VALUES(a,'Plan test',a::text||'@plan-test.invalid',false,now(),now()),(b,'Owner test',b::text||'@plan-test.invalid',false,now(),now()),(c,'Outsider test',c::text||'@plan-test.invalid',false,now(),now());
  INSERT INTO dompetku.spaces(id,name,kind,owner_id) VALUES(room,'Synthetic plan room','couple',b::text);
  INSERT INTO dompetku.space_members(space_id,user_id,name,email) VALUES(room,a::text,'Member',a::text||'@plan-test.invalid'),(room,b::text,'Owner',b::text||'@plan-test.invalid');
  ${create("a", "NULL")} INTO personal;
  SELECT count(*) INTO n FROM (${read("b", "NULL")}) q;
  IF n<>0 THEN RAISE EXCEPTION 'Personal data exposed'; END IF;
  ${save("b", "NULL", "personal", "0")} INTO removed;
  IF removed IS NOT NULL THEN RAISE EXCEPTION 'Personal update exposed'; END IF;
  ${remove("b", "NULL", "personal", "0")} INTO removed;
  IF removed IS NOT NULL THEN RAISE EXCEPTION 'Personal delete exposed'; END IF;
  ${create("a", "room")} INTO shared;
  IF shared IS NULL THEN RAISE EXCEPTION 'Member cannot create'; END IF;
  ${create("c", "room")} INTO removed;
  IF removed IS NOT NULL THEN RAISE EXCEPTION 'Outsider can create'; END IF;
  SELECT count(*) INTO n FROM (${read("c", "room")}) q;
  IF n<>0 THEN RAISE EXCEPTION 'Shared data exposed'; END IF;
  ${save("a", "room", "shared", "0")} INTO removed;
  IF removed IS DISTINCT FROM shared THEN RAISE EXCEPTION 'Member cannot save'; END IF;
  ${save("a", "room", "shared", "0")} INTO removed;
  IF removed IS NOT NULL THEN RAISE EXCEPTION 'Stale revision overwrote changes'; END IF;
  ${remove("a", "room", "shared", "1")} INTO removed;
  IF removed IS NOT NULL THEN RAISE EXCEPTION 'Member deleted entire plan'; END IF;
  ${remove("b", "room", "shared", "1", "'wrong'")} INTO removed;
  IF removed IS NOT NULL THEN RAISE EXCEPTION 'Wrong confirmation accepted'; END IF;
  DELETE FROM dompetku.space_members WHERE space_id=room AND user_id=a::text;
  ${save("a", "room", "shared", "1")} INTO removed;
  IF removed IS NOT NULL THEN RAISE EXCEPTION 'Revoked member can save'; END IF;
  DELETE FROM neon_auth."user" WHERE id=a;
  IF EXISTS(SELECT 1 FROM dompetku.event_plans WHERE id=personal) OR NOT EXISTS(SELECT 1 FROM dompetku.event_plans WHERE id=shared) THEN RAISE EXCEPTION 'Account cleanup scope failed'; END IF;
  ${remove("b", "room", "shared", "1")} INTO removed;
  IF removed IS DISTINCT FROM shared THEN RAISE EXCEPTION 'Owner deletion failed'; END IF;
  ${create("b", "room")} INTO shared;
  DELETE FROM dompetku.spaces WHERE id=room;
  IF EXISTS(SELECT 1 FROM dompetku.event_plans WHERE id=shared) THEN RAISE EXCEPTION 'Space cascade failed'; END IF;
  RAISE EXCEPTION 'UANGKITA_PLANS_ROLLBACK_OK';
END; $$`);
  throw new Error("Expected rollback");
} catch (error) {
  if (!error.message?.includes("UANGKITA_PLANS_ROLLBACK_OK")) {
    console.error("Plan database check failed (rolled back):", error.message);
    process.exit(1);
  }
  console.log(
    "Plan privacy, memberships, concurrent edits, deletion and cascades passed; all synthetic records rolled back.",
  );
}
