import { notchOf } from "./ratings";
import { RISK_KEYS, type IssuerType, type ResearchFacts } from "./creditScoring";

// THE one list of parameters the IR / BR calculation needs (owner, 2/11/2026). The admin table, the stored result and the
// "same result as another bond" check all read this list, so "gathered / maximum" always means the same thing.
// Add or remove a parameter here and every count follows. Nothing else in the code defines the list.

export type ParamGroup = "Issuer" | "Bond" | "Financials" | "Risk categories" | "Sources";
export type ParamDef = { key: string; label: string; group: ParamGroup; help: string; appliesTo?: IssuerType[] };

export const RISK_LABELS: Record<(typeof RISK_KEYS)[number], string> = {
  news_mgmt_legal: "News, management and legal",
  politics_regulation: "Politics and regulation",
  market_competition_tech: "Market, competition and technology",
  rates_refinancing_liquidity: "Rates, refinancing and liquidity",
  macro_fx_energy: "Macro, currency and energy",
  health_climate_cyber: "Health, climate and cyber",
};

export const PARAMETERS: ParamDef[] = [
  { key: "agency_anchor", label: "Issuer agency grade", group: "Issuer", help: "A published grade for the issuer. It is the starting point of IR." },
  { key: "seniority", label: "Bond seniority", group: "Bond", help: "Senior, subordinated, secured… It moves BR relative to IR." },
  { key: "guarantee", label: "Guarantee known", group: "Bond", help: "Whether a guarantee exists (yes or no both count as found)." },
  { key: "net_debt_ebitda", label: "Net debt / EBITDA", group: "Financials", help: "Debt load of a company.", appliesTo: ["corporate", "other"] },
  { key: "interest_cover", label: "Interest cover", group: "Financials", help: "How easily a company pays its interest.", appliesTo: ["corporate", "other"] },
  { key: "cet1", label: "CET1 ratio", group: "Financials", help: "Capital strength of a bank.", appliesTo: ["bank"] },
  { key: "npl", label: "Bad-loan (NPL) ratio", group: "Financials", help: "Share of bad loans of a bank.", appliesTo: ["bank"] },
  { key: "debt_gdp", label: "Public debt / GDP", group: "Financials", help: "Debt burden of a country.", appliesTo: ["sovereign"] },
  ...RISK_KEYS.map((k) => ({ key: `risk_${k}`, label: RISK_LABELS[k], group: "Risk categories" as const, help: "Rated red / amber / green from named sources. Grey means not researched." })),
  { key: "primary_sources", label: "Two or more primary sources", group: "Sources", help: "Documents from the issuer or an official body (not only the site's own data copy)." },
];

/** What a parameter is needed for: IR (mandatory for the issuer rating), BR (needed for the bond rating) or only supporting evidence. */
export const NEEDED_FOR = (p: { key: string; group: ParamGroup }): "IR" | "BR" | "supporting" => (p.key === "agency_anchor" ? "supporting" : p.key === "seniority" || p.key === "guarantee" ? "BR" : "IR");
export type ParamStatus = { key: string; label: string; group: ParamGroup; found: boolean; source: string | null; detail: string | null; neededFor: "IR" | "BR" | "supporting" };
export type ParamReport = { found: number; max: number; confidence: "high" | "medium" | "low"; items: ParamStatus[] };

const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);

export function confidenceOf(found: number, max: number): ParamReport["confidence"] {
  const r = max ? found / max : 0;
  return r >= 0.75 ? "high" : r >= 0.5 ? "medium" : "low";
}

/** Which parameters were gathered for these facts, and from where. Only parameters that apply to the issuer type count. */
export function parameterReport(f: ResearchFacts): ParamReport {
  const items: ParamStatus[] = [];
  const evUrl = (u: string | undefined) => (u ? f.evidence.find((e) => e.url === u)?.publisher || u : null);
  for (const p of PARAMETERS) {
    if (p.appliesTo && !p.appliesTo.includes(f.issuerType)) continue;
    let found = false, source: string | null = null, detail: string | null = null;
    switch (p.key) {
      case "agency_anchor": {
        const a = f.agencyRatings.find((x) => x.scope === "issuer" && notchOf(x.rating) !== null);
        found = !!a; source = a ? a.agency : null; detail = a ? a.rating : null; break;
      }
      case "seniority": found = f.seniority !== "unknown"; detail = found ? f.seniority : null; source = found ? "bond data / documents" : null; break;
      case "guarantee": found = f.guaranteed !== null && f.guaranteed !== undefined; detail = found ? (f.guaranteed ? "yes" : "no") : null; source = found ? "documents" : null; break;
      case "net_debt_ebitda": found = num(f.metrics.netDebtToEbitda); detail = found ? `${f.metrics.netDebtToEbitda}x` : null; break;
      case "interest_cover": found = num(f.metrics.interestCover); detail = found ? `${f.metrics.interestCover}x` : null; break;
      case "cet1": found = num(f.metrics.cet1Pct); detail = found ? `${f.metrics.cet1Pct}%` : null; break;
      case "npl": found = num(f.metrics.nplPct); detail = found ? `${f.metrics.nplPct}%` : null; break;
      case "debt_gdp": found = num(f.metrics.debtToGdpPct); detail = found ? `${f.metrics.debtToGdpPct}%` : null; source = found ? "World Bank / documents" : null; break;
      case "primary_sources": {
        const n = new Set(f.evidence.filter((e) => e.primary).map((e) => e.url)).size;
        found = n >= 2; detail = `${n} found`; source = n ? [...new Set(f.evidence.filter((e) => e.primary).map((e) => e.publisher))].slice(0, 3).join(", ") : null; break;
      }
      default: {
        const key = p.key.replace(/^risk_/, "");
        const r = f.risks.find((x) => x.key === key);
        // Same rule as the scoring: green without named evidence counts as not researched.
        found = !!r && r.color !== "GREY" && !(r.color === "GREEN" && !r.evidence.length);
        detail = found ? r!.color : null; source = found ? evUrl(r!.evidence[0]) : null;
      }
    }
    if (p.group === "Financials" && found && !source) source = "documents";
    items.push({ key: p.key, label: p.label, group: p.group, found, source, detail, neededFor: NEEDED_FOR(p) });
  }
  const found = items.filter((i) => i.found).length;
  return { found, max: items.length, confidence: confidenceOf(found, items.length), items };
}

/** The next parameter the worker will research: publication-critical first (financials, then risks, then bond facts, then sources). */
export function nextMissing(f: ResearchFacts, rep: ParamReport = parameterReport(f)): string | null {
  const order: ParamGroup[] = ["Financials", "Risk categories", "Bond", "Sources", "Issuer"];
  for (const g of order) {
    const m = rep.items.find((i) => i.group === g && !i.found);
    if (m) return m.label;
  }
  return null;
}

/** The sentence shown when a rating is not published. */
export function blockedMessage(status: string | null, rep: ParamReport, gate: { ir?: { reasons?: string[]; missingCritical?: string[] } } | null): string | null {
  if (status === "publishable" || status === "validated") return null;
  const miss = rep.items.filter((i) => !i.found && i.neededFor !== "supporting").map((i) => i.label);
  const head = `Rating not published: only ${rep.found} of ${rep.max} parameters verified.`;
  const tail = miss.length ? ` Missing: ${miss.slice(0, 5).join(", ")}${miss.length > 5 ? ` and ${miss.length - 5} more` : ""}.` : "";
  const why = gate?.ir?.reasons?.length ? ` ${gate.ir.reasons[0]}` : "";
  return head + tail + why;
}
