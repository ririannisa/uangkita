import { z } from "zod";
import { getSql } from "@/lib/db";
import { sharedMutationSchema } from "@/lib/shared-finance";
import { existingCategory } from "@/lib/categories";
import {
  assertSameOrigin,
  getSpaceUser,
  spaceForUser,
  readSharedFinance,
  readSpaceDetails,
  SpaceError,
  spaceError,
} from "@/lib/space-server";
type Context = { params: Promise<{ id: string }> };
async function context(ctx: Context) {
  const user = await getSpaceUser(),
    { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success)
    throw new SpaceError("Ruang tidak valid.", 400);
  return { user, space: await spaceForUser(id, user.id) };
}
export async function GET(_: Request, ctx: Context) {
  try {
    const { user, space } = await context(ctx);
    const [finance, details] = await Promise.all([
      readSharedFinance(space.id, user.id),
      readSpaceDetails(space, user.id),
    ]);
    return Response.json(
      { finance, details },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return spaceError(e);
  }
}
export async function POST(request: Request, ctx: Context) {
  try {
    assertSameOrigin(request);
    const { user, space } = await context(ctx);
    const parsed = sharedMutationSchema.safeParse(await request.json());
    if (!parsed.success)
      throw new SpaceError(
        parsed.error.issues[0]?.message ??
          "Transaksi atau anggaran tidak valid.",
        400,
      );
    const a = parsed.data,
      sql = getSql();
    if (a.action !== "delete") {
      const finance = await readSharedFinance(space.id, user.id);
      const names = finance.availableCategories ?? [];
      if (a.action === "entry") a.entry.category = existingCategory(a.entry.category, names);
      else if (a.action === "budget") a.budget.name = existingCategory(a.budget.name, names);
      else a.name = existingCategory(a.name, names);
    }
    let rows;
    if (a.action === "category") {
      if (space.role !== "owner")
        throw new SpaceError(
          "Hanya pemilik yang dapat menambah kategori ruang.",
          403,
        );
      rows =
        await sql`WITH added AS (INSERT INTO dompetku.shared_categories(space_id,name) SELECT id,${a.name} FROM dompetku.spaces WHERE id=${space.id} AND owner_id=${user.id} ON CONFLICT DO NOTHING RETURNING name) INSERT INTO dompetku.space_events(space_id,actor_id,actor_name,action,detail) SELECT ${space.id},${user.id},${user.name},'Tambah kategori',jsonb_build_object('name',name) FROM added RETURNING id`;
      if (!rows.length)
        throw new SpaceError(
          "Kategori sudah ada atau akses tidak diizinkan.",
          409,
        );
    } else if (a.action === "entry") {
      const e = a.entry;
      rows =
        await sql`WITH changed AS (INSERT INTO dompetku.shared_entries(id,space_id,user_id,author_name,type,amount,category,note,date,active,payment_method,due_date,paid_date,credit_payments) SELECT ${e.id},s.id,${user.id},${user.name},${e.type},${e.amount},${e.category},${e.note},${e.date},${e.active},${e.paymentMethod ?? "direct"},${e.dueDate ?? null}::date,${e.paidDate ?? null}::date,${JSON.stringify(e.creditPayments ?? [])}::jsonb FROM dompetku.spaces s JOIN dompetku.space_members m ON m.space_id=s.id WHERE s.id=${space.id} AND m.user_id=${user.id} ON CONFLICT(id) DO UPDATE SET type=EXCLUDED.type,amount=EXCLUDED.amount,category=EXCLUDED.category,note=EXCLUDED.note,date=EXCLUDED.date,active=EXCLUDED.active,payment_method=EXCLUDED.payment_method,due_date=EXCLUDED.due_date,paid_date=EXCLUDED.paid_date,credit_payments=EXCLUDED.credit_payments WHERE dompetku.shared_entries.space_id=${space.id} AND (dompetku.shared_entries.user_id=${user.id} OR (dompetku.shared_entries.type <> 'contribution' AND EXCLUDED.type <> 'contribution' AND EXISTS(SELECT 1 FROM dompetku.spaces WHERE id=${space.id} AND owner_id=${user.id}))) RETURNING id) INSERT INTO dompetku.space_events(space_id,actor_id,actor_name,action,detail) SELECT ${space.id},${user.id},${user.name},'Simpan transaksi',${JSON.stringify({ category: e.category, amount: e.amount, paymentMethod: e.paymentMethod ?? "direct", dueDate: e.dueDate ?? null, paidDate: e.paidDate ?? null, creditPayments: e.creditPayments ?? [] })}::jsonb FROM changed RETURNING id`;
    } else if (a.action === "budget") {
      const b = a.budget;
      rows =
        await sql`WITH changed AS (INSERT INTO dompetku.shared_budgets(id,space_id,month,name,planned) SELECT ${b.id},id,${b.month + "-01"}::date,${b.name},${b.planned} FROM dompetku.spaces WHERE id=${space.id} AND owner_id=${user.id} ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,planned=EXCLUDED.planned WHERE dompetku.shared_budgets.space_id=${space.id} AND dompetku.shared_budgets.month=EXCLUDED.month RETURNING id) INSERT INTO dompetku.space_events(space_id,actor_id,actor_name,action,detail) SELECT ${space.id},${user.id},${user.name},'Simpan anggaran',${JSON.stringify({ name: b.name, amount: b.planned })}::jsonb FROM changed RETURNING id`;
    } else if (a.kind === "entry") {
      rows =
        await sql`WITH changed AS (DELETE FROM dompetku.shared_entries e USING dompetku.space_members m,dompetku.spaces s WHERE e.id=${a.id} AND e.space_id=${space.id} AND m.space_id=e.space_id AND m.user_id=${user.id} AND s.id=e.space_id AND (e.user_id=${user.id} OR (e.type <> 'contribution' AND s.owner_id=${user.id})) RETURNING e.category,e.amount) INSERT INTO dompetku.space_events(space_id,actor_id,actor_name,action,detail) SELECT ${space.id},${user.id},${user.name},'Hapus transaksi',jsonb_build_object('category',category,'amount',amount) FROM changed RETURNING id`;
    } else {
      rows =
        await sql`WITH changed AS (DELETE FROM dompetku.shared_budgets b USING dompetku.spaces s WHERE b.id=${a.id} AND b.space_id=s.id AND s.id=${space.id} AND s.owner_id=${user.id} RETURNING b.name) INSERT INTO dompetku.space_events(space_id,actor_id,actor_name,action,detail) SELECT ${space.id},${user.id},${user.name},'Hapus anggaran',jsonb_build_object('name',name) FROM changed RETURNING id`;
    }
    if (!rows.length)
      throw new SpaceError(
        "Tidak dapat mengubah data ini. Periksa aksesmu.",
        403,
      );
    return Response.json({ ok: true });
  } catch (e) {
    return spaceError(e);
  }
}
