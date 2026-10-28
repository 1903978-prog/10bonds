import type { PortfolioEff } from "@/lib/riskBandsBuild";

// "Portfolio Efficiency" under the slider (Methodology 5 only): a fixed-height block, so nothing moves when it fills. Wording owner-approved 28/10/2026;
// it never calls the score a probability of success or a guaranteed return, and the risk equivalence is the site's own, not an agency rating.
const T = {
  en: { head: "Portfolio efficiency", bes: "Portfolio BES", net: "net spread", avg: "Average bond BES", na: "Unavailable – insufficient calibration data", why: "Portfolio efficiency measures the portfolio’s modeled risk-adjusted yield compensation relative to an appropriate reference population of comparable portfolios." },
  it: { head: "Efficienza del portafoglio", bes: "BES del portafoglio", net: "spread netto", avg: "BES medio delle obbligazioni", na: "Non disponibile – dati di calibrazione insufficienti", why: "L’efficienza del portafoglio misura il compenso di rendimento modellato, corretto per il rischio, rispetto a una popolazione di riferimento di portafogli comparabili." },
  fr: { head: "Efficience du portefeuille", bes: "BES du portefeuille", net: "spread net", avg: "BES moyen des obligations", na: "Indisponible – données de calibrage insuffisantes", why: "L’efficience du portefeuille mesure la rémunération modélisée du rendement, ajustée du risque, par rapport à une population de référence de portefeuilles comparables." },
  de: { head: "Portfolio-Effizienz", bes: "Portfolio-BES", net: "Nettospread", avg: "Durchschnittlicher Anleihe-BES", na: "Nicht verfügbar – unzureichende Kalibrierungsdaten", why: "Die Portfolio-Effizienz misst die modellierte risikoadjustierte Renditevergütung im Vergleich zu einer geeigneten Referenzgruppe vergleichbarer Portfolios." },
} as const;

export default function PortfolioEfficiency({ eff, lang }: { eff: PortfolioEff; lang: string }) {
  const t = T[(lang in T ? lang : "en") as keyof typeof T];
  const sign = eff.netBp >= 0 ? "+" : "";
  return (
    <div className="mt-1.5 h-[46px] overflow-hidden text-[11px] leading-[15px] tabular-nums text-mute" data-testid="portfolio-efficiency" title={t.why}>
      <div className="truncate"><span className="font-medium text-ink">{t.head}</span> · {t.bes}: {eff.portfolioBes != null ? `${Math.round(eff.portfolioBes)}/100` : t.na}</div>
      <div className="truncate">{t.net} {sign}{Math.round(eff.netBp)} bp{eff.avgBondBes != null ? ` · ${t.avg}: ${Math.round(eff.avgBondBes)}/100` : ""}</div>
      <div className="truncate">{t.why}</div>
    </div>
  );
}
