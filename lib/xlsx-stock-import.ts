export type StockImportSourceRow = {
  sourceRow: number;
  sourceGroup: string;
  sourceName: string;
  brand: string;
  model: string;
  serial: string;
  supplier: string;
  accessories: string;
  quantity: number;
  unit: string;
  notes: string;
  productId: number | null;
};

type ZipRecord = { method: number; compressedSize: number; localOffset: number };

function findZipEntries(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let endRecord = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) {
    if (view.getUint32(offset, true) === 0x06054b50) { endRecord = offset; break; }
  }
  if (endRecord < 0) throw new Error("الملف المحدد ليس ملف Excel صالحًا");
  const total = view.getUint16(endRecord + 10, true);
  let offset = view.getUint32(endRecord + 16, true);
  const decoder = new TextDecoder();
  const records = new Map<string, ZipRecord>();
  for (let index = 0; index < total; index++) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("تعذر قراءة بنية ملف Excel");
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    records.set(name, { method, compressedSize, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return { bytes, view, records };
}

async function readZipText(zip: ReturnType<typeof findZipEntries>, path: string) {
  const record = zip.records.get(path);
  if (!record) return null;
  const local = record.localOffset;
  if (zip.view.getUint32(local, true) !== 0x04034b50) throw new Error("تعذر فتح أحد أجزاء ملف Excel");
  const nameLength = zip.view.getUint16(local + 26, true);
  const extraLength = zip.view.getUint16(local + 28, true);
  const start = local + 30 + nameLength + extraLength;
  const compressed = zip.bytes.slice(start, start + record.compressedSize);
  let output: Uint8Array;
  if (record.method === 0) output = compressed;
  else if (record.method === 8) {
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    output = new Uint8Array(await new Response(stream).arrayBuffer());
  } else throw new Error("صيغة ضغط ملف Excel غير مدعومة");
  return new TextDecoder().decode(output);
}

function colIndex(reference: string) {
  const letters = reference.match(/^[A-Z]+/i)?.[0]?.toUpperCase() || "A";
  return [...letters].reduce((number, char) => number * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

const clean = (value: string | null | undefined) => (value || "").replace(/\s+/g, " ").trim();
const normalized = (value: string) => value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
const attribute = (source: string, name: string) => source.match(new RegExp(`(?:^|\\s)${name.replace(":", "\\:")}="([^"]*)"`))?.[1] || "";
const decodeXml = (value: string) => value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (entity, code: string) => {
  if (code === "amp") return "&";
  if (code === "lt") return "<";
  if (code === "gt") return ">";
  if (code === "quot") return '"';
  if (code === "apos") return "'";
  return String.fromCodePoint(code[1]?.toLowerCase() === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1)));
});
const xmlTextNodes = (source: string) => [...source.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1])).join("");

export async function parseMedicalStockWorkbook(file: File, products: { id: number; name: string; categoryName?: string }[]): Promise<StockImportSourceRow[]> {
  const zip = findZipEntries(await file.arrayBuffer());
  const workbookText = await readZipText(zip, "xl/workbook.xml");
  const relationsText = await readZipText(zip, "xl/_rels/workbook.xml.rels");
  if (!workbookText || !relationsText) throw new Error("تعذر العثور على ورقة العمل داخل الملف");
  const sheetAttributes = workbookText.match(/<sheet\b([^>]*)\/?\s*>/)?.[1] || "";
  const relationId = attribute(sheetAttributes, "r:id");
  const relationAttributes = [...relationsText.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)].map((match) => match[1]);
  const relation = relationAttributes.find((attributes) => attribute(attributes, "Id") === relationId);
  const target = relation ? attribute(relation, "Target") : "";
  if (!target) throw new Error("تعذر تحديد ورقة البيانات في الملف");
  const normalizedTarget = target.replaceAll("\\", "/");
  const sheetPath = normalizedTarget.startsWith("/") ? normalizedTarget.slice(1) : normalizedTarget.startsWith("xl/") ? normalizedTarget : `xl/${normalizedTarget.replace(/^\.\//, "")}`;
  const sheetText = await readZipText(zip, sheetPath);
  if (!sheetText) throw new Error("ورقة البيانات غير موجودة في الملف");
  const sharedText = await readZipText(zip, "xl/sharedStrings.xml");
  const shared = sharedText ? [...sharedText.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((item) => xmlTextNodes(item[1])) : [];
  const rows = [...sheetText.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)].map((row) => {
    const values: string[] = [];
    for (const cell of row[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const reference = attribute(cell[1], "r") || "A";
      const index = colIndex(reference);
      const type = attribute(cell[1], "t");
      const value = cell[2]?.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1] || "";
      const inline = xmlTextNodes(cell[2] || "");
      values[index] = type === "s" ? shared[Number(value)] || "" : type === "inlineStr" ? inline : decodeXml(value);
    }
    return { number: Number(attribute(row[1], "r") || "0"), values: values.map((value) => value?.trim() || "") };
  });
  const headerIndex = rows.findIndex(({ values }) => normalized(values[0] || "") === "item" && normalized(values[1] || "") === "brand");
  if (headerIndex < 0) throw new Error("لم أجد أعمدة Item وBrand المطلوبة في الملف");

  const aliases: Record<string, { name: string; category?: string }> = {
    "carm": { name: "C-arm Machine", category: "Diagnostic Imaging" },
    "argonlaser": { name: "Argon laser for surgical vitrectomy", category: "Ophthalmology Equipment" },
    "etoethylenoxidersterilizer": { name: "ETO Sterilizer", category: "Sterilization & CSSD" },
    "electolyteanalyzer": { name: "Electrolyte Analyzer", category: "Laboratory Equipment" },
    "biologicalsafetycabinet": { name: "Safety Cabinet", category: "Laboratory Equipment" },
    "bilogicalsafetycabinet": { name: "Safety Cabinet", category: "Laboratory Equipment" },
    "waterdistiller": { name: "Water Distillator", category: "Laboratory Equipment" },
    "hematologyanalyzercbc": { name: "CBC", category: "Laboratory Equipment" },
    "bloodgasanalyzer": { name: 'Blood gas Analyzer "ABGs"', category: "Laboratory & Point-of-Care" },
    "microscope": { name: "microscopee", category: "Laboratory Equipment" },
    "laboratoryincubator": { name: "Incubator", category: "Laboratory Equipment" },
  };
  const categoryHint = (group: string) => {
    if (normalized(group) === "laboratoryequipment") return "Laboratory Equipment";
    if (normalized(group) === "rehabilitationdept") return "Physical Therapy Equipment";
    return "";
  };
  const findProduct = (name: string, preferredCategory = "") => {
    const allMatches = products.filter((product) => normalized(product.name) === normalized(name));
    if (preferredCategory) {
      const categoryMatches = allMatches.filter((product) => normalized(product.categoryName || "") === normalized(preferredCategory));
      if (categoryMatches.length === 1) return categoryMatches[0].id;
      if (categoryMatches.length > 1) return null;
    }
    return allMatches.length === 1 ? allMatches[0].id : null;
  };
  const sectionNames = new Set(["ophthalmicconsumables", "laboratoryequipment", "rehabilitationdept"]);
  const result: StockImportSourceRow[] = [];
  let currentGroup = "";
  for (const { number, values } of rows.slice(headerIndex + 1)) {
    const first = clean(values[0]);
    const second = clean(values[1]);
    const section = sectionNames.has(normalized(first));
    if (section) currentGroup = first;
    const sourceName = section || !first ? second : first;
    if (!sourceName) continue;
    const brand = section || !first ? "" : second;
    const model = clean(values[2]);
    const serial = values[3] || "";
    const supplier = clean(values[4]);
    const accessories = values[5] || "";
    const firstAccessoryLine = accessories.split(/\r?\n/)[0] || "";
    const explicitQuantity = firstAccessoryLine.match(/^\s*Qty\.?\s*([\d,]+)\s*(.*)$/i);
    const serials = serial.split(/\r?\n/).map(clean).filter(Boolean);
    const quantity = explicitQuantity ? Number(explicitQuantity[1].replaceAll(",", "")) : serials.length || 1;
    const unit = explicitQuantity ? clean(explicitQuantity[2]) : "";
    const alias = aliases[normalized(sourceName)];
    const preferredCategory = alias?.category || categoryHint(currentGroup);
    const productId = alias ? findProduct(alias.name, preferredCategory) : findProduct(sourceName, preferredCategory);
    const notes = [brand && `العلامة التجارية: ${brand}`, model && `الطراز: ${model}`, serial && `الأرقام التسلسلية: ${serial}`, supplier && `المورّد: ${supplier}`, accessories && `الملحقات والتفاصيل: ${accessories}`].filter(Boolean).join("\n");
    result.push({ sourceRow: number, sourceGroup: currentGroup, sourceName, brand, model, serial, supplier, accessories, quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1, unit, notes, productId });
  }
  return result;
}

export async function hashStockWorkbook(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}
