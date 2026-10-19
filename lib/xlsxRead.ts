// Reads the first sheet of an .xlsx file into rows of text, without a spreadsheet library.
// An .xlsx is a zip of XML parts; `inflate` unpacks one compressed part (the browser and Node each pass their own).

export type Inflate = (data: Uint8Array) => Promise<Uint8Array>;

const dec = new TextDecoder();

type Entry = { name: string; method: number; size: number; offset: number };

function entries(buf: Uint8Array): Map<string, Entry> {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let end = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error("not a zip");
  const count = v.getUint16(end + 10, true);
  let p = v.getUint32(end + 16, true);
  const out = new Map<string, Entry>();
  for (let i = 0; i < count; i++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error("bad zip");
    const method = v.getUint16(p + 10, true);
    const size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const extra = v.getUint16(p + 30, true);
    const comment = v.getUint16(p + 32, true);
    const offset = v.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nameLen));
    out.set(name, { name, method, size, offset });
    p += 46 + nameLen + extra + comment;
  }
  return out;
}

async function read(buf: Uint8Array, e: Entry, inflate: Inflate): Promise<string> {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const start = e.offset + 30 + v.getUint16(e.offset + 26, true) + v.getUint16(e.offset + 28, true);
  const raw = buf.subarray(start, start + e.size);
  if (e.method === 0) return dec.decode(raw);
  if (e.method === 8) return dec.decode(await inflate(raw));
  throw new Error("unsupported compression");
}

const unesc = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, "&");

/** Text of all <t> parts inside a piece of XML (rich text is split over several). */
const texts = (xml: string) => [...xml.matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g)].map((m) => unesc(m[1])).join("");

function colIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/)?.[0] ?? "A";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export async function readXlsxRows(bytes: Uint8Array, inflate: Inflate, maxRows = 2000): Promise<string[][]> {
  const zip = entries(bytes);
  const get = async (name: string) => {
    const e = zip.get(name);
    return e ? read(bytes, e, inflate) : null;
  };

  // First sheet: workbook order, then its relationship target.
  let sheetPath = "xl/worksheets/sheet1.xml";
  const wb = await get("xl/workbook.xml");
  const rels = await get("xl/_rels/workbook.xml.rels");
  const rid = wb?.match(/<(?:\w+:)?sheet\b[^>]*\br:id="([^"]+)"/)?.[1];
  if (rid && rels) {
    const target = rels.match(new RegExp(`<Relationship\\b[^>]*Id="${rid}"[^>]*Target="([^"]+)"`))?.[1] ?? rels.match(new RegExp(`<Relationship\\b[^>]*Target="([^"]+)"[^>]*Id="${rid}"`))?.[1];
    if (target) sheetPath = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
  }
  const sheet = await get(sheetPath);
  if (!sheet) throw new Error("no sheet");

  const sharedXml = await get("xl/sharedStrings.xml");
  const shared = sharedXml ? [...sharedXml.matchAll(/<(?:\w+:)?si>([\s\S]*?)<\/(?:\w+:)?si>/g)].map((m) => texts(m[1])) : [];

  const rows: string[][] = [];
  for (const rm of sheet.matchAll(/<(?:\w+:)?row\b[^>]*?(?:\/>|>([\s\S]*?)<\/(?:\w+:)?row>)/g)) {
    if (rows.length >= maxRows) break;
    const row: string[] = [];
    for (const cm of (rm[1] ?? "").matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)) {
      const attrs = cm[1];
      const inner = cm[2] ?? "";
      const ref = attrs.match(/\br="([A-Z]+\d+)"/)?.[1];
      const type = attrs.match(/\bt="([^"]+)"/)?.[1];
      const v = inner.match(/<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/)?.[1];
      let value = "";
      if (type === "s") value = shared[Number(v)] ?? "";
      else if (type === "inlineStr") value = texts(inner);
      else if (v !== undefined) value = unesc(v);
      const idx = ref ? colIndex(ref) : row.length;
      while (row.length < idx) row.push("");
      row[idx] = value.trim();
    }
    if (row.some((c) => c !== "")) rows.push(row);
  }
  return rows;
}

/** Browser inflate (raw deflate, as used inside zip files). */
export const browserInflate: Inflate = async (data) => {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};
