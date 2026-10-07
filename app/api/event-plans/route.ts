import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getSql } from "@/lib/db";
import {
  planActionSchema,
  planSummary,
  type EventPlan,
} from "@/lib/event-plans";
import templates from "@/lib/event-plan-templates.json";
import {
  readPlansSql,
  createPlanSql,
  savePlanSql,
  deletePlanSql,
} from "@/lib/event-plan-queries";
import {
  assertSameOrigin,
  getSpaceUser,
  spaceForUser,
  SpaceError,
  spaceError,
} from "@/lib/space-server";

async function context(request: Request) {
  const user = await getSpaceUser();
  const scope = new URL(request.url).searchParams.get("spaceId");
  if (scope !== null && !z.string().uuid().safeParse(scope).success)
    throw new SpaceError("Ruang tidak valid.", 400);
  const space = scope ? await spaceForUser(scope, user.id) : null;
  return { user, scope, canDelete: !space || space.role === "owner" };
}

export async function GET(request: Request) {
  try {
    const { user, scope, canDelete } = await context(request);
    const rows = await getSql().query(readPlansSql, [user.id, scope]);
    const plans = (rows as EventPlan[]).map((p) => ({
      ...p,
      summary: planSummary(p.items),
    }));
    return Response.json(
      { plans, canDelete },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return spaceError(error);
  }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { user, scope, canDelete } = await context(request);
    const parsed = planActionSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      throw new SpaceError(
        "Isi rencana tidak valid. Maksimal 200 item; estimasi harus rupiah bulat dan tidak negatif.",
        400,
      );
    const a = parsed.data,
      sql = getSql();
    let rows;
    if (a.action === "create") {
      const items = templates[a.kind].map((i) => ({ ...i, id: randomUUID() }));
      rows = await sql.query(createPlanSql, [
        user.id,
        scope,
        a.kind,
        a.name,
        JSON.stringify(items),
      ]);
    } else if (a.action === "save") {
      // ponytail: one bounded JSON document (200 items); revision prevents lost shared edits.
      rows = await sql.query(savePlanSql, [
        user.id,
        scope,
        a.id,
        a.revision,
        a.plan.name,
        a.plan.date,
        a.plan.location,
        JSON.stringify(a.plan.items),
      ]);
    } else {
      if (!canDelete)
        throw new SpaceError(
          "Hanya pemilik ruang yang bisa menghapus seluruh rencana.",
          403,
        );
      rows = await sql.query(deletePlanSql, [
        user.id,
        scope,
        a.id,
        a.revision,
        a.confirmation,
      ]);
    }
    if (!rows.length)
      throw new SpaceError(
        "Rencana sudah berubah atau akses berakhir. Muat ulang sebelum menyimpan lagi.",
        409,
      );
    return Response.json({ ok: true, id: rows[0].id });
  } catch (error) {
    return spaceError(error);
  }
}
