import "server-only";
import { neon } from "@neondatabase/serverless";
import type { FinanceData } from "./finance";

export function getSql() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url?.startsWith("postgres"))
    throw new Error("Database belum dikonfigurasi");
  return neon(url);
}

export async function readFinance(userId: string): Promise<FinanceData> {
  const sql = getSql();
  const [entries, budgets, plans, transfers, categories] =
    await sql.transaction([
      sql`SELECT id, type, amount::float8 AS amount, category, note, to_char(date, 'YYYY-MM-DD') AS date, active, payment_method AS "paymentMethod", to_char(due_date, 'YYYY-MM-DD') AS "dueDate", to_char(paid_date, 'YYYY-MM-DD') AS "paidDate" FROM dompetku.entries WHERE user_id = ${userId} ORDER BY date DESC, created_at DESC`,
      sql`SELECT id, to_char(month, 'YYYY-MM') AS month, name, planned::float8 AS planned FROM dompetku.budgets WHERE user_id = ${userId} ORDER BY name`,
      sql`SELECT to_char(month, 'YYYY-MM') AS month, income::float8 AS income FROM dompetku.monthly_plans WHERE user_id = ${userId}`,
      sql`SELECT 'shared:' || e.id::text AS id, 'out' AS type, e.amount::float8 AS amount, 'Ruang Bersama' AS category, 'Transfer ke ' || s.name AS note, to_char(e.date,'YYYY-MM-DD') AS date, e.active, s.id AS "spaceId" FROM dompetku.shared_entries e JOIN dompetku.spaces s ON s.id=e.space_id WHERE e.user_id=${userId} AND e.type='contribution' ORDER BY e.date DESC, e.created_at DESC`,
      sql`SELECT name FROM dompetku.personal_categories WHERE user_id=${userId} ORDER BY name`,
    ]);
  return {
    entries: [...entries, ...transfers].sort((a, b) =>
      String(b.date).localeCompare(String(a.date)),
    ),
    budgets,
    plans,
    categories: categories.map((c) => c.name),
  } as FinanceData;
}
