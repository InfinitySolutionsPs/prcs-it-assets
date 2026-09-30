"use client";
import SearchableSelect from "./SearchableSelect";
import { FormEvent, useEffect, useMemo, useState } from "react";
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
    [saving, setSaving] = useState(false),
    [userSearch, setUserSearch] = useState(""),
    [roleFilter, setRoleFilter] = useState("الكل"),
    [scopeFilter, setScopeFilter] = useState("الكل"),
    [statusFilter, setStatusFilter] = useState("الكل"),
    [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(10);
  useEffect(() => {
    apiFetch("/api/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .catch(() => {});
  }, []);
  const globalAdmin =
    (currentUser.role === "مدير النظام" || currentUser.role === "مدير نظام") &&
    currentUser.assetScope === "الكل";
  const filteredUsers = useMemo(
    () => users.filter((user) => {
      const text = `${user.fullName} ${user.username || ""} ${user.email} ${user.role} ${user.assetScope}`.toLocaleLowerCase();
      return (!userSearch.trim() || text.includes(userSearch.trim().toLocaleLowerCase())) &&
        (roleFilter === "الكل" || user.role === roleFilter) &&
        (scopeFilter === "الكل" || user.assetScope === scopeFilter) &&
        (statusFilter === "الكل" || (statusFilter === "نشط" ? user.active : !user.active));
    }),
    [users, userSearch, roleFilter, scopeFilter, statusFilter],
  );
  const pages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const pageUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);
  const pageNumbers = useMemo(() => {
    const values: (number | string)[] = [];
    for (let number = 1; number <= pages; number++) {
      if (number === 1 || number === pages || Math.abs(number - page) <= 1) values.push(number);
      else if (values[values.length - 1] !== "…") values.push("…");
    }
    return values;
  }, [page, pages]);
  useEffect(() => setPage(1), [userSearch, roleFilter, scopeFilter, statusFilter, pageSize]);
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
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
            {users.filter((x) => x.role === "مدير النظام" || x.role === "مدير نظام طبي" || x.role === "مدير نظام تقني").length}
          </strong>
        </article>
        <article>
          <span>الأدوار المتاحة</span>
          <strong>{new Set(availableRoles).size}</strong>
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
        <article className="panel recordsPanel usersRecords">
          <div className="panelHead">
            <div>
              <h2>المستخدمون المسجلون</h2>
              <p>إدارة الأدوار وحالة الحساب</p>
            </div>
            <span className="resultPill">{users.length} مستخدم</span>
          </div>
          <div className="userTableTools">
            <label className="userSearchField"><span>بحث</span><div className="search">⌕<input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="اسم المستخدم، اسم الدخول، البريد أو الدور..."/></div></label>
            <label><span>الدور</span><SearchableSelect value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}><option>الكل</option>{[...new Set(users.map((user) => user.role))].sort((a,b)=>a.localeCompare(b,"ar")).map((value)=><option key={value}>{value}</option>)}</SearchableSelect></label>
            <label><span>نطاق الأجهزة</span><SearchableSelect value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)}><option value="الكل">طبي وتقني</option><option value="طبي">طبي</option><option value="تقني">تقني</option></SearchableSelect></label>
            <label><span>الحالة</span><SearchableSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option>الكل</option><option>نشط</option><option>موقوف</option></SearchableSelect></label>
          </div>
          <div className="tableWrap usersTableWrap"><table className="usersTable"><thead><tr><th>المستخدم</th><th>اسم الدخول</th><th>البريد الإلكتروني</th><th>الدور</th><th>النطاق</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>{pageUsers.map((u) => (
            <tr key={u.id}>
              <td><div className="userTableIdentity"><span className="userAvatar">{u.fullName.charAt(0)}</span><strong>{u.fullName}</strong></div></td>
              <td dir="ltr">{u.username || "—"}</td>
              <td className="userEmailCell" dir="ltr">{u.email}</td>
              <td><span className="rolePill">{u.role}</span></td>
              <td><span className={`typeBadge ${u.assetScope === "طبي" ? "medical" : "technical"}`}>{u.assetScope === "الكل" ? "طبي وتقني" : u.assetScope}</span></td>
              <td><span className={`badge ${u.active ? "ok" : "repair"}`}>{u.active ? "نشط" : "موقوف"}</span></td>
              <td><span className="rowActions"><button onClick={() => beginEdit(u)} title="تعديل المستخدم">✎</button><button className="deleteAction" onClick={() => remove(u)} title="حذف المستخدم">⌫</button></span></td>
            </tr>
          ))}</tbody></table>{!pageUsers.length&&<div className="emptyState"><strong>لا توجد نتائج مطابقة</strong><span>غيّري البحث أو الفلاتر.</span></div>}</div>
          <div className="assetFoot usersFoot"><span>عرض {filteredUsers.length ? `${(page-1)*pageSize+1}–${Math.min(page*pageSize,filteredUsers.length)}` : "0"} من {filteredUsers.length}</span><label>عدد الصفوف<SearchableSelect value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}><option value="10">10</option><option value="20">20</option><option value="50">50</option></SearchableSelect></label><div className="pagination"><button disabled={page===1} onClick={()=>setPage(page-1)}>السابق</button>{pageNumbers.map((number,index)=>number==="…"?<span key={`gap-${index}`}>…</span>:<button type="button" className={page===number?"active":""} key={number} onClick={()=>setPage(Number(number))}>{number}</button>)}<button disabled={page===pages} onClick={()=>setPage(page+1)}>التالي</button></div></div>
        </article>
      </div>
    </section>
  );
}
