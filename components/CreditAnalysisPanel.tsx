import type { CreditRow } from "@/lib/creditAnalysisDb";
import { irText, brText } from "@/lib/creditRow";
import type { CreditOverlay, RiskColor } from "@/lib/creditOverlay";

// Credit analysis of one bond (admin Bond Card). Agency ratings, the independent IR / BR, the site's Risk Pay and the 1-10 risk class
// are shown apart on purpose. Independent figures are provisional and are not agency ratings.

const PILL: Record<RiskColor, string> = {
  RED: "bg-red-100 text-red-800 border-red-300",
  AMBER: "bg-amber-100 text-amber-900 border-amber-300",
  GREEN: "bg-green-100 text-green-800 border-green-300",
  GREY: "bg-gray-100 text-gray-700 border-gray-300",
};

export default function CreditAnalysisPanel({ credit }: { credit: CreditRow }) {
  const d = (credit.detail ?? null) as CreditOverlay | null;
  const ir = irText(credit) ?? "—", br = brText(credit) ?? "—";
  const full = d && d.indicators && d.structure;
  return (
    <section className="mt-4 rounded-lg border border-line bg-white p-4 text-[13px]" data-testid="credit-panel">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[16px] font-semibold">Credit analysis</h2>
        {d?.structure?.snp ? <span className="rounded-full border border-red-300 bg-red-50 px-2.5 py-0.5 text-xs font-bold tracking-wide text-red-800" data-testid="snp-flag">SNP · Senior non-preferred</span> : null}
        <span className="rounded-full border border-line bg-[#f5f5f7] px-2 py-0.5 text-xs text-mute">{credit.ratingVerificationStatus ?? "provisional"}{credit.ratingAssessmentDate ? ` · assessed ${credit.ratingAssessmentDate}` : ""}</span>
      </div>
      {d?.structure ? <p className="mt-1 text-xs text-mute">{d.structure.instrument}. Not a covered Pfandbrief and not senior preferred. Ranking: {d.structure.rankingStatus === "verified" ? "verified against final terms" : "not yet verified against the ISIN-specific final terms"}.</p> : null}

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile k="IR (issuer, 0–100)" v={ir} testid="credit-ir" />
        <Tile k="BR (bond, 0–100)" v={br} testid="credit-br" />
        <Tile k="Recommendation" v={credit.recommendation === null ? "—" : `${credit.recommendation}/10 — ${credit.recommendationLabel ?? ""}`} testid="credit-reco" />
        <Tile k="Website Risk Pay" v={credit.riskPayWebsite === null ? "—" : `${credit.riskPayWebsite}×`} testid="credit-riskpay" />
      </div>
      <p className="mt-2 text-xs text-mute">IR and BR are independent, provisional assessments, not agency ratings, not the 1–10 risk class.</p>
      {credit.exclusionReason ? <p className="mt-1 text-xs font-medium text-red-700">Portfolios with a minimum of {credit.excludedBelowGrade}: excluded. {credit.exclusionReason}</p> : null}

      {d?.market ? (
        <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900" data-testid="riskpay-warning">
          {d.market.riskPayNote} Independent security-adjusted Risk Pay: {credit.riskPayAdjusted === null ? "not yet assessed" : `${credit.riskPayAdjusted}×`}. Market figures are indicative, observed {d.market.observedAt}.
        </p>
      ) : null}

      {full ? (
        <>
          <h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-mute">Agency ratings (as reported, separate from our risk class)</h3>
          <ul className="mt-1 grid gap-1 sm:grid-cols-2" data-testid="agency-ratings">
            {d.agencyRatings.map((a) => (
              <li key={a.agency + a.scope} className="rounded-lg bg-[#f5f5f7] px-3 py-1.5"><span className="font-medium">{a.agency} {a.scope}: {a.rating}</span> <span className="text-mute">(S&amp;P equiv. {a.spEquivalent}) · {a.individuallyRated ? "issue rating" : "not an ISIN-specific rating"}</span></li>
            ))}
          </ul>

          <h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-mute">Risk indicators</h3>
          <div className="mt-1 flex flex-wrap gap-1.5" data-testid="risk-badges">
            {d.indicators.map((i) => (
              <span key={i.key} title={i.driver} className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${PILL[i.color]}`} data-color={i.color}>
                <span className="truncate">{i.label}</span><b>{i.color}</b>
              </span>
            ))}
          </div>
          <ul className="mt-1 list-disc pl-5 text-xs text-mute">{d.indicators.map((i) => <li key={i.key}><b>{i.label}</b>: {i.driver}</li>)}</ul>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div><h3 className="text-xs font-semibold uppercase tracking-wide text-mute">Positive drivers</h3><ul className="list-disc pl-5 text-xs">{d.drivers.positive.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="text-xs font-semibold uppercase tracking-wide text-mute">Negative drivers</h3><ul className="list-disc pl-5 text-xs">{d.drivers.negative.map((x) => <li key={x}>{x}</li>)}</ul></div>
          </div>

          <h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-mute">{d.financials.period} financials ({d.financials.status})</h3>
          <p className="text-xs">CET1 {d.financials.cet1Pct}% · LCR {d.financials.lcrPct}% · NSFR {d.financials.nsfrPct}% · property financing €{d.financials.propertyFinancingEurBn}bn · NPL €{d.financials.nplEurBn}bn · H1 impairments €{d.financials.h1ImpairmentsEurM}m · H1 adj. operating profit €{d.financials.h1AdjOperatingProfitEurM}m. <span className="text-mute">{d.financials.note}</span></p>

          <h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-mute">Sources and verification</h3>
          <ul className="list-disc pl-5 text-xs" data-testid="credit-sources">{d.sources.map((s) => <li key={s.label}>{s.label}: <b>{s.status}</b>. {s.note}</li>)}</ul>
        </>
      ) : null}
    </section>
  );
}

function Tile({ k, v, testid }: { k: string; v: string; testid: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-[#f5f5f7] px-3 py-2">
      <div className="text-[11px] leading-tight text-mute">{k}</div>
      <div className="mt-0.5 break-words text-[18px] font-semibold tabular-nums" data-testid={testid}>{v}</div>
    </div>
  );
}
