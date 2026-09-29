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
  const [rows, setRows] = useState<Stock[]>([]);
  const [message, setMessage] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 0);
  const [warehouse, setWarehouse] = useState("الكل");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [importRows, setImportRows] = useState<StockImportSourceRow[]>([]);
  const [importHash, setImportHash] = useState("");
  const [importFileName, setImportFileName] = useState("");
  const [importWarehouse, setImportWarehouse] = useState<string>("مستودع المقر العام - الضفة");
  const [importPage, setImportPage] = useState(1);
  const [importMessage, setImportMessage] = useState("");
  const [importing, setImporting] = useState(false);

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

  const filtered = useMemo(
    () => balances.filter((row) =>
      (warehouse === "الكل" || row.facility === warehouse) &&
      (!search.trim() || `${row.product} ${row.category} ${row.facility}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())),
    ),
    [balances, warehouse, search],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const pageNumbers = useMemo(() => {
    const result: (number | string)[] = [];
    for (let number = 1; number <= pages; number++) {
      if (number === 1 || number === pages || Math.abs(number - page) <= 1) result.push(number);
      else if (result[result.length - 1] !== "…") result.push("…");
    }
    return result;
  }, [page, pages]);
  useEffect(() => setPage(1), [warehouse, search, pageSize]);
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);

  const importPageSize = 10;
  const importPages = Math.max(1, Math.ceil(importRows.length / importPageSize));
  const pageImportRows = importRows.slice((importPage - 1) * importPageSize, importPage * importPageSize);
  const unmatchedCount = importRows.filter((row) => !row.productId).length;
  const importPageNumbers = useMemo(() => {
    const result: (number | string)[] = [];
    for (let number = 1; number <= importPages; number++) {
      if (number === 1 || number === importPages || Math.abs(number - importPage) <= 1) result.push(number);
      else if (result[result.length - 1] !== "…") result.push("…");
    }
    return result;
  }, [importPage, importPages]);

  const readImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    input.value = "";
    setImportMessage("");
    setImportRows([]);
    setImportHash("");
    try {
      const [parsed, hash] = await Promise.all([
        parseMedicalStockWorkbook(file, products.map((product) => ({ ...product, categoryName: categories.find((category) => category.id === product.parentId)?.name || "" }))),
        hashStockWorkbook(file),
      ]);
      setImportFileName(file.name);
      setImportRows(parsed);
      setImportHash(hash);
      setImportPage(1);
      setImportMessage(`تمت قراءة ${parsed.length} سجلًا. راجعي مطابقة كل جهاز مع تعريفه الموجود.`);
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "تعذرت قراءة الملف");
    }
  };

  const importStock = async () => {
    if (!importHash || !importRows.length || unmatchedCount) return;
    setImporting(true);
    setImportMessage("");
    try {
      const response = await apiFetch("/api/stock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          importHash,
          facility: importWarehouse,
          entries: importRows.map((row) => ({ sourceRow: row.sourceRow, productId: row.productId, quantity: row.quantity, notes: [row.notes, importWarehouse === "مستودع المقر العام - الضفة" ? "الحالة: بانتظار فتح المعابر لإدخالها إلى غزة." : ""].filter(Boolean).join("\n") })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر استيراد الملف");
      const refreshed = await apiFetch("/api/stock").then((result) => result.json());
      setRows(refreshed.transactions || []);
      setImportMessage(`تم إدخال ${data.imported} حركة وارد إلى ${importWarehouse}.`);
      setImportRows([]);
      setImportHash("");
      setImportFileName("");
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
            <label>الجهاز المسجل<SearchableSelect name="product" required>{products.filter((item) => item.parentId === categoryId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SearchableSelect></label>
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
          <div className="panelHead"><div><h2>أرصدة الأجهزة حسب المستودع</h2><p>كل رصيد مرتبط باسم الجهاز وتصنيفه المسجلين</p></div><span className="resultPill">{filtered.length} رصيد</span></div>
          <details className="stockImport">
            <summary>استيراد الأجهزة والكميات من ملف Excel</summary>
            <div className="stockImportBody">
              <p>تُطابق الأجهزة مع التعريفات المسجلة فقط. الاستيراد لا ينشئ أسماء جديدة، ويحتفظ بالعلامة والطراز والأرقام التسلسلية والمورّد ضمن ملاحظات حركة المخزون.</p>
              <div className="stockImportControls">
                <label>ملف الأجهزة<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={readImportFile}/></label>
                <label>المستودع<SearchableSelect value={importWarehouse} onChange={(event) => setImportWarehouse(event.target.value)}>{STOCK_WAREHOUSES.map((name) => <option key={name}>{name}</option>)}</SearchableSelect></label>
              </div>
              {importFileName && <div className="stockImportSummary"><strong>{importFileName}</strong><span>{importRows.length} سجل</span><span className={unmatchedCount ? "stockImportWarning" : "stockImportReady"}>{unmatchedCount ? `${unmatchedCount} جهاز يحتاج مطابقة` : "كل الأجهزة مطابقة"}</span></div>}
              {importRows.length > 0 && <>
                <div className="tableWrap stockImportTableWrap"><table className="stockImportTable"><thead><tr><th>صف الملف</th><th>اسم الجهاز في الملف</th><th>العلامة والطراز والرقم التسلسلي</th><th>الكمية</th><th>الجهاز المسجل في النظام</th></tr></thead><tbody>{pageImportRows.map((row) => <tr key={row.sourceRow}><td>{row.sourceRow}</td><td><strong>{row.sourceName}</strong><small>{row.sourceGroup}{row.supplier ? ` · المورّد: ${row.supplier}` : ""}</small></td><td>{[row.brand, row.model, row.serial].filter(Boolean).join(" · ") || "—"}</td><td>{row.quantity}{row.unit ? ` ${row.unit}` : ""}</td><td><SearchableSelect placeholder="اختر الجهاز المطابق" value={row.productId ?? ""} onChange={(event) => setImportRows((current) => current.map((item) => item.sourceRow === row.sourceRow ? { ...item, productId: Number(event.target.value) || null } : item))}><option value="">اختر الجهاز المطابق</option>{products.map((product) => <option key={product.id} value={product.id}>{categories.find((category) => category.id === product.parentId)?.name} — {product.name}</option>)}</SearchableSelect></td></tr>)}</tbody></table></div>
                <div className="assetFoot stockImportFoot"><span>عرض {(importPage - 1) * importPageSize + 1}–{Math.min(importPage * importPageSize, importRows.length)} من {importRows.length}</span><div className="pagination"><button type="button" disabled={importPage === 1} onClick={() => setImportPage(importPage - 1)}>السابق</button>{importPageNumbers.map((number, index) => number === "…" ? <span key={`import-gap-${index}`}>…</span> : <button type="button" className={importPage === number ? "active" : ""} key={number} onClick={() => setImportPage(Number(number))}>{number}</button>)}<button type="button" disabled={importPage === importPages} onClick={() => setImportPage(importPage + 1)}>التالي</button></div></div>
              </>}
              {importMessage && <div className="formMessage">{importMessage}</div>}
              {importRows.length > 0 && <button type="button" className="primary" disabled={importing || unmatchedCount > 0} onClick={importStock}>{importing ? "جاري استيراد المخزون..." : unmatchedCount ? `طابقي الأجهزة المتبقية أولًا (${unmatchedCount})` : `استيراد ${importRows.length} سجلًا إلى ${importWarehouse}`}</button>}
            </div>
          </details>
          <div className="stockTableTools">
            <label className="stockSearchField"><span>بحث</span><div className="search">⌕<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث باسم الجهاز أو الصنف..." /></div></label>
            <label><span>المستودع</span><SearchableSelect value={warehouse} onChange={(event) => setWarehouse(event.target.value)}><option>الكل</option>{STOCK_WAREHOUSES.map((name) => <option key={name}>{name}</option>)}</SearchableSelect></label>
          </div>
          <div className="tableWrap stockBalancesWrap"><table className="stockBalancesTable"><thead><tr><th>الجهاز</th><th>الصنف</th><th>المستودع</th><th>الرصيد الحالي</th><th>الحالة</th></tr></thead><tbody>{pageRows.map((row) => <tr key={row.key}><td><strong>{row.product}</strong></td><td>{row.category}</td><td>{row.facility}</td><td><strong className="code">{row.balance}</strong></td><td><span className={`badge ${row.balance > 0 ? "ok" : "repair"}`}>{row.balance > 0 ? "متوفر" : "نفد"}</span></td></tr>)}</tbody></table>{!pageRows.length && <div className="emptyState"><strong>لا توجد أرصدة مطابقة</strong><span>سجّلي حركة وارد أو غيّري الفلاتر.</span></div>}</div>
          <div className="assetFoot stockFoot"><span>عرض {filtered.length ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtered.length)}` : "0"} من {filtered.length}</span><label>عدد الصفوف<SearchableSelect value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option value="10">10</option><option value="20">20</option><option value="50">50</option></SearchableSelect></label><div className="pagination"><button disabled={page === 1} onClick={() => setPage(page - 1)}>السابق</button>{pageNumbers.map((number, index) => number === "…" ? <span key={`gap-${index}`}>…</span> : <button type="button" className={page === number ? "active" : ""} key={number} onClick={() => setPage(Number(number))}>{number}</button>)}<button disabled={page === pages} onClick={() => setPage(page + 1)}>التالي</button></div></div>
          <h3 className="subTitle">آخر حركات المخزون</h3>
          <div className="tableWrap"><table><thead><tr><th>الجهاز</th><th>الحركة</th><th>الكمية</th><th>المستودع</th><th>المرجع</th><th>التاريخ</th></tr></thead><tbody>{rows.slice(0, 12).map((row) => <tr key={row.id}><td>{row.product}</td><td><span className={`badge ${row.transactionType === "وارد" ? "ok" : "follow"}`}>{row.transactionType}</span></td><td>{row.quantity}</td><td>{row.facility}</td><td>{referenceLabel(row.reference)}</td><td>{date(row.createdAt)}</td></tr>)}</tbody></table></div>
        </article>
      </div>
    </section>
  );
}
