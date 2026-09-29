import { isGlobalSystemAdminRole } from "./roles";

export type AssetScope = "الكل" | "تقني" | "طبي";
type ScopeUser = { role?: string | null; assetScope?: string | null };

export function normalizeAssetScope(user: ScopeUser): AssetScope {
  if (
    isGlobalSystemAdminRole(user.role || "") &&
    user.assetScope !== "طبي" &&
    user.assetScope !== "تقني"
  )
    return "الكل";
  const role = (user.role || "").normalize("NFKC").replace(/\s+/g, " ").trim();
  if (role === "مدير نظام طبي" || role === "مدير النظام الطبي") return "طبي";
  if (role === "مدير نظام تقني" || role === "مدير النظام التقني") return "تقني";
  return user.assetScope === "طبي" || user.assetScope === "تقني"
    ? user.assetScope
    : "الكل";
}

export function canAccessAssetType(user: ScopeUser, assetType?: string | null) {
  const scope = normalizeAssetScope(user);
  return scope === "الكل" || scope === (assetType || "تقني");
}
