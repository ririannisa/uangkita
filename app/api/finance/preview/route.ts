import { backupSchema, withFinanceDetails } from "@/lib/finance";

// Stateless calculations for the web example; never reads or writes account data.
export async function POST(request: Request) {
  if (
    request.headers.get("origin") !== new URL(request.url).origin ||
    !request.headers.get("content-type")?.includes("application/json")
  )
    return Response.json({ error: "Permintaan tidak diizinkan." }, { status: 403 });
  const body = await request.text();
  if (body.length > 4_000_000)
    return Response.json({ error: "Ukuran data terlalu besar." }, { status: 413 });
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return Response.json({ error: "Data tidak valid." }, { status: 400 });
  }
  const parsed = backupSchema.safeParse(json);
  if (!parsed.success)
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  return Response.json(withFinanceDetails(parsed.data), {
    headers: { "Cache-Control": "no-store" },
  });
}
