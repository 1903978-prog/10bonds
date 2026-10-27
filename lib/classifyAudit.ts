import { loadAllShown } from "./bonds";
import { groupInfo } from "./issuerGroups";
import { coverage, type Classification, type Coverage } from "./classify";
import { issuerKey } from "./ranking";

export type UnclassifiedIssuer = { issuer: string; bonds: number; isin: string; currency: string; needs: "country" | "industry" | "both"; country: string | null; sector: string | null };

/** Admin: how many of the bonds the site shows have a country and an industry, and the issuers still missing one. */
export async function classificationAudit(): Promise<{ coverage: Coverage; byCurrency: Record<string, Coverage>; issuers: number; issuersClassified: number; missing: UnclassifiedIssuer[] } | null> {
  const { bonds, source } = await loadAllShown();
  if (source !== "live") return null;
  const cls = (b: (typeof bonds)[number]): Classification => {
    const t = groupInfo(b).sector;
    const sector = t ?? b.feedSector ?? null;
    return { country: b.country, countrySource: (b.countrySource as Classification["countrySource"]) ?? null, sector, sectorSource: t ? "table" : b.feedSector ? "feed" : null };
  };
  const byCur: Record<string, Classification[]> = {};
  const issuers = new Map<string, UnclassifiedIssuer>();
  for (const b of bonds) {
    const c = cls(b);
    (byCur[b.currency] ??= []).push(c);
    const key = issuerKey(b);
    const cur = issuers.get(key);
    if (cur) cur.bonds++;
    else issuers.set(key, { issuer: b.issuer ?? b.name, bonds: 1, isin: b.isin, currency: b.currency, needs: "both", country: null, sector: null });
  }
  // an issuer is "missing" while any of its bonds lacks country or industry
  const missing: UnclassifiedIssuer[] = [];
  const all = [...issuers.entries()];
  const lacking = new Set<string>();
  for (const b of bonds) { const c = cls(b); if (!c.country || !c.sector) lacking.add(issuerKey(b)); }
  for (const [k, v] of all) if (lacking.has(k)) {
    const rows = bonds.filter((b) => issuerKey(b) === k).map(cls);
    const noC = rows.some((c) => !c.country), noS = rows.some((c) => !c.sector);
    missing.push({ ...v, needs: noC && noS ? "both" : noC ? "country" : "industry", country: rows.find((c) => c.country)?.country ?? null, sector: rows.find((c) => c.sector)?.sector ?? null });
  }
  missing.sort((a, b) => b.bonds - a.bonds || a.issuer.localeCompare(b.issuer));
  return { coverage: coverage(bonds.map(cls)), byCurrency: Object.fromEntries(Object.entries(byCur).map(([k, v]) => [k, coverage(v)])), issuers: issuers.size, issuersClassified: issuers.size - missing.length, missing };
}
