import { authConfigured, getAuth } from "@/lib/auth/server";
import {
  NEON_AUTH_SESSION_COOKIE_NAME,
  NEON_AUTH_SESSION_DATA_COOKIE_NAME,
} from "@neondatabase/auth/server";
import { getSql } from "@/lib/db";
import { assertSameOrigin, SpaceError } from "@/lib/space-server";
import {
  accountDeletionSchema,
  accountDeletionSql,
} from "@/lib/account-deletion";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!authConfigured())
      throw new SpaceError("Silakan masuk terlebih dahulu.", 401);
    const { data: session } = await getAuth().getSession({
      query: { disableCookieCache: "true" },
    });
    if (!session?.user || !session.session)
      throw new SpaceError("Silakan masuk terlebih dahulu.", 401);
    const user = session.user;
    const parsed = accountDeletionSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      throw new SpaceError(
        "Ketik HAPUS AKUN dan setujui dampak penghapusan.",
        400,
      );
    const owned =
      await getSql()`SELECT id FROM dompetku.spaces WHERE owner_id=${user.id} LIMIT 1`;
    if (owned.length)
      throw new SpaceError(
        "Kamu masih memiliki ruang bersama. Simpan cadangan lalu hapus ruang dengan konfirmasi nama di menu Bersama sebelum menghapus akun.",
        409,
      );
    // Never delete authentication unless atomic application cleanup is installed.
    const ready =
      await getSql()`SELECT 1 FROM pg_trigger WHERE tgname='uangkita_delete_account_data' AND tgrelid='neon_auth.user'::regclass AND tgenabled='O' AND tgfoid='dompetku.delete_account_data()'::regprocedure`;
    if (!ready.length)
      throw new SpaceError(
        "Penghapusan akun belum tersedia. Hubungi contact@aksenraras.my.id.",
        503,
      );
    // One DELETE cascades provider sessions/accounts and triggers application cleanup.
    // Recheck the actual session in the same statement; never trust client IDs or cookies alone.
    const deleted = await getSql().query(accountDeletionSql, [
      user.id,
      session.session.id,
    ]);
    if (!deleted.length)
      throw new SpaceError(
        "Keluar lalu masuk kembali untuk menghapus akun. Penghapusan memerlukan sesi login baru dalam 15 menit terakhir.",
        403,
      );
    const response = Response.json(
      { success: true, message: "User deleted" },
      { headers: { "Cache-Control": "no-store" } },
    );
    for (const name of [
      NEON_AUTH_SESSION_COOKIE_NAME,
      NEON_AUTH_SESSION_DATA_COOKIE_NAME,
    ])
      response.headers.append(
        "Set-Cookie",
        `${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
      );
    return response;
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof SpaceError
            ? error.message
            : "Penghapusan akun belum berhasil. Coba lagi atau hubungi contact@aksenraras.my.id.",
      },
      { status: error instanceof SpaceError ? error.status : 503 },
    );
  }
}
