// Bond terms shown on the bond details (coupon type, seniority, issue date, callable), in each site language.
// Only what the nightly copy holds is shown; anything missing is "–". The 52-week price range is never shown (data supplier rights).

export type FactLang = "en" | "it" | "fr" | "de";

/** The coupon type: the copy's own column first; else zero coupon, or fixed when the main app modelled the cash flows. */
export function couponTypeOf(raw: unknown, coupon: number | null, structureModelled: unknown): string | null {
  if (typeof raw === "string" && raw.trim()) {
    const w = raw.trim().toLowerCase();
    if (/zero/.test(w)) return "zero";
    if (/float|frn|variable/.test(w)) return "floating";
    if (/step/.test(w)) return "step";
    if (/inflation|linker|index/.test(w)) return "inflation";
    if (/fix/.test(w)) return "fixed";
    return raw.trim();
  }
  if (coupon === 0) return "zero";
  // structure_modelled is false for floaters, step-ups and inflation-linked bonds, so true means plain fixed cash flows.
  if (structureModelled === true && coupon !== null) return "fixed";
  return null;
}

const COUPON_TYPES: Record<FactLang, Record<string, string>> = {
  en: { fixed: "Fixed", zero: "Zero coupon", floating: "Floating", step: "Step-up", inflation: "Inflation-linked" },
  it: { fixed: "Fissa", zero: "Zero coupon", floating: "Variabile", step: "Step-up", inflation: "Indicizzata all'inflazione" },
  fr: { fixed: "Fixe", zero: "Zéro coupon", floating: "Variable", step: "Progressif", inflation: "Indexé sur l'inflation" },
  de: { fixed: "Fest", zero: "Nullkupon", floating: "Variabel", step: "Stufenzins", inflation: "Inflationsgebunden" },
};

export function couponTypeLabel(l: FactLang, v: string | null | undefined): string {
  return v ? COUPON_TYPES[l][v] ?? v : "–";
}

const SENIORITY: Record<FactLang, [RegExp, string][]> = {
  en: [],
  it: [[/non[- ]?preferred/i, "Senior non preferred"], [/preferred/i, "Senior preferred"], [/senior secured|^secured/i, "Senior garantita"], [/sub/i, "Subordinata"], [/senior/i, "Senior"]],
  fr: [[/non[- ]?preferred/i, "Senior non préférée"], [/preferred/i, "Senior préférée"], [/senior secured|^secured/i, "Senior garantie"], [/sub/i, "Subordonnée"], [/senior/i, "Senior"]],
  de: [[/non[- ]?preferred/i, "Senior non-preferred"], [/preferred/i, "Senior preferred"], [/senior secured|^secured/i, "Besichert vorrangig"], [/sub/i, "Nachrangig"], [/senior/i, "Vorrangig"]],
};

export function seniorityLabel(l: FactLang, v: string | null | undefined): string {
  if (!v) return "–";
  return SENIORITY[l].find(([re]) => re.test(v))?.[1] ?? v;
}

const YES_NO: Record<FactLang, [string, string]> = { en: ["Yes", "No"], it: ["Sì", "No"], fr: ["Oui", "Non"], de: ["Ja", "Nein"] };

export function callableLabel(l: FactLang, v: boolean | null | undefined): string {
  return v === null || v === undefined ? "–" : YES_NO[l][v ? 0 : 1];
}

export const FACT_TEXT: Record<FactLang, { couponType: string; seniority: string; issueDate: string; callable: string }> = {
  en: { couponType: "Coupon type", seniority: "Seniority", issueDate: "Issue date", callable: "Callable" },
  it: { couponType: "Tipo cedola", seniority: "Rango", issueDate: "Data di emissione", callable: "Callable" },
  fr: { couponType: "Type de coupon", seniority: "Rang", issueDate: "Date d'émission", callable: "Remboursable" },
  de: { couponType: "Kupontyp", seniority: "Rang", issueDate: "Ausgabedatum", callable: "Kündbar" },
};
