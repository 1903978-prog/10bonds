import { loadAllShown } from "@/lib/bonds";
import { bondMap, type BondMapText } from "@/lib/seo/bondMap";
import BondMapGrid from "@/components/seo/BondMapGrid";

const NUM: Record<string, string> = { it: "it-IT", fr: "fr-FR", de: "de-DE", en: "en-GB" };
// A currency gets its own tab once it has enough rated bonds to say something (USD ratings arrive in a later data release).
const MIN_TAB = 50;

/** The bond map: every rated bond, all currencies, by maturity and risk. Computed from the bond copy each time it is read. */
export default async function BondMapSection({ locale, text }: { locale: string; text: BondMapText }) {
  const data = await loadAllShown().catch(() => null);
  if (!data || !data.bonds.length) return <p className="mt-6 text-mute">{text.empty}</p>;
  const loc = NUM[locale];
  const n = (v: number) => v.toLocaleString(loc);
  const all = bondMap(data.bonds);
  const tabs = [{ key: "all", label: text.all, map: all }];
  for (const c of ["EUR", "USD"]) {
    const m = bondMap(data.bonds.filter((b) => b.currency === c));
    if (m.bonds >= MIN_TAB) tabs.push({ key: c, label: c, map: m });
  }
  const asOf = data.asOf ? new Date(data.asOf).toLocaleDateString(loc, { day: "numeric", month: "long", year: "numeric" }) : null;
  const shown = all.bonds;
  // Everything else in the copy: no current yield, matured, stale price or a structure the main app cannot model.
  const noYield = data.total - shown - data.unrated - all.noMaturity;
  return (
    <>
      <BondMapGrid locale={loc} text={{ h1: text.h1, maturity: text.maturity, years: text.years, risk: text.risk, lower: text.lower, higher: text.higher, legend: text.legend }} tabs={tabs} asOf={asOf} />
      <p className="mt-2 text-xs leading-relaxed text-mute">
        {[
          text.coverage(n(shown), n(data.total)),
          data.unrated ? text.unrated(n(data.unrated)) : null,
          all.noMaturity ? text.noMaturity(n(all.noMaturity)) : null,
          noYield > 0 ? text.noYield(n(noYield)) : null,
          text.note,
        ].filter(Boolean).join(" ")}
      </p>
    </>
  );
}
