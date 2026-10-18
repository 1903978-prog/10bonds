// Reading a rendered page the way a search engine would: only the server HTML, no JavaScript run.

export type PageFacts = {
  title: string | null;
  description: string | null;
  canonical: string | null;
  robots: string | null; // content of <meta name="robots">
  viewport: boolean;
  h1: number;
  h2: number;
  words: number; // visible words in <main> (whole body when there is no main)
  links: string[]; // hrefs of <a> in the page, as written
  jsonLd: { types: string[]; errors: number };
  isins: string[]; // valid ISIN codes found in the visible text
  times: number; // <time datetime> elements
  ids: string[]; // id attributes of H2 headings
  hreflang: Record<string, string>; // hreflang code -> href, from <link rel="alternate">
  lang: string | null; // lang attribute on the content wrapper (or <html>)
  text: string; // visible text of <main>, for duplicate checks
};

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");

function metaContent(html: string, name: string): string | null {
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0];
    const n = tag.match(/\b(?:name|property)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (n?.toLowerCase() === name) return decode(tag.match(/\bcontent\s*=\s*"([^"]*)"|\bcontent\s*=\s*'([^']*)'/i)?.slice(1).find((x) => x !== undefined) ?? "");
  }
  return null;
}

export function parsePage(html: string): PageFacts {
  const head = html.match(/<head\b[\s\S]*?<\/head>/i)?.[0] ?? html;
  const noScript = html.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ");
  const main = noScript.match(/<main\b[\s\S]*<\/main>/i)?.[0] ?? noScript.match(/<body\b[\s\S]*<\/body>/i)?.[0] ?? noScript;
  const text = decode(main.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  const canonical = [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).find((t) => /\brel\s*=\s*["']canonical["']/i.test(t));
  const types: string[] = [];
  let errors = 0;
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1]);
      for (const item of Array.isArray(data) ? data : data["@graph"] ?? [data]) {
        if (item && typeof item["@type"] === "string" && (item["@context"] ?? data["@context"])) types.push(item["@type"]);
        else errors++;
      }
    } catch {
      errors++;
    }
  }
  return {
    title: head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ? decode(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)![1]).trim() : null,
    description: metaContent(head, "description"),
    canonical: canonical ? decode(canonical.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1] ?? "") || null : null,
    robots: metaContent(head, "robots"),
    viewport: /width\s*=\s*device-width/i.test(metaContent(head, "viewport") ?? ""),
    h1: (noScript.match(/<h1\b/gi) ?? []).length,
    h2: (main.match(/<h2\b/gi) ?? []).length,
    words: text.split(" ").filter((w) => /[\p{L}\p{N}]/u.test(w)).length,
    links: [...noScript.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']*)["']/gi)].map((m) => decode(m[1])),
    jsonLd: { types, errors },
    isins: findIsins(text),
    times: (main.match(/<time\b[^>]*datetime=/gi) ?? []).length,
    hreflang: Object.fromEntries(
      [...head.matchAll(/<link\b[^>]*>/gi)]
        .map((m) => m[0])
        .filter((t) => /\brel\s*=\s*["']alternate["']/i.test(t) && /\bhreflang\s*=/i.test(t))
        .map((t) => [t.match(/\bhreflang\s*=\s*["']([^"']+)["']/i)?.[1] ?? "", decode(t.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1] ?? "")]),
    ),
    lang: main.match(/<[a-z]+\b[^>]*\blang\s*=\s*["']([a-zA-Z-]+)["']/)?.[1] ?? html.match(/<html\b[^>]*\blang\s*=\s*["']([a-zA-Z-]+)["']/i)?.[1] ?? null,
    ids: [...main.matchAll(/<h2\b[^>]*\bid\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]),
    text,
  };
}

/** ISIN check digit (ISO 6166): letters become numbers, then the Luhn rule. */
export function isValidIsin(code: string): boolean {
  if (!/^[A-Z]{2}[A-Z0-9]{9}\d$/.test(code)) return false;
  const digits = code.slice(0, 11).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let sum = 0;
  let double = true;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return (10 - (sum % 10)) % 10 === Number(code[11]);
}

export function findIsins(text: string): string[] {
  return [...new Set((text.match(/\b[A-Z]{2}[A-Z0-9]{9}\d\b/g) ?? []).filter(isValidIsin))];
}

/** Word 5-gram overlap (0..1) between two texts, to spot near-duplicate pages. */
export function similarity(a: string, b: string): number {
  const grams = (t: string) => {
    const w = t.toLowerCase().split(/\s+/).filter(Boolean);
    const s = new Set<string>();
    for (let i = 0; i + 5 <= w.length; i++) s.add(w.slice(i, i + 5).join(" "));
    return s;
  };
  const A = grams(a);
  const B = grams(b);
  if (!A.size || !B.size) return 0;
  let both = 0;
  for (const g of A) if (B.has(g)) both++;
  return both / (A.size + B.size - both);
}
