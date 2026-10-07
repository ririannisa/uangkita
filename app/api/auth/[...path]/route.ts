import { getAuth, authConfigured } from "@/lib/auth/server";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ path: string[] }> };
export async function GET(request: NextRequest, context: Context) {
  if ((await context.params).path[0] === "delete-user")
    return Response.json({ error: "Gunakan halaman /delete-account untuk menghapus akun UangKita." }, { status: 403 });
  if (!authConfigured())
    return Response.json(
      { message: "Login belum tersedia. Hubungi pengelola aplikasi." },
      { status: 503 },
    );
  return getAuth().handler().GET(request, context);
}
export async function POST(request: NextRequest, context: Context) {
  if ((await context.params).path[0] === "delete-user")
    return Response.json({ error: "Gunakan /api/account/delete untuk menghapus akun beserta data UangKita." }, { status: 403 });
  if (!authConfigured())
    return Response.json(
      { message: "Login belum tersedia. Hubungi pengelola aplikasi." },
      { status: 503 },
    );
  return getAuth().handler().POST(request, context);
}
