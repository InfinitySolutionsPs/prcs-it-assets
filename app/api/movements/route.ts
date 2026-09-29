import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { assetMovements, assets } from "../../../db/schema";
import { requirePermission } from "../../../lib/auth";
import { canAccessAssetType } from "../../../lib/asset-scope";

const toAsset = (a: typeof assets.$inferSelect) => ({
  id: a.id,
  code: a.code,
  product: a.name,
  category: a.category,
  facility: a.site,
  department: a.custodian,
  responsible: a.responsible,
  status: a.status,
  condition: a.condition,
  serial: a.serial,
  createdAt: a.createdAt,
});
export async function GET(request: Request) {
  const actor = await requirePermission(request, "movements");
  if (!actor) return Response.json({ error: "غير مصرح" }, { status: 403 });
  try {
    const db = await getDb(),
      assetRows = await db.select().from(assets),
      ids = new Set(
        assetRows
          .filter((item) => canAccessAssetType(actor, item.assetType))
          .map((item) => item.id),
      );
    const rows = await db
      .select()
      .from(assetMovements)
      .orderBy(desc(assetMovements.id))
      .limit(500);
    return Response.json({
      movements: rows.filter((row) => ids.has(row.assetId)),
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "تعذر تحميل سجل الحركات" },
      { status: 500 },
    );
  }
}
export async function POST(request: Request) {
  const actor = await requirePermission(request, "movements");
  if (!actor) return Response.json({ error: "غير مصرح" }, { status: 403 });
  try {
    const p = (await request.json()) as Record<string, string | number>;
    const assetId = Number(p.assetId),
      type = String(p.movementType || "").trim(),
      toFacility = String(p.toFacility || "").trim(),
      toDepartment = String(p.toDepartment || "").trim(),
      toResponsible = String(p.toResponsible || "").trim();
    if (!assetId || !type || !toFacility || !toDepartment || !toResponsible)
      return Response.json(
        { error: "يرجى استكمال بيانات الحركة" },
        { status: 400 },
      );
    const db = await getDb();
    const [current] = await db
      .select()
      .from(assets)
      .where(eq(assets.id, assetId))
      .limit(1);
    if (!current)
      return Response.json(
        { error: "الأصل المحدد غير موجود" },
        { status: 404 },
      );
    if (!canAccessAssetType(actor, current.assetType))
      return Response.json(
        { error: "لا تملك صلاحية نقل هذا الجهاز" },
        { status: 403 },
      );
    const [movement] = await db
      .insert(assetMovements)
      .values({
        assetId,
        assetCode: current.code,
        assetName: current.name,
        movementType: type,
        fromFacility: current.site,
        fromDepartment: current.custodian,
        fromResponsible: current.responsible,
        toFacility,
        toDepartment,
        toResponsible,
        notes: String(p.notes || "").trim(),
      })
      .returning();
    const [updated] = await db
      .update(assets)
      .set({
        site: toFacility,
        custodian: toDepartment,
        responsible: toResponsible,
      })
      .where(eq(assets.id, assetId))
      .returning();
    return Response.json(
      { movement, asset: toAsset(updated) },
      { status: 201 },
    );
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "تعذر حفظ الحركة" },
      { status: 500 },
    );
  }
}
