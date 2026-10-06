import "server-only";
import { getAuth, authConfigured } from "./auth/server";
import { getSql } from "./db";
import { categoryOptions } from "./categories";
import type { SharedFinance } from "./shared-finance";
import type { Space, SpaceDetails, SpaceOverview, SpaceUser } from "./spaces";

export class SpaceError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function getSpaceUser(): Promise<SpaceUser> {
  if (!authConfigured())
    throw new SpaceError("Silakan masuk terlebih dahulu.", 401);
  const { data } = await getAuth().getSession({
    query: { disableCookieCache: "true" },
  });
  if (!data?.user) throw new SpaceError("Silakan masuk terlebih dahulu.", 401);
  return {
    id: data.user.id,
    name: data.user.name.slice(0, 100),
    email: data.user.email.toLowerCase(),
    emailVerified: data.user.emailVerified,
  };
}
export function assertSameOrigin(request: Request) {
  if (
    request.headers.get("origin") !== new URL(request.url).origin ||
    !request.headers.get("content-type")?.includes("application/json")
  )
    throw new SpaceError("Permintaan tidak diizinkan.", 403);
}
export function spaceError(error: unknown) {
  if (error instanceof SpaceError)
    return Response.json({ error: error.message }, { status: error.status });
  if (
    typeof error === "object" &&
    error &&
    "code" in error &&
    error.code === "23505"
  )
    return Response.json(
      { error: "Data tersebut sudah ada dalam ruang ini." },
      { status: 409 },
    );
  return Response.json(
    { error: "Belum dapat memproses ruang keuangan. Coba lagi." },
    { status: 503 },
  );
}
export async function spaceForUser(
  spaceId: string,
  userId: string,
): Promise<Space> {
  const rows =
    await getSql()`SELECT s.id, s.name, s.kind, s.owner_id AS "ownerId", CASE WHEN s.owner_id = ${userId} THEN 'owner' ELSE 'member' END AS role FROM dompetku.spaces s JOIN dompetku.space_members m ON m.space_id = s.id WHERE s.id = ${spaceId} AND m.user_id = ${userId}`;
  if (!rows.length)
    throw new SpaceError(
      "Ruang tidak ditemukan atau aksesmu sudah berakhir.",
      403,
    );
  return rows[0] as Space;
}
export async function listSpaces(user: SpaceUser): Promise<SpaceOverview> {
  const sql = getSql();
  const [spaces, invitations] = await sql.transaction([
    sql`SELECT s.id, s.name, s.kind, s.owner_id AS "ownerId", CASE WHEN s.owner_id = ${user.id} THEN 'owner' ELSE 'member' END AS role FROM dompetku.spaces s JOIN dompetku.space_members m ON m.space_id = s.id WHERE m.user_id = ${user.id} ORDER BY s.created_at`,
    sql`SELECT i.id, i.space_id AS "spaceId", s.name AS "spaceName", i.email, i.expires_at AS "expiresAt" FROM dompetku.space_invites i JOIN dompetku.spaces s ON s.id = i.space_id WHERE i.email = ${user.email} AND i.expires_at > now() ORDER BY i.expires_at`,
  ]);
  return {
    spaces,
    invitations,
    emailVerified: user.emailVerified,
  } as SpaceOverview;
}
export async function readSpaceDetails(
  space: Space,
  userId: string,
): Promise<SpaceDetails> {
  const sql = getSql();
  const [members, invitations, events] = await sql.transaction([
    sql`SELECT m.user_id AS "userId", m.name, m.email FROM dompetku.space_members m WHERE m.space_id = ${space.id} AND EXISTS (SELECT 1 FROM dompetku.space_members a WHERE a.space_id = m.space_id AND a.user_id = ${userId}) ORDER BY m.joined_at`,
    sql`SELECT i.id, i.space_id AS "spaceId", ${space.name} AS "spaceName", i.email, i.expires_at AS "expiresAt" FROM dompetku.space_invites i JOIN dompetku.spaces s ON s.id = i.space_id WHERE i.space_id = ${space.id} AND s.owner_id = ${userId} AND i.expires_at > now()`,
    sql`SELECT e.id::text, e.actor_name AS "actorName", e.action, e.detail, e.created_at AS "createdAt" FROM dompetku.space_events e WHERE e.space_id = ${space.id} AND EXISTS (SELECT 1 FROM dompetku.space_members m WHERE m.space_id = e.space_id AND m.user_id = ${userId}) ORDER BY e.created_at DESC, e.id DESC LIMIT 30`,
  ]);
  return { members, invitations, events } as SpaceDetails;
}
export async function readSharedFinance(
  spaceId: string,
  userId: string,
): Promise<SharedFinance> {
  const sql = getSql();
  const [entries, budgets] = await sql.transaction([
    sql`SELECT e.id, e.type, e.amount::float8 AS amount, e.category, e.note, to_char(e.date,'YYYY-MM-DD') AS date, e.active, e.payment_method AS "paymentMethod", to_char(e.due_date,'YYYY-MM-DD') AS "dueDate", to_char(e.paid_date,'YYYY-MM-DD') AS "paidDate", e.credit_payments AS "creditPayments", e.user_id AS "authorId", e.author_name AS "authorName" FROM dompetku.shared_entries e WHERE e.space_id = ${spaceId} AND EXISTS (SELECT 1 FROM dompetku.space_members m WHERE m.space_id = e.space_id AND m.user_id = ${userId}) ORDER BY e.date DESC, e.created_at DESC`,
    sql`SELECT b.id, to_char(b.month,'YYYY-MM') AS month, b.name, b.planned::float8 AS planned FROM dompetku.shared_budgets b WHERE b.space_id = ${spaceId} AND EXISTS (SELECT 1 FROM dompetku.space_members m WHERE m.space_id = b.space_id AND m.user_id = ${userId}) ORDER BY b.name`,
  ]);
  const names =
    await sql`SELECT c.name FROM dompetku.shared_categories c WHERE c.space_id=${spaceId} AND EXISTS (SELECT 1 FROM dompetku.space_members m WHERE m.space_id=c.space_id AND m.user_id=${userId}) ORDER BY c.name`;
  const data = {
    entries,
    budgets,
    categories: names.map((c) => c.name),
  } as SharedFinance;
  return { ...data, availableCategories: categoryOptions(data) };
}
