import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { appUsers } from "../../../db/schema";
import { hashPassword, requirePermission } from "../../../lib/auth";
import { isGlobalSystemAdminRole, isSystemAdminRole } from "../../../lib/roles";
import { normalizeAssetScope } from "../../../lib/asset-scope";
const clean = (user: typeof appUsers.$inferSelect) => ({
  ...user,
  passwordHash: undefined,
  permissions: JSON.parse(user.permissions) as string[],
});
const validScope = (value?: string) =>
  value === "تقني" || value === "طبي" || value === "الكل" ? value : "الكل";
const roleScope = (role?: string, scope?: string) =>
  role === "مدير نظام طبي"
    ? "طبي"
    : role === "مدير نظام تقني"
      ? "تقني"
      : validScope(scope);
const isGlobalActor = (actor: { role: string; assetScope: string }) =>
  isGlobalSystemAdminRole(actor.role) && normalizeAssetScope(actor) === "الكل";
const canManageScope = (
  actor: { role: string; assetScope: string },
  scope: string,
) => isGlobalActor(actor) || normalizeAssetScope(actor) === scope;
export async function GET(request: Request) {
  const actor = await requirePermission(request, "users");
  if (!actor) return Response.json({ error: "غير مصرح" }, { status: 403 });
  const db = await getDb(),
    rows = await db.select().from(appUsers).orderBy(asc(appUsers.id));
  return Response.json({
    users: rows
      .filter(
        (user) =>
          isGlobalActor(actor) ||
          normalizeAssetScope(actor) === normalizeAssetScope(user),
      )
      .map(clean),
  });
}
export async function POST(request: Request) {
  const actor = await requirePermission(request, "users");
  if (!actor || !isSystemAdminRole(actor.role))
    return Response.json(
      { error: "إضافة المستخدمين متاحة لمدير النظام فقط" },
      { status: 403 },
    );
  try {
    const p = (await request.json()) as {
        email?: string;
        username?: string;
        password?: string;
        fullName?: string;
        role?: string;
        assetScope?: string;
        permissions?: string[];
      },
      email = p.email?.trim().toLowerCase(),
      username = p.username?.trim().toLowerCase(),
      fullName = p.fullName?.trim(),
      password = p.password || "",
      role = p.role || "مستخدم",
      assetScope = roleScope(role, p.assetScope);
    if (
      !canManageScope(actor, assetScope) ||
      (!isGlobalActor(actor) && isGlobalSystemAdminRole(role) && assetScope === "الكل")
    )
      return Response.json(
        { error: "لا يمكنك إنشاء مستخدم خارج نطاقك" },
        { status: 403 },
      );
    if (!email || !username || !fullName)
      return Response.json(
        { error: "الاسم واسم المستخدم والبريد مطلوبة" },
        { status: 400 },
      );
    if (username.length < 3)
      return Response.json(
        { error: "اسم المستخدم يجب أن يكون 3 أحرف على الأقل" },
        { status: 400 },
      );
    if (password.length < 8)
      return Response.json(
        { error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" },
        { status: 400 },
      );
    const db = await getDb();
    if (
      (
        await db
          .select()
          .from(appUsers)
          .where(eq(appUsers.email, email))
          .limit(1)
      ).length
    )
      return Response.json(
        { error: "البريد الإلكتروني مسجل مسبقًا" },
        { status: 409 },
      );
    if (
      (
        await db
          .select()
          .from(appUsers)
          .where(eq(appUsers.username, username))
          .limit(1)
      ).length
    )
      return Response.json(
        { error: "اسم المستخدم مستخدم مسبقًا" },
        { status: 409 },
      );
    const [user] = await db
      .insert(appUsers)
      .values({
        email,
        username,
        passwordHash: hashPassword(password),
        fullName,
        role,
        assetScope,
        permissions: JSON.stringify(p.permissions || []),
        active: true,
      })
      .returning();
    return Response.json({ user: clean(user) }, { status: 201 });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "تعذر إضافة المستخدم" },
      { status: 500 },
    );
  }
}
export async function PATCH(request: Request) {
  const actor = await requirePermission(request, "users");
  if (!actor || !isSystemAdminRole(actor.role))
    return Response.json({ error: "غير مصرح" }, { status: 403 });
  try {
    const p = (await request.json()) as {
        id?: number;
        username?: string;
        password?: string;
        fullName?: string;
        role?: string;
        assetScope?: string;
        permissions?: string[];
        active?: boolean;
      },
      id = Number(p.id);
    if (p.password && p.password.length < 8)
      return Response.json(
        { error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" },
        { status: 400 },
      );
    const db = await getDb(),
      [target] = await db
        .select()
        .from(appUsers)
        .where(eq(appUsers.id, id))
        .limit(1);
    if (!target || !canManageScope(actor, normalizeAssetScope(target)))
      return Response.json(
        { error: "لا يمكنك تعديل مستخدم خارج نطاقك" },
        { status: 403 },
      );
    const role = p.role || target.role,
      assetScope = roleScope(role, p.assetScope || target.assetScope);
    if (
      !canManageScope(actor, assetScope) ||
      (!isGlobalActor(actor) && isGlobalSystemAdminRole(role) && assetScope === "الكل")
    )
      return Response.json(
        { error: "لا يمكنك تغيير المستخدم إلى نطاق آخر" },
        { status: 403 },
      );
    const changes: {
      fullName?: string;
      username?: string;
      passwordHash?: string;
      role?: string;
      assetScope?: string;
      permissions?: string;
      active?: boolean;
    } = {
      fullName: p.fullName?.trim(),
      role,
      assetScope,
      permissions: JSON.stringify(p.permissions || []),
      active: p.active,
    };
    if (p.username) {
      const username = p.username.trim().toLowerCase();
      if (username.length < 3)
        return Response.json(
          { error: "اسم المستخدم يجب أن يكون 3 أحرف على الأقل" },
          { status: 400 },
        );
      const duplicate = await db
        .select({ id: appUsers.id })
        .from(appUsers)
        .where(eq(appUsers.username, username))
        .limit(1);
      if (duplicate.length && duplicate[0].id !== id)
        return Response.json(
          { error: "اسم المستخدم مستخدم مسبقًا" },
          { status: 409 },
        );
      changes.username = username;
    }
    if (p.password) changes.passwordHash = hashPassword(p.password);
    const [user] = await db
      .update(appUsers)
      .set(changes)
      .where(eq(appUsers.id, id))
      .returning();
    return Response.json({ user: clean(user) });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "تعذر تعديل المستخدم" },
      { status: 500 },
    );
  }
}
export async function DELETE(request: Request) {
  const actor = await requirePermission(request, "users");
  if (!actor || !isSystemAdminRole(actor.role))
    return Response.json(
      { error: "حذف المستخدمين متاح لمدير النظام فقط" },
      { status: 403 },
    );
  const p = (await request.json()) as { id?: number },
    id = Number(p.id);
  if (actor.id === id)
    return Response.json(
      { error: "لا يمكنك حذف حسابك الحالي" },
      { status: 409 },
    );
  const db = await getDb(),
    [target] = await db
      .select()
      .from(appUsers)
      .where(eq(appUsers.id, id))
      .limit(1);
  if (!target || !canManageScope(actor, normalizeAssetScope(target)))
    return Response.json(
      { error: "لا يمكنك حذف مستخدم خارج نطاقك" },
      { status: 403 },
    );
  await db.delete(appUsers).where(eq(appUsers.id, id));
  return Response.json({ deleted: true });
}
