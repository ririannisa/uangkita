import { getSql } from "@/lib/db";
import { spaceActionSchema } from "@/lib/spaces";
import {
  assertSameOrigin,
  getSpaceUser,
  listSpaces,
  SpaceError,
  spaceError,
} from "@/lib/space-server";

export async function GET() {
  try {
    return Response.json(await listSpaces(await getSpaceUser()), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return spaceError(e);
  }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getSpaceUser();
    const parsed = spaceActionSchema.safeParse(await request.json());
    if (!parsed.success) throw new SpaceError("Data ruang tidak valid.", 400);
    const a = parsed.data,
      sql = getSql();
    let rows;
    if (a.action === "create") {
      rows =
        await sql`WITH s AS (INSERT INTO dompetku.spaces(name,kind,owner_id) VALUES (${a.name},${a.kind},${user.id}) RETURNING id) INSERT INTO dompetku.space_members(space_id,user_id,name,email) SELECT id,${user.id},${user.name},${user.email} FROM s RETURNING space_id AS id`;
    } else if (a.action === "deleteSpace") {
      rows =
        await sql`DELETE FROM dompetku.spaces WHERE id=${a.spaceId} AND owner_id=${user.id} AND name=${a.confirmation} RETURNING id`;
      if (!rows.length)
        throw new SpaceError(
          "Nama konfirmasi tidak cocok atau kamu bukan pemilik ruang ini.",
          403,
        );
    } else if (a.action === "invite") {
      if (a.email === user.email)
        throw new SpaceError("Kamu sudah menjadi anggota ruang ini.", 400);
      rows =
        await sql`INSERT INTO dompetku.space_invites(space_id,email) SELECT id,${a.email} FROM dompetku.spaces WHERE id=${a.spaceId} AND owner_id=${user.id} ON CONFLICT(space_id,email) DO UPDATE SET expires_at=now()+interval '7 days' RETURNING id`;
    } else if (a.action === "accept") {
      if (!user.emailVerified)
        throw new SpaceError(
          "Verifikasi email terlebih dahulu untuk menerima undangan.",
          403,
        );
      rows =
        await sql`WITH i AS (DELETE FROM dompetku.space_invites WHERE id=${a.invitationId} AND email=${user.email} AND expires_at>now() RETURNING space_id) INSERT INTO dompetku.space_members(space_id,user_id,name,email) SELECT space_id,${user.id},${user.name},${user.email} FROM i ON CONFLICT(space_id,user_id) DO UPDATE SET name=EXCLUDED.name RETURNING space_id AS id`;
    } else if (a.action === "decline") {
      rows =
        await sql`DELETE FROM dompetku.space_invites WHERE id=${a.invitationId} AND email=${user.email} RETURNING id`;
    } else if (a.action === "revoke") {
      rows =
        await sql`DELETE FROM dompetku.space_invites i USING dompetku.spaces s WHERE i.space_id=s.id AND s.id=${a.spaceId} AND s.owner_id=${user.id} AND i.id=${a.invitationId} RETURNING i.id`;
    } else {
      rows =
        await sql`DELETE FROM dompetku.space_members m USING dompetku.spaces s WHERE m.space_id=s.id AND s.id=${a.spaceId} AND s.owner_id=${user.id} AND m.user_id=${a.userId} AND m.user_id<>s.owner_id RETURNING m.user_id AS id`;
    }
    if (!rows.length)
      throw new SpaceError(
        "Data tidak ditemukan atau akses tidak diizinkan.",
        403,
      );
    return Response.json({ ok: true, id: rows[0].id });
  } catch (e) {
    return spaceError(e);
  }
}
