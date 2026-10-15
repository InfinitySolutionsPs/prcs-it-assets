"use client";

import { useState } from "react";

export type ExportCell = string | number | null | undefined;
type Props = {
  title: string;
  fileName: string;
  columns: string[];
  rows: ExportCell[][];
};

const xmlEscape = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

function makeZip(files: Array<{ name: string; content: string }>) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const u16 = (view: DataView, at: number, value: number) => view.setUint16(at, value, true);
  const u32 = (view: DataView, at: number, value: number) => view.setUint32(at, value, true);
  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length + data.length);
    const lv = new DataView(local.buffer);
    u32(lv, 0, 0x04034b50); u16(lv, 4, 20); u16(lv, 6, 0x0800); u16(lv, 8, 0);
    u16(lv, 10, 0); u16(lv, 12, 0); u32(lv, 14, crc); u32(lv, 18, data.length);
    u32(lv, 22, data.length); u16(lv, 26, name.length); u16(lv, 28, 0);
    local.set(name, 30); local.set(data, 30 + name.length); localParts.push(local);

    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    u32(cv, 0, 0x02014b50); u16(cv, 4, 20); u16(cv, 6, 20); u16(cv, 8, 0x0800);
    u16(cv, 10, 0); u16(cv, 12, 0); u16(cv, 14, 0); u32(cv, 16, crc);
    u32(cv, 20, data.length); u32(cv, 24, data.length); u16(cv, 28, name.length);
    u16(cv, 30, 0); u16(cv, 32, 0); u16(cv, 34, 0); u16(cv, 36, 0);
    u32(cv, 38, 0); u32(cv, 42, offset); central.set(name, 46);
    centralParts.push(central); offset += local.length;
  }
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  u32(ev, 0, 0x06054b50); u16(ev, 4, 0); u16(ev, 6, 0);
  u16(ev, 8, files.length); u16(ev, 10, files.length); u32(ev, 12, centralSize);
  u32(ev, 16, offset); u16(ev, 20, 0);
  const archiveBuffer = new ArrayBuffer(offset + centralSize + end.length);
  const archive = new Uint8Array(archiveBuffer);
  let cursor = 0;
  for (const part of [...localParts, ...centralParts, end]) {
    archive.set(part, cursor);
    cursor += part.length;
  }
  return new Blob([archiveBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function createWorkbook(columns: string[], rows: ExportCell[][]) {
  const allRows = [columns, ...rows];
  const sheetRows = allRows.map((row, index) =>
    `<row r="${index + 1}">${row.map((value, column) => {
      let columnNumber = column + 1;
      let columnName = "";
      while (columnNumber > 0) {
        const remainder = (columnNumber - 1) % 26;
        columnName = String.fromCharCode(65 + remainder) + columnName;
        columnNumber = Math.floor((columnNumber - 1) / 26);
      }
      const cell = columnName + (index + 1);
      if (typeof value === "number" && Number.isFinite(value)) return `<c r="${cell}" t="n"><v>${value}</v></c>`;
      return `<c r="${cell}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
    }).join("")}</row>`,
  ).join("");
  const columnWidths = columns.map((header, columnIndex) => {
    const values = rows.map((row) => String(row[columnIndex] ?? ""));
    const longest = Math.max(header.length, ...values.map((value) => value.length));
    return Math.max(12, Math.min(42, Math.ceil(longest * 1.35)));
  });
  const columnDefinitions = columnWidths.map((width, index) =>
    `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`,
  ).join("");
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${columnDefinitions}</cols><sheetData>${sheetRows}</sheetData></worksheet>`;
  const safeSheet = "النتائج";
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${safeSheet}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;
  return makeZip([
    { name: "[Content_Types].xml", content: types },
    { name: "_rels/.rels", content: rootRels },
    { name: "xl/workbook.xml", content: workbook },
    { name: "xl/_rels/workbook.xml.rels", content: workbookRels },
    { name: "xl/worksheets/sheet1.xml", content: sheet },
  ]);
}

const downloadBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function ExportActions({ title, fileName, columns, rows }: Props) {
  const [busy, setBusy] = useState<"excel" | "pdf" | null>(null);
  const exportExcel = () => {
    setBusy("excel");
    try {
      const safeName = fileName.replace(/\.xlsx?$/i, "");
      downloadBlob(createWorkbook(columns, rows), `${safeName}.xlsx`);
    } finally { setBusy(null); }
  };
  const exportPdf = () => {
    const popup = window.open("", "_blank");
    if (!popup) {
      alert("اسمح بالنوافذ المنبثقة لهذا الموقع لإعداد ملف PDF.");
      return;
    }
    setBusy("pdf");
    const head = columns.map(column => `<th>${xmlEscape(column)}</th>`).join("");
    const body = rows.map(row => `<tr>${columns.map((_, index) => `<td>${xmlEscape(row[index])}</td>`).join("")}</tr>`).join("");
    const columnWeight = (column: string) => {
      if (/جهاز|ملاحظات|تفاصيل|المواصفات|البيانات/.test(column)) return 2.1;
      if (/الصنف|المرفق|القسم|المسؤول|البريد/.test(column)) return 1.4;
      if (/تاريخ/.test(column)) return 1.3;
      if (/عدد المرافق|عدد الأقسام|إجمالي/.test(column)) return 1.35;
      return 1;
    };
    const totalWeight = columns.reduce((total, column) => total + columnWeight(column), 0);
    const colgroup = columns.map(column => `<col style="width:${(columnWeight(column) / totalWeight * 100).toFixed(2)}%">`).join("");
    popup.document.open();
    popup.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${xmlEscape(title)}</title><style>@page{size:A4 landscape;margin:8mm}body{font-family:Arial,Tahoma,sans-serif;color:#17202a}h1{font-size:18px;margin:0 0 8px}p{color:#657383;font-size:11px;margin:0 0 14px}.meta{margin-bottom:12px;font-size:11px}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:9px}th,td{border:1px solid #ccd3da;padding:5px 4px;text-align:right;vertical-align:top}th{background:#eef2f5;white-space:nowrap;word-break:keep-all;overflow-wrap:normal;font-size:8px}td{overflow-wrap:anywhere;word-break:normal}tr{page-break-inside:avoid}thead{display:table-header-group}</style></head><body><h1>${xmlEscape(title)}</h1><p>تاريخ التصدير: ${new Date().toLocaleString("ar-PS")} — عدد النتائج: ${rows.length}</p><table><colgroup>${colgroup}</colgroup><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table><script>window.onload=()=>setTimeout(()=>window.print(),250);window.onafterprint=()=>window.close();</script></body></html>`);
    popup.document.close();
    window.setTimeout(() => setBusy(null), 1500);
  };
  return <div className="exportActions"><button type="button" onClick={exportExcel} disabled={busy!==null}>{busy==="excel"?"جاري تجهيز Excel…":"↓ Excel"}</button><button type="button" onClick={exportPdf} disabled={busy!==null}>▣ PDF</button></div>;
}
