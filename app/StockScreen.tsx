"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import SearchableSelect from "./SearchableSelect";
import { apiFetch } from "../lib/api-client";
import { STOCK_WAREHOUSES } from "../lib/stock-warehouses";
import { hashStockWorkbook, parseMedicalStockWorkbook, type StockImportSourceRow } from "../lib/xlsx-stock-import";

type Named = { id: number; name: string; assetType?: string };
type Product = Named & { parentId: number };
type Stock = {
  id: number;
  productId: number | null;
  product: string;
  category: string;
  transactionType: string;
  quantity: number;
  facility: string;
  reference: string;
  notes: string;
  createdAt: string;
};
type Balance = {
  key: string;
  productId: number | null;
  product: string;
  category: string;
  facility: string;
  balance: number;
};

const date = (value: string) =>
  new Date(value + (/(Z|[+-]\d\d:?\d\d)$/.test(value) ? "" : "Z")).toLocaleDateString("ar-PS");
const referenceLabel = (value: string) => value.startsWith("IMPORT:") ? `استيراد ملف المخزون - الصف ${value.split(":").at(-1)}` : value || "—";
const normalizeName = (value: string) => value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
const makePageNumbers = (page: number, pages: number) => {
  const result: (number | string)[] = [];
  for (let number = 1; number <= pages; number++) {
    if (number === 1 || number === pages || Math.abs(number - page) <= 1) result.push(number);
    else if (result[result.length - 1] !== "…") result.push("…");
  }
  return result;
};

async function save(payload: Record<string, unknown>) {
  const response = await apiFetch("/api/stock", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "تعذر حفظ الحركة");
  return data;
}

export default function StockScreen({
  categories,
  products,
}: {
  categories: Named[];
  products: Product[];
}) {
  const [catalogProducts, setCatalogProducts] = useState(products);
  const [rows, setRows] = useState<Stock[]>([]);
  const [message, setMessage] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 0);
  const [activeTab, setActiveTab] = useState<"balances" | "movements" | "import">("balances");

  const [balanceWarehouse, setBalanceWarehouse] = useState("الكل");
  const [balanceSearch, setBalanceSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [movementWarehouse, setMovementWarehouse] = useState("الكل");
  const [movementType, setMovementType] = useState("الكل");
  const [movementSearch, setMovementSearch] = useState("");
  const [movementFrom, setMovementFrom] = useState("");
  const [movementTo, setMovementTo] = useState("");
  const [movementPage, setMovementPage] = useState(1);
  const [movementPageSize, setMovementPageSize] = useState(10);

  const [importRows, setImportRows] = useState<StockImportSourceRow[]>([]);
  const [importHash, setImportHash] = useState("");
  const [importFileName, setImportFileName] = useState("");
  const [importWarehouse, setImportWarehouse] = useState<string>("مستودع المقر العام - الضفة");
  const [importPage, setImportPage] = useState(1);
  const [importMessage, setImportMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const [creatingSourceRow, setCreatingSourceRow] = useState<number | null>(null);
  const [createCategoryByRow, setCreateCategoryByRow] = useState<Record<number, number>>({});
  const [creatingProductRow, setCreatingProductRow] = useState<number | null>(null);

  useEffect(() => {
    apiFetch("/api/stock")
      .then((response) => response.json())
      .then((data) => setRows(data.transactions || []))
      .catch(() => {});
  }, []);

  const balances = useMemo(() => {
    const grouped = rows.reduce<Record<string, Balance>>((result, row) => {
      const productKey = row.productId ?? `${row.category}:${row.product}`;
      const key = `${productKey}|${row.facility}`;
      result[key] ??= {
        key,
        productId: row.productId,
        product: row.product,
        category: row.category,
        facility: row.facility,
        balance: 0,
      };
      result[key].balance += row.transactionType === "وارد" ? row.quantity : -row.quantity;
      return result;
    }, {});
    return Object.values(grouped);
  }, [rows]);

  const filteredBalances = useMemo(
    () => balances.filter((row) =>
      (balanceWarehouse === "الكل" || row.facility === balanceWarehouse) &&
      (!balanceSearch.trim() || `${row.product} ${row.category} ${row.facility}`.toLocaleLowerCase().includes(balanceSearch.trim().toLocaleLowerCase())),
    ),
    [balances, balanceWarehouse, balanceSearch],
  );
  const balancePages = Math.max(1, Math.ceil(filteredBalances.length / pageSize));
  const pageRows = filteredBalances.slice((page - 1) * pageSize, page * pageSize);
  const balancePageNumbers = useMemo(() => makePageNumbers(page, balancePages), [page, balancePages]);
  useEffect(() => setPage(1), [balanceWarehouse, balanceSearch, pageSize]);
  useEffect(() => { if (page > balancePages) setPage(balancePages); }, [page, balancePages]);

  const filteredMovements = useMemo(() => rows.filter((row) => {
    const searchText = `${row.product} ${row.category} ${row.facility} ${row.reference} ${row.notes}`.toLocaleLowerCase();
    const movementDate = row.createdAt ? new Date(row.createdAt).toISOString().slice(0, 10) : "";
    return (movementWarehouse === "الكل" || row.facility === movementWarehouse) &&
      (movementType === "الكل" || row.transactionType === movementType) &&
      (!movementSearch.trim() || searchText.includes(movementSearch.trim().toLocaleLowerCase())) &&
      (!movementFrom || movementDate >= movementFrom) &&
      (!movementTo || movementDate <= movementTo);
  }), [rows, movementWarehouse, movementType, movementSearch, movementFrom, movementTo]);
  const movementPages = Math.max(1, Math.ceil(filteredMovements.length / movementPageSize));
  const pageMovements = filteredMovements.slice((movementPage - 1) * movementPageSize, movementPage * movementPageSize);
  const movementPageNumbers = useMemo(() => makePageNumbers(movementPage, movementPages), [movementPage, movementPages]);
  useEffect(() => setMovementPage(1), [movementWarehouse, movementType, movementSearch, movementFrom, movementTo, movementPageSize]);
  useEffect(() => { if (movementPage > movementPages) setMovementPage(movementPages); }, [movementPage, movementPages]);

  const importPageSize = 10;
  const importPages = Math.max(1, Math.ceil(importRows.length / importPageSize));
  const pageImportRows = importRows.slice((importPage - 1) * importPageSize, importPage * importPageSize);
  const matchedCount = importRows.filter((row) => Boolean(row.productId)).length;
  const unmatchedCount = importRows.length - matchedCount;
  const importPageNumbers = useMemo(() => makePageNumbers(importPage, importPages), [importPage, importPages]);

  const suggestedCategoryId = (row: StockImportSourceRow) =>
    categories.find((category) => normalizeName(category.name) === normalizeName(row.sourceGroup))?.id || 0;

  const readImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    input.value = "";
    setImportMessage("");
    setImportRows([]);
    setImportHash("");
    setImportFileName("");
    try {
      const [parsed, hash] = await Promise.all([
        parseMedicalStockWorkbook(file, catalogProducts.map((product) => ({
          ...product,
          categoryName: categories.find((category) => category.id === product.parentId)?.name || "",
        }))),
        hashStockWorkbook(file),
      ]);
      setImportFileName(file.name);
      setImportRows(parsed);
      setImportHash(hash);
      setImportPage(1);
      setImportMessage(`تمت قراءة ${parsed.length} سجلًا. طابقي الأجهزة الموجودة أو أضيفي التعريفات الناقصة أولًا.`);
      setActiveTab("import");
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "تعذرت قراءة الملف");
      setActiveTab("import");
    }
  };

  const createAndMapProduct = async (row: StockImportSourceRow) => {
    const parentId = createCategoryByRow[row.sourceRow] || suggestedCategoryId(row);
    if (!parentId) {
      setImportMessage(`اختاري تصنيفًا للجهاز «${row.sourceName}» قبل إضافته للتعريفات.`);
      return;
    }
    setCreatingProductRow(row.sourceRow);
    setImportMessage("");
    try {
      const response = await apiFetch("/api/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entity: "product", name: row.sourceName, parentId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذرت إضافة الجهاز إلى التعريفات");
      const product = data.item as Product;
      setCatalogProducts((current) => current.some((item) => item.id === product.id) ? current : [...current, product]);
      setImportRows((current) => current.map((item) => item.sourceRow === row.sourceRow ? { ...item, productId: product.id } : item));
      setCreatingSourceRow(null);
      setImportMessage(data.existing ? `الجهاز «${product.name}» موجود مسبقًا؛ تم ربطه دون إنشاء نسخة أخرى.` : `أُضيف الجهاز «${product.name}» للتعريفات وربط بالملف.`);
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "تعذرت إضافة الجهاز");
    } finally {
      setCreatingProductRow(null);
    }
  };

  const importStock = async () => {
    if (!importHash || !importRows.length || unmatchedCount || importing) return;
    setImporting(true);
    setImportMessage("");
    try {
      const response = await apiFetch("/api/stock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          importHash,
          facility: importWarehouse,
          entries: importRows.map((row) => ({
            sourceRow: row.sourceRow,
            productId: row.productId,
            quantity: row.quantity,
            notes: [row.notes, importWarehouse === "مستودع المقر العام - الضفة" ? "الحالة: بانتظار فتح المعابر لإدخالها إلى غزة." : ""].filter(Boolean).join("\n"),
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر استيراد الملف");
      const refreshed = await apiFetch("/api/stock").then((result) => result.json());
      setRows(refreshed.transactions || []);
      setImportMessage(`تمت إضافة ${data.imported} حركة وارد إلى ${importWarehouse}.`);
      setImportRows([]);
      setImportHash("");
      setImportFileName("");
      setActiveTab("balances");
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "تعذر استيراد الملف");
    } finally {
      setImporting(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      const data = await save({
        productId: Number(values.get("product")),
        categoryId,
        transactionType: values.get("transactionType"),
        quantity: Number(values.get("quantity")),
        facility: values.get("facility"),
        reference: values.get("reference"),
        notes: values.get("notes"),
      });
      setRows((current) => [data.transaction, ...current]);
      setMessage("تم حفظ الحركة وربطها بالجهاز المسجل");
      form.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حفظ الحركة");
    }
  };

  const inbound = rows.filter((row) => row.transactionType === "وارد").reduce((sum, row) => sum + row.quantity, 0);
  const outbound = rows.filter((row) => row.transactionType === "صادر").reduce((sum, row) => sum + row.quantity, 0);
  const stockedItems = new Set(balances.filter((row) => row.balance > 0).map((row) => row.productId ?? `${row.category}:${row.product}`)).size;

  return (
    <section className="operationPage">
      <div className="assetSummary">
        <article><span>أجهزة بأرصدة</span><strong>{stockedItems}</strong></article>
        <article><span>إجمالي الوارد</span><strong>{inbound}</strong></article>
        <article><span>إجمالي الصادر</span><strong>{outbound}</strong></article>
        <article><span>حركات المخزون</span><strong>{rows.length}</strong></article>
      </div>
      <div className="operationGrid">
        <form className="panel operationForm" onSubmit={submit}>
          <div className="panelHead"><div><h2>إضافة حركة مخزون</h2><p>اختاري الجهاز المسجل والمستودع الفعلي</p></div><span className="moveIcon">＋</span></div>
          <div className="opTwo">
            <label>الصنف<SearchableSelect value={categoryId} onChange={(event) => setCategoryId(Number(event.target.value))}>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SearchableSelect></label>
            <label>الجهاز المسجل<SearchableSelect name="product" required>{catalogProducts.filter((item) => item.parentId === categoryId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SearchableSelect></label>
          </div>
          <div className="opTwo">
            <label>نوع الحركة<SearchableSelect name="transactionType"><option>وارد</option><option>صادر</option></SearchableSelect></label>
            <label>الكمية<input name="quantity" type="number" min="1" step="1" required /></label>
          </div>
          <label>المستودع<SearchableSelect name="facility" required>{STOCK_WAREHOUSES.map((name) => <option key={name}>{name}</option>)}</SearchableSelect></label>
          <label>رقم المرجع<input name="reference" placeholder="رقم فاتورة أو محضر استلام" /></label>
          <label>ملاحظات الاستلام<textarea name="notes" placeholder="العلامة التجارية، الطراز، الرقم التسلسلي أو تفاصيل الملحقات. للمقر العام: بانتظار فتح المعابر لإدخالها إلى غزة." /></label>
          {message && <div className="formMessage">{message}</div>}
          <button className="primary">حفظ الحركة</button>
        </form>

        <article className="panel recordsPanel stockRecords">
          <div className="panelHead"><div><h2>المخزون</h2><p>استعراض الأرصدة وحركات الأجهزة وإدخال ملف المقر العام</p></div><span className="resultPill">{activeTab === "balances" ? filteredBalances.length : activeTab === "movements" ? filteredMovements.length : importRows.length} سجل</span></div>
          <div className="stockTabs" role="tablist" aria-label="أقسام المخزون">
            <button type="button" role="tab" aria-selected={activeTab === "balances"} className={activeTab === "balances" ? "active" : ""} onClick={() => setActiveTab("balances")}>أرصدة الأجهزة</button>
            <button type="button" role="tab" aria-selected={activeTab === "movements"} className={activeTab === "movements" ? "active" : ""} onClick={() => setActiveTab("movements")}>حركات المخزون</button>
            <button type="button" role="tab" aria-selected={activeTab === "import"} className={activeTab === "import" ? "active" : ""} onClick={() => setActiveTab("import")}>استيراد ملف Excel{importRows.length > 0 && <b>{unmatchedCount ? unmatchedCount : "✓"}</b>}</button>
          </div>

          {activeTab === "balances" && <div className="stockTabPanel">
            <div className="stockTableTools">
              <label className="stockSearchField"><span>بحث عن جهاز</span><div className="search">⌕<input value={balanceSearch} onChange={(event) => setBalanceSearch(event.target.value)} placeholder="اسم الجهاز أو التصنيف..." /></div></label>
              <label><span>المستودع</span><SearchableSelect value={balanceWarehouse} onChange={(event) => setBalanceWarehouse(event.target.value)}><option>الكل</option>{STOCK_WAREHOUSES.map((name) => <option key={name}>{name}</option>)}</SearchableSelect></label>
            </div>
            <div className="tableWrap stockBalancesWrap"><table className="stockBalancesTable"><thead><tr><th>الجهاز</th><th>الصنف</th><th>المستودع</th><th>الرصيد الحالي</th><th>الحالة</th></tr></thead><tbody>{pageRows.map((row) => <tr key={row.key}><td><strong>{row.product}</strong></td><td>{row.category}</td><td>{row.facility}</td><td><strong className="code">{row.balance}</strong></td><td><span className={`badge ${row.balance > 0 ? "ok" : "repair"}`}>{row.balance > 0 ? "متوفر" : "نفد"}</span></td></tr>)}</tbody></table>{!pageRows.length && <div className="emptyState"><strong>لا توجد أرصدة مطابقة</strong><span>سجّلي حركة وارد أو غيّري الفلاتر.</span></div>}</div>
            <div className="assetFoot stockFoot"><span>عرض {filteredBalances.length ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filteredBalances.length)} من ${filteredBalances.length}` : "0"}</span><label>عدد الصفوف<SearchableSelect value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option value="10">10</option><option value="20">20</option><option value="50">50</option></SearchableSelect></label><div className="pagination"><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>السابق</button>{balancePageNumbers.map((number, index) => number === "…" ? <span key={`balance-gap-${index}`}>…</span> : <button type="button" className={page === number ? "active" : ""} key={number} onClick={() => setPage(Number(number))}>{number}</button>)}<button type="button" disabled={page === balancePages} onClick={() => setPage(page + 1)}>التالي</button></div></div>
          </div>}

          {activeTab === "movements" && <div className="stockTabPanel">
            <div className="stockMovementFilters">
              <label><span>بحث في الحركات</span><div className="search">⌕<input value={movementSearch} onChange={(event) => setMovementSearch(event.target.value)} placeholder="الجهاز، المرجع أو الملاحظات..." /></div></label>
              <label><span>نوع الحركة</span><SearchableSelect value={movementType} onChange={(event) => setMovementType(event.target.value)}><option>الكل</option><option>وارد</option><option>صادر</option></SearchableSelect></label>
              <label><span>المستودع</span><SearchableSelect value={movementWarehouse} onChange={(event) => setMovementWarehouse(event.target.value)}><option>الكل</option>{STOCK_WAREHOUSES.map((name) => <option key={name}>{name}</option>)}</SearchableSelect></label>
              <label><span>من تاريخ</span><input type="date" value={movementFrom} onChange={(event) => setMovementFrom(event.target.value)} /></label>
              <label><span>إلى تاريخ</span><input type="date" value={movementTo} onChange={(event) => setMovementTo(event.target.value)} /></label>
              <button type="button" className="resetStockFilters" onClick={() => { setMovementSearch(""); setMovementType("الكل"); setMovementWarehouse("الكل"); setMovementFrom(""); setMovementTo(""); }}>مسح الفلاتر</button>
            </div>
            <div className="tableWrap stockMovementWrap"><table className="stockMovementTable"><thead><tr><th>الجهاز</th><th>الصنف</th><th>نوع الحركة</th><th>الكمية</th><th>المستودع</th><th>المرجع والملاحظات</th><th>التاريخ</th></tr></thead><tbody>{pageMovements.map((row) => <tr key={row.id}><td><strong>{row.product}</strong></td><td>{row.category}</td><td><span className={`badge ${row.transactionType === "وارد" ? "ok" : "follow"}`}>{row.transactionType}</span></td><td>{row.quantity}</td><td>{row.facility}</td><td>{referenceLabel(row.reference)}{row.notes && <small>{row.notes}</small>}</td><td>{date(row.createdAt)}</td></tr>)}</tbody></table>{!pageMovements.length && <div className="emptyState"><strong>لا توجد حركات مطابقة</strong><span>غيّري الفلاتر أو سجّلي حركة جديدة.</span></div>}</div>
            <div className="assetFoot stockFoot"><span>عرض {filteredMovements.length ? `${(movementPage - 1) * movementPageSize + 1}–${Math.min(movementPage * movementPageSize, filteredMovements.length)} من ${filteredMovements.length}` : "0"}</span><label>عدد الصفوف<SearchableSelect value={movementPageSize} onChange={(event) => setMovementPageSize(Number(event.target.value))}><option value="10">10</option><option value="20">20</option><option value="50">50</option></SearchableSelect></label><div className="pagination"><button type="button" disabled={movementPage === 1} onClick={() => setMovementPage(movementPage - 1)}>السابق</button>{movementPageNumbers.map((number, index) => number === "…" ? <span key={`movement-gap-${index}`}>…</span> : <button type="button" className={movementPage === number ? "active" : ""} key={number} onClick={() => setMovementPage(Number(number))}>{number}</button>)}<button type="button" disabled={movementPage === movementPages} onClick={() => setMovementPage(movementPage + 1)}>التالي</button></div></div>
          </div>}

          {activeTab === "import" && <div className="stockTabPanel stockImportPanel">
            <div className="stockImportControls">
              <label>ملف الأجهزة<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={readImportFile}/></label>
              <label>المستودع المستهدف<SearchableSelect value={importWarehouse} onChange={(event) => setImportWarehouse(event.target.value)}>{STOCK_WAREHOUSES.map((name) => <option key={name}>{name}</option>)}</SearchableSelect></label>
            </div>
            {importFileName && <div className="stockImportSummary"><strong>{importFileName}</strong><span>{importRows.length} سجل</span><span className={unmatchedCount ? "stockImportWarning" : "stockImportReady"}>تمت مطابقة {matchedCount} من {importRows.length} · المتبقي {unmatchedCount}</span></div>}
            {importRows.length > 0 && <>
              <div className="stockMatchProgress"><span style={{ width: `${Math.round(matchedCount / importRows.length * 100)}%` }} /></div>
              <p className="stockImportHint">اربطي الصف بالجهاز الموجود. إذا لم يكن الجهاز مسجلًا، أضيفيه للتعريفات مع اختيار تصنيفه؛ لن ينشأ جهاز مكرر بالاسم والتصنيف نفسيهما.</p>
              <div className="tableWrap stockImportTableWrap"><table className="stockImportTable"><thead><tr><th>صف الملف</th><th>الجهاز في الملف</th><th>المواصفات والمورّد</th><th>الكمية</th><th>مطابقة الجهاز</th></tr></thead><tbody>{pageImportRows.map((row) => <tr key={row.sourceRow}>
                <td>{row.sourceRow}</td>
                <td><strong>{row.sourceName}</strong><small>{row.sourceGroup}</small></td>
                <td>{[row.brand, row.model, row.serial, row.supplier].filter(Boolean).join(" · ") || "—"}</td>
                <td>{row.quantity}{row.unit ? ` ${row.unit}` : ""}</td>
                <td>
                  <SearchableSelect placeholder="ابحثي عن الجهاز المطابق" value={row.productId ?? ""} onChange={(event) => setImportRows((current) => current.map((item) => item.sourceRow === row.sourceRow ? { ...item, productId: Number(event.target.value) || null } : item))}>
                    <option value="">اختر الجهاز المطابق</option>{catalogProducts.map((product) => <option key={product.id} value={product.id}>{categories.find((category) => category.id === product.parentId)?.name} — {product.name}</option>)}
                  </SearchableSelect>
                  {!row.productId && <div className="stockCreateMissing">
                    {creatingSourceRow !== row.sourceRow && <button type="button" onClick={() => { setCreatingSourceRow(creatingSourceRow === row.sourceRow ? null : row.sourceRow); setCreateCategoryByRow((current) => ({ ...current, [row.sourceRow]: current[row.sourceRow] || suggestedCategoryId(row) })); }}>الجهاز غير موجود؟ أضيفيه للتعريفات</button>}
                    {creatingSourceRow === row.sourceRow && <>
                      <SearchableSelect placeholder="اختاري تصنيف الجهاز" value={createCategoryByRow[row.sourceRow] || suggestedCategoryId(row) || ""} onChange={(event) => setCreateCategoryByRow((current) => ({ ...current, [row.sourceRow]: Number(event.target.value) }))}>
                        <option value="">اختاري التصنيف</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                      </SearchableSelect>
                      <button type="button" disabled={creatingProductRow === row.sourceRow || !(createCategoryByRow[row.sourceRow] || suggestedCategoryId(row))} onClick={() => createAndMapProduct(row)}>{creatingProductRow === row.sourceRow ? "جارٍ الإضافة..." : "أضيفيه واربطِيه"}</button>
                    </>}
                  </div>}
                </td>
              </tr>)}</tbody></table></div>
              <div className="assetFoot stockImportFoot"><span>عرض {(importPage - 1) * importPageSize + 1}–{Math.min(importPage * importPageSize, importRows.length)} من {importRows.length}</span><div className="pagination"><button type="button" disabled={importPage === 1} onClick={() => setImportPage(importPage - 1)}>السابق</button>{importPageNumbers.map((number, index) => number === "…" ? <span key={`import-gap-${index}`}>…</span> : <button type="button" className={importPage === number ? "active" : ""} key={number} onClick={() => setImportPage(Number(number))}>{number}</button>)}<button type="button" disabled={importPage === importPages} onClick={() => setImportPage(importPage + 1)}>التالي</button></div></div>
            </>}
            {importMessage && <div className="formMessage">{importMessage}</div>}
            {importRows.length > 0 && <div className="stockImportSubmit">
              <span>{unmatchedCount ? `أكملي مطابقة ${unmatchedCount} جهاز قبل الإضافة.` : `اكتملت مطابقة الأجهزة الـ${matchedCount}; أصبحت جاهزة للإضافة إلى ${importWarehouse}.`}</span>
              <button type="button" className="primary" disabled={importing || unmatchedCount > 0} onClick={importStock}>{importing ? "جاري إضافة الأجهزة..." : `إضافة ${importRows.length} جهازًا إلى المخزون`}</button>
            </div>}
          </div>}
        </article>
      </div>
    </section>
  );
}
