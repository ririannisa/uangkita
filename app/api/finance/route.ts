import { getAuth, authConfigured } from "@/lib/auth/server";
import { getSql, readFinance } from "@/lib/db";
import { mutationSchema } from "@/lib/finance";

async function userId() {
  if (!authConfigured()) return null;
  const { data } = await getAuth().getSession({
    query: { disableCookieCache: "true" },
  });
  return data?.user?.id ?? null;
}
export async function GET() {
  try {
    const id = await userId();
    if (!id)
      return Response.json(
        { error: "Silakan masuk terlebih dahulu." },
        { status: 401 },
      );
    return Response.json(await readFinance(id), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json(
      { error: "Data belum dapat dimuat. Coba lagi beberapa saat." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  // Same-origin JSON requests only; the session determines ownership, never the body.
  if (
    request.headers.get("origin") !== new URL(request.url).origin ||
    !request.headers.get("content-type")?.includes("application/json")
  ) {
    return Response.json(
      { error: "Permintaan tidak diizinkan." },
      { status: 403 },
    );
  }
  try {
    const id = await userId();
    if (!id)
      return Response.json(
        { error: "Sesi berakhir. Silakan masuk kembali." },
        { status: 401 },
      );
    const body = await request.text();
    if (body.length > 4_000_000)
      return Response.json(
        { error: "Ukuran data terlalu besar." },
        { status: 413 },
      );
    let json: unknown;
    try {
      json = JSON.parse(body);
    } catch {
      return Response.json({ error: "Data tidak valid." }, { status: 400 });
    }
    const parsed = mutationSchema.safeParse(json);
    if (!parsed.success)
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
        { status: 400 },
      );
    const action = parsed.data;
    const sql = getSql();
    if (action.action === "category") {
      await sql`INSERT INTO dompetku.personal_categories(user_id,name) VALUES(${id},${action.name}) ON CONFLICT DO NOTHING`;
    } else if (action.action === "entry") {
      const e = action.entry;
      const rows =
        await sql`INSERT INTO dompetku.entries (id, user_id, type, amount, category, note, date, active, payment_method, due_date, paid_date) VALUES (${e.id}, ${id}, ${e.type}, ${e.amount}, ${e.category}, ${e.note}, ${e.date}, ${e.active}, ${e.paymentMethod ?? "direct"}, ${e.dueDate ?? null}, ${e.paidDate ?? null}) ON CONFLICT (id) DO UPDATE SET type = EXCLUDED.type, amount = EXCLUDED.amount, category = EXCLUDED.category, note = EXCLUDED.note, date = EXCLUDED.date, active = EXCLUDED.active, payment_method = EXCLUDED.payment_method, due_date = EXCLUDED.due_date, paid_date = EXCLUDED.paid_date WHERE dompetku.entries.user_id = ${id} RETURNING id`;
      if (!rows.length)
        return Response.json(
          { error: "Data tidak ditemukan." },
          { status: 404 },
        );
    } else if (action.action === "budget") {
      const b = action.budget;
      const rows =
        await sql`INSERT INTO dompetku.budgets (id, user_id, month, name, planned) VALUES (${b.id}, ${id}, ${b.month + "-01"}, ${b.name}, ${b.planned}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, planned = EXCLUDED.planned WHERE dompetku.budgets.user_id = ${id} AND dompetku.budgets.month = EXCLUDED.month RETURNING id`;
      if (!rows.length)
        return Response.json(
          { error: "Data tidak ditemukan." },
          { status: 404 },
        );
    } else if (action.action === "income") {
      await sql`INSERT INTO dompetku.monthly_plans (user_id, month, income) VALUES (${id}, ${action.plan.month + "-01"}, ${action.plan.income}) ON CONFLICT (user_id, month) DO UPDATE SET income = EXCLUDED.income`;
    } else if (action.action === "delete") {
      if (action.kind === "entry")
        await sql`DELETE FROM dompetku.entries WHERE id = ${action.id} AND user_id = ${id}`;
      else
        await sql`DELETE FROM dompetku.budgets WHERE id = ${action.id} AND user_id = ${id}`;
    } else if (action.action === "reset" || action.action === "import") {
      const queries = [
        sql`DELETE FROM dompetku.entries WHERE user_id = ${id}`,
        sql`DELETE FROM dompetku.budgets WHERE user_id = ${id}`,
        sql`DELETE FROM dompetku.monthly_plans WHERE user_id = ${id}`,
        sql`DELETE FROM dompetku.personal_categories WHERE user_id = ${id}`,
      ];
      if (action.action === "import") {
        queries.push(
          sql`INSERT INTO dompetku.personal_categories(user_id,name) SELECT ${id},value FROM jsonb_array_elements_text(${JSON.stringify(action.backup.categories)}::jsonb) ON CONFLICT DO NOTHING`,
        );
        // All validation happens before replacement; one transaction prevents partial restores.
        queries.push(
          sql`INSERT INTO dompetku.entries (user_id, type, amount, category, note, date, active, payment_method, due_date, paid_date) SELECT ${id}, type, amount, category, note, date, active, COALESCE("paymentMethod", 'direct'), "dueDate", "paidDate" FROM jsonb_to_recordset(${JSON.stringify(action.backup.entries)}::jsonb) AS x(type text, amount bigint, category text, note text, date date, active boolean, "paymentMethod" text, "dueDate" date, "paidDate" date)`,
        );
        queries.push(
          sql`INSERT INTO dompetku.budgets (user_id, month, name, planned) SELECT ${id}, (month || '-01')::date, name, planned FROM jsonb_to_recordset(${JSON.stringify(action.backup.budgets)}::jsonb) AS x(month text, name text, planned bigint)`,
        );
        queries.push(
          sql`INSERT INTO dompetku.monthly_plans (user_id, month, income) SELECT ${id}, (month || '-01')::date, income FROM jsonb_to_recordset(${JSON.stringify(action.backup.plans)}::jsonb) AS x(month text, income bigint)`,
        );
      }
      await sql.transaction(queries);
    }
    return Response.json({ ok: true });
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "23505"
    )
      return Response.json(
        { error: "Kategori tersebut sudah memiliki anggaran pada bulan ini." },
        { status: 409 },
      );
    return Response.json(
      { error: "Perubahan belum tersimpan. Silakan coba lagi." },
      { status: 503 },
    );
  }
}
