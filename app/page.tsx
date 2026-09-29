"use client";
import SearchableSelect from "./SearchableSelect";
import { FormEvent, useEffect, useMemo, useState } from "react";
import AssetsScreen from "./AssetsScreen";
import DeliveryTransferScreen from "./DeliveryTransferScreen";
import PlanningScreen from "./PlanningScreen";
import {
  InventoryScreen,
  MaintenanceScreen,
  ReportsScreen,
  StockScreen,
} from "./OperationsScreens";
import SetupManager from "./SetupManager";
import UsersScreen from "./UsersScreen";
import { apiFetch, supabase } from "../lib/supabase-client";

type Named = {
  id: number;
  name: string;
  usefulLifeYears?: number;
  assetType?: string;
};
type Child = Named & { parentId: number };
type Asset = {
  id: number;
  code: string;
  product: string;
  category: string;
  assetType?: string;
  facility: string;
  department: string;
  responsible: string;
  status: string;
  condition: string;
  serial: string;
  createdAt?: string;
};
type CurrentUser = {
  id: number;
  email: string;
  fullName: string;
  role: string;
  assetScope: "الكل" | "تقني" | "طبي";
  permissions: string[];
};

const initialFacilities: Named[] = [
  { id: 1, name: "مستشفى القدس الميداني" },
  { id: 2, name: "مبنى الأمل الإداري" },
  { id: 3, name: "المخازن المركزية" },
  { id: 4, name: "مستشفى السرايا" },
  { id: 5, name: "فرع دير البلح" },
];
const initialDepartments: Child[] = [
  { id: 1, name: "قسم الاستقبال", parentId: 1 },
  { id: 2, name: "قسم تكنولوجيا المعلومات", parentId: 2 },
  { id: 3, name: "غرفة السيرفر", parentId: 2 },
  { id: 4, name: "إدارة المخازن", parentId: 3 },
  { id: 5, name: "شبكة المستشفى", parentId: 4 },
  { id: 6, name: "الأمن والحماية", parentId: 5 },
];
const initialCategories: Named[] = [
  { id: 1, name: "أجهزة حاسوب" },
  { id: 2, name: "أجهزة لابتوب" },
  { id: 3, name: "سويتشات" },
  { id: 4, name: "وحدات UniFi" },
  { id: 5, name: "UPS وطاقة" },
  { id: 6, name: "كاميرات ومراقبة" },
];
const initialProducts: Child[] = [
  { id: 1, name: "HP ProDesk 600 G6", parentId: 1 },
  { id: 2, name: "Dell Latitude 5420", parentId: 2 },
  { id: 3, name: "Cisco Catalyst 9200", parentId: 3 },
  { id: 4, name: "UniFi UAP-AC-LITE", parentId: 4 },
  { id: 5, name: "APC Smart-UPS 1500", parentId: 5 },
  { id: 6, name: "Hikvision DS-7632NI", parentId: 6 },
];
const initialAssets: Asset[] = [];

const nav = [
  "نظرة عامة",
  "الأصول والعهد",
  "التخطيط والاحتياج",
  "التسليم والنقل",
  "الصيانة",
  "الجرد",
  "المخزون",
  "التقارير",
  "التعريفات الأساسية",
  "المستخدمون والصلاحيات",
];
const icons = ["⌂", "▣", "◫", "⇄", "⚙", "⌖", "▤", "▥", "⚒", "♙"];
const navPermissions: Record<string, string> = {
  "نظرة عامة": "dashboard",
  "الأصول والعهد": "assets",
  "التخطيط والاحتياج": "planning",
  "التسليم والنقل": "movements",
  الصيانة: "maintenance",
  الجرد: "inventory",
  المخزون: "stock",
  التقارير: "reports",
  "التعريفات الأساسية": "setup",
  "المستخدمون والصلاحيات": "users",
};

export default function Home() {
  const [active, setActive] = useState("نظرة عامة"),
    [assets, setAssets] = useState(initialAssets),
    [facilities, setFacilities] = useState(initialFacilities),
    [departments, setDepartments] = useState(initialDepartments),
    [categories, setCategories] = useState(initialCategories),
    [products, setProducts] = useState(initialProducts),
    [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("الكل"),
    [setupTab, setSetupTab] = useState("المرافق والأقسام"),
    [selectedFacility, setSelectedFacility] = useState(1),
    [selectedCategory, setSelectedCategory] = useState(1),
    [selectedAssetType, setSelectedAssetType] = useState("تقني");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null),
    [authReady, setAuthReady] = useState(false),
    [notificationsOpen, setNotificationsOpen] = useState(false),
    [notificationsRead, setNotificationsRead] = useState(false);
  useEffect(() => {
    apiFetch("/api/auth/me")
      .then(async (r) => {
        const d = await r.json();
        if (r.ok) setCurrentUser(d.user);
      })
      .finally(() => setAuthReady(true));
  }, []);
  useEffect(() => {
    Promise.all([
      apiFetch("/api/setup").then((r) => (r.ok ? r.json() : null)),
      apiFetch("/api/assets").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([d, a]) => {
        if (d) {
          setFacilities(d.facilities);
          setDepartments(d.departments);
          setCategories(d.categories);
          setProducts(d.products);
          if (d.facilities[0]) setSelectedFacility(d.facilities[0].id);
          if (d.categories[0]) setSelectedCategory(d.categories[0].id);
        }
        if (a?.assets) setAssets(a.assets);
      })
      .catch(() => {});
  }, []);
  const filtered = useMemo(
    () =>
      assets.filter(
        (a) =>
          (filter === "الكل" || a.category === filter) &&
          Object.values(a)
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [assets, query, filter],
  );
  const notifications = useMemo(
    () =>
      assets
        .filter((a) => a.status !== "يعمل")
        .map((a) => ({
          id: a.id,
          title:
            a.status === "قيد الصيانة"
              ? "عهدة قيد الصيانة"
              : "عهدة بحاجة إلى متابعة",
          body: `${a.product} — ${a.facility}`,
          meta: a.code,
          kind: a.status === "قيد الصيانة" ? "repair" : "follow",
        })),
    [assets],
  );
  const saveSetup = (
    entity: string,
    name: string,
    parentId?: number,
    usefulLifeYears?: number,
    assetType?: string,
  ) =>
    apiFetch("/api/setup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        entity,
        name,
        parentId,
        usefulLifeYears,
        assetType,
      }),
    }).then(async (r) => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "تعذر الحفظ");
      return d.item;
    });
  const addNamed = async (
    e: FormEvent<HTMLFormElement>,
    kind: "facility" | "category",
  ) => {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form),
      name = String(f.get("name")).trim(),
      usefulLifeYears =
        kind === "category" ? Number(f.get("usefulLifeYears")) : undefined,
      assetType =
        kind === "category" ? String(f.get("assetType") || "تقني") : undefined;
    if (!name) return;
    const item = await saveSetup(
      kind,
      name,
      undefined,
      usefulLifeYears,
      assetType,
    );
    kind === "facility"
      ? setFacilities((v) => [...v, item])
      : setCategories((v) => [...v, item]);
    form.reset();
  };
  const addChild = async (
    e: FormEvent<HTMLFormElement>,
    kind: "department" | "product",
  ) => {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form),
      name = String(f.get("name")).trim(),
      parentId = Number(f.get("parentId"));
    if (!name || !parentId) return;
    const item = await saveSetup(kind, name, parentId);
    kind === "department"
      ? setDepartments((v) => [...v, item])
      : setProducts((v) => [...v, item]);
    form.reset();
  };
  const addAsset = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      facilityId = Number(f.get("facility")),
      categoryId = Number(f.get("category")),
      departmentId = Number(f.get("department")),
      productId = Number(f.get("product")),
      assetType =
        categories.find((x) => x.id === categoryId)?.assetType ||
        selectedAssetType;
    const payload = {
      code: `${assetType === "طبي" ? "MED" : "IT"}-${String(Date.now()).slice(-6)}`,
      product: products.find((x) => x.id === productId)?.name || "",
      category: categories.find((x) => x.id === categoryId)?.name || "",
      assetType,
      facility: facilities.find((x) => x.id === facilityId)?.name || "",
      department: departments.find((x) => x.id === departmentId)?.name || "",
      responsible: String(f.get("responsible")),
      status: String(f.get("status")),
      condition: String(f.get("condition")),
      serial: String(f.get("serial")),
    };
    const r = await apiFetch("/api/assets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "تعذر حفظ العهدة");
    setAssets((v) => [d.asset, ...v]);
    setOpen(false);
  };
  if (!authReady)
    return (
      <div className="authState">
        <div className="brandMark">IT</div>
        <strong>جاري التحقق من صلاحية الدخول...</strong>
      </div>
    );
  if (!currentUser) {
    location.replace("/login");
    return (
      <div className="authState">
        <strong>جاري تحويلك إلى تسجيل الدخول...</strong>
      </div>
    );
  }
  const allowed = (permission: string) =>
    currentUser.role.includes("مدير النظام") ||
    currentUser.role.includes("مدير نظام") ||
    currentUser.permissions.includes(permission);
  return (
    <main
      className="app"
      onClick={() => notificationsOpen && setNotificationsOpen(false)}
    >
      <aside className="sidebar">
        <div className="brand">
          <img
            className="brandLogo"
            src="/prcs-logo-original.png"
            alt="شعار جمعية الهلال الأحمر الفلسطيني"
          />
          <div>
            <strong>إدارة العهد التقنية</strong>
            <span>قسم تكنولوجيا المعلومات</span>
          </div>
        </div>
        <nav>
          {nav
            .map((n, i) => ({ n, i }))
            .filter((x) => allowed(navPermissions[x.n]))
            .map(({ n, i }) => (
              <button
                key={n}
                className={active === n ? "active" : ""}
                onClick={() => setActive(n)}
              >
                <i>{icons[i]}</i>
                {n}
                {n === "الصيانة" && notifications.length > 0 && (
                  <b>{notifications.length}</b>
                )}
              </button>
            ))}
        </nav>
        <div className="sidebarBottom">
          <div className="userAvatar">{currentUser.fullName.charAt(0)}</div>
          <div>
            <strong>{currentUser.fullName}</strong>
            <span>{currentUser.role}</span>
          </div>
          <button
            className="logoutLink"
            onClick={async () => {
              await supabase.auth.signOut();
              location.replace("/login");
            }}
            title="تسجيل الخروج"
          >
            ↪
          </button>
        </div>
      </aside>
      <section className="content">
        <header>
          <div>
            <h1>{active}</h1>
            <p>
              {active === "التعريفات الأساسية"
                ? "إدارة المرافق والأقسام وأصناف الأصول والأجهزة"
                : active === "المستخدمون والصلاحيات"
                  ? "إدارة حسابات المستخدمين وأدوار الوصول"
                  : "متابعة الأصول التقنية وحركتها في جميع المواقع"}
            </p>
          </div>
          <div className="headerActions">
            <div
              className="notificationWrap"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="iconBtn notificationButton"
                aria-label="الإشعارات"
                aria-expanded={notificationsOpen}
                onClick={() => {
                  setNotificationsOpen((v) => !v);
                  setNotificationsRead(true);
                }}
              >
                ♢
                {notifications.length > 0 && !notificationsRead && (
                  <em>{notifications.length}</em>
                )}
              </button>
              {notificationsOpen && (
                <div className="notificationPanel">
                  <div className="notificationHead">
                    <div>
                      <strong>الإشعارات</strong>
                      <span>{notifications.length} تنبيهات تحتاج انتباهك</span>
                    </div>
                    {notifications.length > 0 && (
                      <button onClick={() => setNotificationsRead(true)}>
                        تحديد كمقروء
                      </button>
                    )}
                  </div>
                  <div className="notificationList">
                    {notifications.length === 0 ? (
                      <p className="notificationEmpty">
                        لا توجد تنبيهات حالياً
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => {
                            setActive(
                              n.kind === "repair" ? "الصيانة" : "الأصول والعهد",
                            );
                            setNotificationsOpen(false);
                          }}
                        >
                          <i className={n.kind}>
                            {n.kind === "repair" ? "⚙" : "!"}
                          </i>
                          <span>
                            <strong>{n.title}</strong>
                            <small>{n.body}</small>
                            <b>{n.meta}</b>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {allowed("assets") && (
              <button className="primary" onClick={() => setOpen(true)}>
                ＋ إضافة عهدة جديدة
              </button>
            )}
          </div>
        </header>
        {active === "نظرة عامة" && (
          <Dashboard
            assets={assets}
            filtered={filtered}
            query={query}
            setQuery={setQuery}
            filter={filter}
            setFilter={setFilter}
            categories={categories}
          />
        )}
        {active === "الأصول والعهد" && (
          <AssetsScreen
            assets={assets}
            facilities={facilities}
            departments={departments}
            isSystemAdmin={
              currentUser.role.includes("مدير النظام") ||
              currentUser.role.includes("مدير نظام")
            }
            onDeleted={(id) => setAssets((v) => v.filter((a) => a.id !== id))}
          />
        )}
        {active === "التخطيط والاحتياج" && allowed("planning") && (
          <PlanningScreen
            facilities={facilities}
            departments={departments}
            categories={categories}
            products={products}
          />
        )}
        {active === "التسليم والنقل" && (
          <DeliveryTransferScreen
            assets={assets}
            facilities={facilities}
            departments={departments}
            onAssetUpdated={(updated) =>
              setAssets((v) =>
                v.map((a) => (a.id === updated.id ? updated : a)),
              )
            }
          />
        )}
        {active === "الصيانة" && (
          <MaintenanceScreen
            assets={assets}
            onStatus={(id, status) =>
              setAssets((v) =>
                v.map((a) => (a.id === id ? { ...a, status } : a)),
              )
            }
          />
        )}
        {active === "الجرد" && (
          <InventoryScreen assets={assets} facilities={facilities} />
        )}
        {active === "المخزون" && (
          <StockScreen
            facilities={facilities}
            categories={categories}
            products={products}
          />
        )}
        {active === "التقارير" && (
          <ReportsScreen
            assets={assets}
            facilities={facilities}
            categories={categories}
          />
        )}
        {active === "التعريفات الأساسية" && (
          <SetupManager
            tab={setupTab}
            setTab={setSetupTab}
            facilities={facilities}
            departments={departments}
            categories={categories}
            products={products}
            addNamed={addNamed}
            addChild={addChild}
            onImported={(nextCategories, nextProducts) => {
              setCategories(nextCategories);
              setProducts(nextProducts);
            }}
            onUpdate={(entity, item) => {
              if (entity === "facility")
                setFacilities((v) =>
                  v.map((x) => (x.id === item.id ? (item as Named) : x)),
                );
              if (entity === "category")
                setCategories((v) =>
                  v.map((x) => (x.id === item.id ? (item as Named) : x)),
                );
              if (entity === "department")
                setDepartments((v) =>
                  v.map((x) => (x.id === item.id ? (item as Child) : x)),
                );
              if (entity === "product")
                setProducts((v) =>
                  v.map((x) => (x.id === item.id ? (item as Child) : x)),
                );
            }}
            onDelete={(entity, id) => {
              if (entity === "facility")
                setFacilities((v) => v.filter((x) => x.id !== id));
              if (entity === "category")
                setCategories((v) => v.filter((x) => x.id !== id));
              if (entity === "department")
                setDepartments((v) => v.filter((x) => x.id !== id));
              if (entity === "product")
                setProducts((v) => v.filter((x) => x.id !== id));
            }}
          />
        )}
        {active === "المستخدمون والصلاحيات" && allowed("users") && (
          <UsersScreen currentUser={currentUser} />
        )}
      </section>
      {open && (
        <div className="overlay" onMouseDown={() => setOpen(false)}>
          <form
            className="modal"
            onSubmit={addAsset}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="modalHead">
              <div>
                <h2>إضافة عهدة جديدة</h2>
                <p>اختر بيانات الأصل من التعريفات المسجلة</p>
              </div>
              <button type="button" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>
            <div className="formGrid">
              <label>
                المرفق
                <SearchableSelect
                  name="facility"
                  value={selectedFacility}
                  onChange={(e) => setSelectedFacility(Number(e.target.value))}
                >
                  {facilities.map((x) => (
                    <option value={x.id} key={x.id}>
                      {x.name}
                    </option>
                  ))}
                </SearchableSelect>
              </label>
              <label>
                القسم
                <SearchableSelect name="department">
                  {departments
                    .filter((x) => x.parentId === selectedFacility)
                    .map((x) => (
                      <option value={x.id} key={x.id}>
                        {x.name}
                      </option>
                    ))}
                </SearchableSelect>
              </label>
              <label className="fullField">
                الشخص المسؤول عن العهدة
                <input
                  name="responsible"
                  required
                  placeholder="اكتب اسم الموظف المسؤول"
                />
              </label>
              <label>
                صنف الأصل
                <SearchableSelect
                  name="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(Number(e.target.value))}
                >
                  {categories.map((x) => (
                    <option value={x.id} key={x.id}>
                      {x.name}
                    </option>
                  ))}
                </SearchableSelect>
              </label>
              <label>
                الجهاز
                <SearchableSelect name="product">
                  {products
                    .filter((x) => x.parentId === selectedCategory)
                    .map((x) => (
                      <option value={x.id} key={x.id}>
                        {x.name}
                      </option>
                    ))}
                </SearchableSelect>
              </label>
              <label>
                الرقم التسلسلي
                <input name="serial" required placeholder="Serial Number" />
              </label>
              <label>
                حالة العهدة
                <SearchableSelect name="condition">
                  <option>جديد</option>
                  <option>مستخدم</option>
                </SearchableSelect>
              </label>
              <label>
                حالة التشغيل
                <SearchableSelect name="status">
                  <option>يعمل</option>
                  <option>بحاجة متابعة</option>
                  <option>قيد الصيانة</option>
                </SearchableSelect>
              </label>
            </div>
            <div className="modalActions">
              <button type="button" onClick={() => setOpen(false)}>
                إلغاء
              </button>
              <button className="primary" type="submit">
                حفظ العهدة
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function Dashboard({
  assets,
  filtered,
  query,
  setQuery,
  filter,
  setFilter,
  categories,
}: {
  assets: Asset[];
  filtered: Asset[];
  query: string;
  setQuery: (x: string) => void;
  filter: string;
  setFilter: (x: string) => void;
  categories: Named[];
}) {
  const [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(10);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => setPage(1), [query, filter, pageSize]);
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);
  const pageNumbers = useMemo(() => {
    const values: (number | string)[] = [];
    for (let number = 1; number <= pages; number++) {
      if (number === 1 || number === pages || Math.abs(number - page) <= 1)
        values.push(number);
      else if (values[values.length - 1] !== "…") values.push("…");
    }
    return values;
  }, [page, pages]);
  const startItem = filtered.length ? (page - 1) * pageSize + 1 : 0,
    endItem = Math.min(page * pageSize, filtered.length);
  return (
    <>
      <section className="stats">
        <article>
          <div className="statIcon red">▣</div>
          <div>
            <span>إجمالي الأصول</span>
            <strong>{assets.length}</strong>
            <small>في عدة مرافق</small>
          </div>
        </article>
        <article>
          <div className="statIcon green">✓</div>
          <div>
            <span>أجهزة تعمل</span>
            <strong>{assets.filter((x) => x.status === "يعمل").length}</strong>
            <small className="up">حالة تشغيلية</small>
          </div>
        </article>
        <article>
          <div className="statIcon amber">⚙</div>
          <div>
            <span>قيد الصيانة</span>
            <strong>
              {assets.filter((x) => x.status === "قيد الصيانة").length}
            </strong>
            <small>تحتاج متابعة</small>
          </div>
        </article>
        <article>
          <div className="statIcon blue">⌂</div>
          <div>
            <span>المرافق</span>
            <strong>5</strong>
            <small>مواقع مسجلة</small>
          </div>
        </article>
      </section>
      <section className="gridTop">
        <article className="panel wide">
          <div className="panelHead">
            <div>
              <h2>توزيع الأصول حسب التصنيف</h2>
              <p>التصنيفات المستخدمة حالياً</p>
            </div>
          </div>
          <div className="bars">
            {categories.slice(0, 5).map((x, i) => (
              <div className="barRow" key={x.id}>
                <span>{x.name}</span>
                <div>
                  <i
                    style={{ width: `${Math.max(12, 88 - i * 14)}%` }}
                    className={`c${i}`}
                  />
                </div>
                <b>{assets.filter((a) => a.category === x.name).length}</b>
              </div>
            ))}
          </div>
        </article>
        <article className="panel setupSummary">
          <div className="panelHead">
            <div>
              <h2>هيكل التعريفات</h2>
              <p>جاهزية البيانات</p>
            </div>
          </div>
          <div className="summaryNumber">4</div>
          <p>مجموعات مترابطة</p>
          <ul className="legend">
            <li>
              <i className="lg greenBg" />
              مرافق وأقسام
            </li>
            <li>
              <i className="lg redBg" />
              أصناف وأجهزة
            </li>
          </ul>
        </article>
      </section>
      <section className="panel assetsPanel">
        <div className="panelHead assetsHead">
          <div>
            <h2>الأصول والعهد</h2>
            <p>آخر الأجهزة المسجلة والمحدّثة</p>
          </div>
          <div className="tools">
            <div className="search">
              ⌕
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث بالرقم أو الاسم أو الموقع..."
              />
            </div>
            <SearchableSelect
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option>الكل</option>
              {categories.map((c) => (
                <option key={c.id}>{c.name}</option>
              ))}
            </SearchableSelect>
          </div>
        </div>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>رقم العهدة</th>
                <th>الجهاز</th>
                <th>الصنف</th>
                <th>المرفق</th>
                <th>القسم</th>
                <th>الشخص المسؤول</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong className="code">{a.code}</strong>
                    <small>{a.serial}</small>
                  </td>
                  <td>
                    <strong>{a.product}</strong>
                  </td>
                  <td>{a.category}</td>
                  <td>{a.facility}</td>
                  <td>{a.department}</td>
                  <td>
                    <strong>{a.responsible}</strong>
                  </td>
                  <td>
                    <span
                      className={`badge ${a.status === "يعمل" ? "ok" : a.status === "قيد الصيانة" ? "repair" : "follow"}`}
                    >
                      ● {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!pageItems.length && (
            <div className="dashboardEmpty">
              لا توجد أجهزة مطابقة للبحث أو التصفية
            </div>
          )}
        </div>
        <div className="dashboardPager">
          <span>
            عرض {startItem}–{endItem} من {filtered.length} جهاز
          </span>
          <label>
            عدد الأجهزة في الصفحة
            <SearchableSelect
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </SearchableSelect>
          </label>
          <div className="pageNumberButtons">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              السابق
            </button>
            {pageNumbers.map((item, index) =>
              item === "…" ? (
                <span key={`gap-${index}`}>…</span>
              ) : (
                <button
                  type="button"
                  key={item}
                  className={page === item ? "active" : ""}
                  onClick={() => setPage(Number(item))}
                >
                  {item}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={page === pages}
              onClick={() => setPage(page + 1)}
            >
              التالي
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

function Setup({
  tab,
  setTab,
  facilities,
  departments,
  categories,
  products,
  addNamed,
  addChild,
}: {
  tab: string;
  setTab: (x: string) => void;
  facilities: Named[];
  departments: Child[];
  categories: Named[];
  products: Child[];
  addNamed: (e: FormEvent<HTMLFormElement>, k: "facility" | "category") => void;
  addChild: (
    e: FormEvent<HTMLFormElement>,
    k: "department" | "product",
  ) => void;
}) {
  const isFacilities = tab === "المرافق والأقسام";
  return (
    <section className="setupPage">
      <div className="setupTabs">
        <button
          className={isFacilities ? "active" : ""}
          onClick={() => setTab("المرافق والأقسام")}
        >
          ⌂ المرافق والأقسام
        </button>
        <button
          className={!isFacilities ? "active" : ""}
          onClick={() => setTab("الأصناف والأجهزة")}
        >
          ▣ الأصناف والأجهزة
        </button>
      </div>
      <div className="setupGrid">
        <article className="panel masterPanel">
          <div className="panelHead">
            <div>
              <h2>{isFacilities ? "المرافق" : "أصناف الأصول"}</h2>
              <p>
                {isFacilities
                  ? "المستشفيات والمراكز والمباني"
                  : "التصنيف الرئيسي للأصول"}
              </p>
            </div>
            <span className="countBadge">
              {isFacilities ? facilities.length : categories.length}
            </span>
          </div>
          <form
            className="quickAdd"
            onSubmit={(e) =>
              addNamed(e, isFacilities ? "facility" : "category")
            }
          >
            <input
              name="name"
              required
              placeholder={
                isFacilities ? "اسم المرفق الجديد" : "اسم الصنف الجديد"
              }
            />
            <button className="primary">＋ إضافة</button>
          </form>
          <div className="masterList">
            {(isFacilities ? facilities : categories).map((x) => (
              <div key={x.id}>
                <span className="listIcon">{isFacilities ? "⌂" : "▣"}</span>
                <strong>{x.name}</strong>
                <small>
                  {isFacilities
                    ? departments.filter((d) => d.parentId === x.id).length
                    : products.filter((p) => p.parentId === x.id).length}{" "}
                  {isFacilities ? "أقسام" : "أجهزة"}
                </small>
                <button>•••</button>
              </div>
            ))}
          </div>
        </article>
        <article className="panel childPanel">
          <div className="panelHead">
            <div>
              <h2>{isFacilities ? "الأقسام التابعة" : "الأجهزة التابعة"}</h2>
              <p>
                {isFacilities
                  ? "اربط كل قسم بالمرفق الصحيح"
                  : "اربط كل جهاز بصنف الأصل الصحيح"}
              </p>
            </div>
            <span className="countBadge">
              {isFacilities ? departments.length : products.length}
            </span>
          </div>
          <form
            className="quickAdd childForm"
            onSubmit={(e) =>
              addChild(e, isFacilities ? "department" : "product")
            }
          >
            <SearchableSelect name="parentId">
              {(isFacilities ? facilities : categories).map((x) => (
                <option value={x.id} key={x.id}>
                  {x.name}
                </option>
              ))}
            </SearchableSelect>
            <input
              name="name"
              required
              placeholder={
                isFacilities ? "اسم القسم الجديد" : "اسم الجهاز أو الموديل"
              }
            />
            <button className="primary">＋ إضافة</button>
          </form>
          <div className="childTable">
            <div className="childRow head">
              <span>{isFacilities ? "القسم" : "الجهاز"}</span>
              <span>{isFacilities ? "المرفق" : "الصنف"}</span>
              <span>الحالة</span>
            </div>
            {(isFacilities ? departments : products).map((x) => (
              <div className="childRow" key={x.id}>
                <strong>{x.name}</strong>
                <span>
                  {
                    (isFacilities ? facilities : categories).find(
                      (p) => p.id === x.parentId,
                    )?.name
                  }
                </span>
                <span className="badge ok">● فعّال</span>
              </div>
            ))}
          </div>
        </article>
      </div>
      <div className="relationHint">
        <strong>ترابط البيانات</strong>
        <span>
          {isFacilities
            ? "عند اختيار المرفق في بطاقة العهدة ستظهر الأقسام التابعة له فقط."
            : "عند اختيار صنف الأصل في بطاقة العهدة ستظهر الأجهزة التابعة له فقط."}
        </span>
      </div>
    </section>
  );
}
