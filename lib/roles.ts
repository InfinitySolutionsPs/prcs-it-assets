const normalizeRole = (role?: string | null) =>
  (role || "").normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();

export function isSystemAdminRole(role?: string | null) {
  const value = normalizeRole(role);
  return (
    value === "مدير النظام" ||
    value === "مدير نظام" ||
    value === "مدير نظام طبي" ||
    value === "مدير النظام الطبي" ||
    value === "مدير نظام تقني" ||
    value === "مدير النظام التقني" ||
    value === "system_admin" ||
    value === "admin"
  );
}

export function isGlobalSystemAdminRole(role?: string | null) {
  const value = normalizeRole(role);
  return (
    value === "مدير النظام" ||
    value === "مدير نظام" ||
    value === "system_admin" ||
    value === "admin"
  );
}
