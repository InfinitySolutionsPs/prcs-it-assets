import { desc, eq, like } from "drizzle-orm";
import { getDb } from "../../../db";
import { categories, products, stockTransactions } from "../../../db/schema";
import { requireAnyPermission, requirePermission } from "../../../lib/auth";
import { canAccessAssetType } from "../../../lib/asset-scope";
import { STOCK_WAREHOUSES } from "../../../lib/stock-warehouses";

export async function GET(request: Request) {
  const actor = await requireAnyPermission(request, ["stock", "reports"]);
  if (!actor) return Response.json({ error: "غير مصرح" }, { status: 403 });
  try {
    const db = await getDb();
    const [categoryRows, productRows, rows] = await Promise.all([
      db.select().from(categories),
      db.select().from(products),
      db.select().from(stockTransactions).orderBy(desc(stockTransactions.id)).limit(1000),
    ]);
    const allowedCategories = new Set(categoryRows.filter((row) => canAccessAssetType(actor, row.assetType)).map((row) => row.name));
    const categoryById = new Map(categoryRows.map((row) => [row.id, row]));
    const productByKey = new Map<string, number[]>();
    for (const product of productRows) {
      const category = categoryById.get(product.parentId);
      if (category) {
        const key = `${category.name}\u0000${product.name}`;
        productByKey.set(key, [...(productByKey.get(key) || []), product.id]);
      }
    }
    return Response.json({
      transactions: rows
        .filter((row) => allowedCategories.has(row.category))
        .map((row) => ({
          ...row,
          productId: row.productId ?? ((productByKey.get(`${row.category}\u0000${row.product}`) || []).length === 1 ? productByKey.get(`${row.category}\u0000${row.product}`)?.[0] : null),
        })),
      warehouses: STOCK_WAREHOUSES,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذر تحميل المخزون" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const actor = await requirePermission(request, "stock");
  if (!actor) return Response.json({ error: "غير مصرح" }, { status: 403 });
  try {
    const input = (await request.json()) as {
      importHash?: string;
      entries?: Array<{ sourceRow?: number; productId?: number; quantity?: number; notes?: string }>;
      productId?: number;
      categoryId?: number;
      transactionType?: string;
      quantity?: number;
      facility?: string;
      reference?: string;
      notes?: string;
    };
    const db = await getDb();
    if (Array.isArray(input.entries)) {
      const importHash = String(input.importHash || "").toLowerCase();
      const warehouse = String(input.facility || "");
      if (!/^[a-f0-9]{64}$/.test(importHash) || !input.entries.length || input.entries.length > 500)
        return Response.json({ error: "بيانات استيراد الملف غير مكتملة" }, { status: 400 });
      if (!STOCK_WAREHOUSES.includes(warehouse as (typeof STOCK_WAREHOUSES)[number]))
        return Response.json({ error: "اختر أحد المستودعات المحددة" }, { status: 400 });
      const batchPrefix = `IMPORT:${importHash}:`;
      if (new Set(input.entries.map((entry) => Number(entry.sourceRow))).size !== input.entries.length)
        return Response.json({ error: "يوجد تكرار لأحد صفوف الملف" }, { status: 400 });
      const [existingBatch] = await db.select({ id: stockTransactions.id }).from(stockTransactions).where(like(stockTransactions.reference, `${batchPrefix}%`)).limit(1);
      if (existingBatch) return Response.json({ error: "تم استيراد هذا الملف إلى المخزون سابقًا" }, { status: 409 });
      const records: (typeof stockTransactions.$inferInsert)[] = [];
      for (const entry of input.entries) {
        const productId = Number(entry.productId), quantity = Number(entry.quantity), sourceRow = Number(entry.sourceRow);
        if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(quantity) || quantity < 1 || !Number.isInteger(sourceRow) || sourceRow < 1)
          return Response.json({ error: "توجد أجهزة أو كميات غير صحيحة في الملف" }, { status: 400 });
        const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
        const [category] = product ? await db.select().from(categories).where(eq(categories.id, product.parentId)).limit(1) : [];
        if (!product || !category) return Response.json({ error: "أحد الأجهزة المختارة لم يعد موجودًا في التعريفات" }, { status: 409 });
        if (!canAccessAssetType(actor, category.assetType)) return Response.json({ error: "لا تملك صلاحية إدارة مخزون أحد أنواع الأجهزة" }, { status: 403 });
        records.push({ product: product.name, productId: product.id, category: category.name, transactionType: "وارد", quantity, facility: warehouse, reference: `${batchPrefix}${sourceRow}`, notes: String(entry.notes || "").trim() });
      }
      db.transaction((tx) => { tx.insert(stockTransactions).values(records).run(); });
      return Response.json({ imported: records.length }, { status: 201 });
    }
    const productId = Number(input.productId);
    const quantity = Number(input.quantity);
    const transactionType = String(input.transactionType || "وارد");
    const warehouse = String(input.facility || "");
    if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(quantity) || quantity < 1)
      return Response.json({ error: "اختر جهازًا مسجلًا وأدخل كمية صحيحة" }, { status: 400 });
    if (transactionType !== "وارد" && transactionType !== "صادر")
      return Response.json({ error: "نوع حركة المخزون غير صحيح" }, { status: 400 });
    if (!STOCK_WAREHOUSES.includes(warehouse as (typeof STOCK_WAREHOUSES)[number]))
      return Response.json({ error: "اختر أحد المستودعات المحددة" }, { status: 400 });

    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    const [category] = product ? await db.select().from(categories).where(eq(categories.id, product.parentId)).limit(1) : [];
    if (!product || !category || (input.categoryId && category.id !== Number(input.categoryId)))
      return Response.json({ error: "الجهاز لا يطابق الصنف المحدد" }, { status: 400 });
    if (!canAccessAssetType(actor, category.assetType))
      return Response.json({ error: "لا تملك صلاحية إدارة مخزون هذا النوع" }, { status: 403 });

    if (transactionType === "صادر") {
      const history = await db.select().from(stockTransactions);
      const balance = history
        .filter((row) => (row.productId === product.id || (row.productId == null && row.category === category.name && row.product === product.name)) && row.facility === warehouse)
        .reduce((sum, row) => sum + (row.transactionType === "وارد" ? row.quantity : -row.quantity), 0);
      if (quantity > balance)
        return Response.json({ error: `الكمية المتاحة في ${warehouse} هي ${balance}` }, { status: 409 });
    }

    const [transaction] = await db.insert(stockTransactions).values({
      product: product.name,
      productId: product.id,
      category: category.name,
      transactionType,
      quantity,
      facility: warehouse,
      reference: String(input.reference || "").trim(),
      notes: String(input.notes || "").trim(),
    }).returning();
    return Response.json({ transaction: { ...transaction, productId: product.id } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر حفظ حركة المخزون";
    return Response.json({ error: message.includes("UNIQUE constraint failed") ? "تم استيراد هذا الملف أو أحد صفوفه سابقًا" : message }, { status: message.includes("UNIQUE constraint failed") ? 409 : 500 });
  }
}
