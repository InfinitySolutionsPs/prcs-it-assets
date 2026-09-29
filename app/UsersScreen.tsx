"use client";
import SearchableSelect from "./SearchableSelect";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "../lib/api-client";

type User = {
  id: number;
  email: string;
  username: string | null;
  fullName: string;
  role: string;
  assetScope: "الكل" | "تقني" | "طبي";
  permissions: string[];
  active: boolean;
  createdAt: string;
};
const permissions = [
  ["dashboard", "نظرة عامة"],
  ["assets", "الأصول والعهد"],
  ["planning", "التخطيط والاحتياج"],
  ["movements", "التسليم والنقل"],
  ["maintenance", "الصيانة"],
  ["inventory", "الجرد"],
  ["stock", "المخزون"],
  ["reports", "التقارير"],
  ["setup", "التعريفات الأساسية"],
  ["users", "المستخدمون والصلاحيات"],
];
const allPermissions = permissions.map((x) => x[0]);
const rolePermissions: Record<string, string[]> = {
  "مدير النظام": allPermissions,
  "مدير نظام طبي": allPermissions,
  "مدير نظام تقني": allPermissions,
  "مسؤول العهد": [
    "dashboard",
    "assets",
    "planning",
    "movements",
    "inventory",
    "reports",
  ],
  "فني الصيانة": ["dashboard", "assets", "maintenance"],
  "مدقق الجرد": ["dashboard", "assets", "inventory", "reports"],
  "مستخدم للقراءة": ["dashboard", "assets", "reports"],
};

export default function UsersScreen({
  currentUser,
}: {
  currentUser: { role: string; assetScope: "الكل" | "تقني" | "طبي" };
}) {
  const [users, setUsers] = useState<User[]>([]),
    [editing, setEditing] = useState<User | null>(null),
    [creating, setCreating] = useState(false),
    [msg, setMsg] = useState(""),
    [role, setRole] = useState("مسؤول العهد"),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    apiFetch("/api/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .catch(() => {});
  }, []);
  const globalAdmin =
    (currentUser.role === "مدير النظام" || currentUser.role === "مدير نظام") &&
    currentUser.assetScope === "الكل";
  const fixedScope = globalAdmin ? null : currentUser.assetScope;
  const availableRoles = globalAdmin
    ? [
        "مدير النظام",
        "مدير نظام طبي",
        "مدير نظام تقني",
        "مسؤول العهد",
        "فني الصيانة",
        "مدقق الجرد",
        "مستخدم للقراءة",
      ]
    : [
        currentUser.assetScope === "طبي" ? "مدير نظام طبي" : "مدير نظام تقني",
        "مسؤول العهد",
        "فني الصيانة",
        "مدقق الجرد",
        "مستخدم للقراءة",
      ];
  const beginCreate = () => {
    setEditing(null);
    setRole("مسؤول العهد");
    setMsg("");
    setCreating(true);
  };
  const beginEdit = (u: User) => {
    setEditing(u);
    setRole(u.role);
    setMsg("");
    setCreating(false);
  };
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const form = e.currentTarget,
      f = new FormData(form),
      selected = f.getAll("permissions").map(String),
      fullName = String(f.get("fullName") || "").trim(),
      email = String(f.get("email") || editing?.email || "")
        .trim()
        .toLowerCase(),
      username = String(f.get("username") || "")
        .trim()
        .toLowerCase();
    try {
      if (editing) {
        const password = String(f.get("password") || ""),
          confirmPassword = String(f.get("confirmPassword") || "");
        if (password && password !== confirmPassword)
          throw new Error("كلمتا المرور غير متطابقتين");
        const r = await apiFetch("/api/users", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              id: editing.id,
              username,
              password: password || undefined,
              fullName,
              role: f.get("role"),
              assetScope: f.get("assetScope"),
              permissions: selected,
              active: f.get("active") === "on",
            }),
          }),
          d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setUsers((v) => v.map((x) => (x.id === d.user.id ? d.user : x)));
        setEditing(null);
        setMsg("تم تحديث المستخدم وبيانات الدخول بنجاح");
        return;
      }
      const password = String(f.get("password") || ""),
        confirmPassword = String(f.get("confirmPassword") || "");
      if (password.length < 8)
        throw new Error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      if (password !== confirmPassword)
        throw new Error("كلمتا المرور غير متطابقتين");
      const r = await apiFetch("/api/users", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            fullName,
            email,
            username,
            password,
            role: f.get("role"),
            assetScope: f.get("assetScope"),
            permissions: selected,
          }),
        }),
        d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setUsers((v) => [...v, d.user]);
      setCreating(false);
      setMsg("تم إنشاء المستخدم. يمكنه الدخول الآن باسم المستخدم وكلمة المرور");
      form.reset();
    } catch (x) {
      setMsg(x instanceof Error ? x.message : "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  };
  const remove = async (u: User) => {
    if (!confirm(`حذف المستخدم ${u.fullName}؟`)) return;
    const r = await apiFetch("/api/users", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: u.id }),
      }),
      d = await r.json();
    if (!r.ok) {
      setMsg(d.error);
      return;
    }
    setUsers((v) => v.filter((x) => x.id !== u.id));
  };
  const currentRole = editing?.role || role,
    currentPermissions =
      editing?.permissions || rolePermissions[currentRole] || [];
  return (
    <section className="usersPage">
      <div className="usersToolbar">
        <div>
          <h2>إدارة المستخدمين</h2>
          <p>إنشاء الحسابات وتحديد الأدوار والصلاحيات</p>
        </div>
        <button className="primary" onClick={beginCreate}>
          ＋ إضافة مستخدم جديد
        </button>
      </div>
      <div className="assetSummary">
        <article>
          <span>إجمالي المستخدمين</span>
          <strong>{users.length}</strong>
        </article>
        <article>
          <span>مستخدمون نشطون</span>
          <strong>{users.filter((x) => x.active).length}</strong>
        </article>
        <article>
          <span>مديرو النظام</span>
          <strong>
            {users.filter((x) => x.role === "مدير النظام").length}
          </strong>
        </article>
        <article>
          <span>الأدوار المتاحة</span>
          <strong>5</strong>
        </article>
      </div>
      <div className="usersGrid">
        <form
          className="panel userForm"
          onSubmit={submit}
          key={editing?.id || (creating ? "new-user" : "empty")}
        >
          <div className="panelHead">
            <div>
              <h2>
                {editing
                  ? "تعديل المستخدم"
                  : creating
                    ? "إضافة مستخدم جديد"
                    : "بيانات المستخدم"}
              </h2>
              <p>
                {editing
                  ? "تعديل الدور والصلاحيات"
                  : "اسم مستخدم وبريد وكلمة مرور مستقلة"}
              </p>
            </div>
            <span className="moveIcon">♙</span>
          </div>
          {!editing && !creating ? (
            <div className="emptyUserForm">
              <span>＋</span>
              <strong>اضغطي «إضافة مستخدم جديد»</strong>
              <p>لإنشاء حساب دخول وتحديد صلاحياته.</p>
            </div>
          ) : (
            <>
              <label>
                الاسم الكامل
                <input
                  name="fullName"
                  defaultValue={editing?.fullName}
                  required
                  placeholder="اسم الموظف"
                />
              </label>
              <label>
                اسم الدخول
                <input
                  name="username"
                  defaultValue={editing?.username || ""}
                  minLength={3}
                  required
                  placeholder="مثال: walaa"
                />
              </label>
              <label>
                البريد الإلكتروني
                <input
                  name="email"
                  type="email"
                  defaultValue={editing?.email}
                  disabled={Boolean(editing)}
                  required
                  placeholder="name@example.com"
                />
              </label>
              <>
                <label>
                  {editing ? "كلمة مرور جديدة (اختياري)" : "كلمة المرور"}
                  <input
                    name="password"
                    type="password"
                    minLength={8}
                    required={!editing}
                    autoComplete="new-password"
                    placeholder={
                      editing ? "اتركها فارغة دون تغيير" : "8 أحرف على الأقل"
                    }
                  />
                </label>
                <label>
                  تأكيد كلمة المرور
                  <input
                    name="confirmPassword"
                    type="password"
                    minLength={8}
                    required={!editing}
                    autoComplete="new-password"
                    placeholder="أعد إدخال كلمة المرور"
                  />
                </label>
              </>
              <label>
                الدور
                <SearchableSelect
                  name="role"
                  value={currentRole}
                  onChange={(e) => {
                    setRole(e.target.value);
                    if (editing)
                      setEditing({
                        ...editing,
                        role: e.target.value,
                        permissions:
                          rolePermissions[e.target.value] ||
                          permissions.map((x) => x[0]),
                      });
                  }}
                >
                  {availableRoles.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </SearchableSelect>
              </label>
              <label>
                نطاق الأجهزة
                <SearchableSelect
                  name="assetScope"
                  value={
                    fixedScope ||
                    (currentRole === "مدير نظام طبي"
                      ? "طبي"
                      : currentRole === "مدير نظام تقني"
                        ? "تقني"
                        : editing?.assetScope || "الكل")
                  }
                  disabled={
                    Boolean(fixedScope) ||
                    currentRole === "مدير نظام طبي" ||
                    currentRole === "مدير نظام تقني"
                  }
                >
                  <option value="الكل">طبي وتقني</option>
                  <option value="طبي">الأجهزة الطبية فقط</option>
                  <option value="تقني">الأجهزة التقنية فقط</option>
                </SearchableSelect>
                <input
                  type="hidden"
                  name="assetScope"
                  value={
                    fixedScope ||
                    (currentRole === "مدير نظام طبي"
                      ? "طبي"
                      : currentRole === "مدير نظام تقني"
                        ? "تقني"
                        : editing?.assetScope || "الكل")
                  }
                />
              </label>
              <fieldset>
                <legend>صلاحيات الوصول</legend>
                {permissions.map(([key, label]) => (
                  <label
                    className="permissionCheck"
                    key={`${currentRole}-${key}`}
                  >
                    <input
                      type="checkbox"
                      name="permissions"
                      value={key}
                      defaultChecked={currentPermissions.includes(key)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </fieldset>
              {editing && (
                <label className="activeCheck">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={editing.active}
                  />{" "}
                  الحساب نشط
                </label>
              )}
              <div className="userFormActions">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setCreating(false);
                    setMsg("");
                  }}
                >
                  إلغاء
                </button>
                <button className="primary" disabled={saving}>
                  {saving
                    ? "جاري الحفظ..."
                    : editing
                      ? "حفظ المستخدم"
                      : "إنشاء المستخدم"}
                </button>
              </div>
            </>
          )}
          {msg && <div className="formMessage">{msg}</div>}
        </form>
        <article className="panel recordsPanel">
          <div className="panelHead">
            <div>
              <h2>المستخدمون المسجلون</h2>
              <p>إدارة الأدوار وحالة الحساب</p>
            </div>
            <span className="resultPill">{users.length} مستخدم</span>
          </div>
          <div className="userList">
            <div className="userListHead">
              <span></span><span>المستخدم</span><span>الدور</span><span>النطاق</span><span>الحالة</span><span>الإجراءات</span>
            </div>
            {users.map((u) => (
              <div className="userRow" key={u.id}>
                <span className="userAvatar">{u.fullName.charAt(0)}</span>
                <div>
                  <strong>{u.fullName}</strong>
                  <small className="userAccount" dir="ltr">
                    {u.username ? `${u.username} — ${u.email}` : `لم تُحدد بيانات الدخول — ${u.email}`}
                  </small>
                </div>
                <span className="rolePill">{u.role}</span>
                <span
                  className={`typeBadge ${u.assetScope === "طبي" ? "medical" : "technical"}`}
                >
                  {u.assetScope === "الكل" ? "طبي وتقني" : u.assetScope}
                </span>
                <span className={`badge ${u.active ? "ok" : "repair"}`}>
                  {u.active ? "نشط" : "موقوف"}
                </span>
                <div className="rowActions">
                  <button onClick={() => beginEdit(u)} title="تعديل">
                    ✎
                  </button>
                  <button
                    className="deleteAction"
                    onClick={() => remove(u)}
                    title="حذف"
                  >
                    ⌫
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
