// Builds one issue of the redesigned weekly e-mail (English; the other languages follow once the format is approved).
// Same issue for every subscriber, no personalisation. Nothing here sends mail or touches the database; production
// weekly sending stays as it is (lib/weeklySend.ts) until the owner approves this format.
import { COMPANY } from "../legal";
import { esc, siteUrl } from "../email";
import { FOOTER_NOTE } from "../footerNote";
import { ECB_POLICY_PAGE, ECB_REUSE_PAGE, ECB_URLS, curveFrom, parseEcbCsv, policyFrom, type Curve, type Policy } from "./ecb";
import { chooseVersion, scanOutput, type BondInput, type Decision, type GateOptions, type Version, type Violation } from "./gate";

export type IssueInput = {
  now: Date;
  curveCsv: string;
  depositCsv: string;
  bonds?: BondInput[];
  unsubscribe: string | null;
  base?: string;
  /** Approved conflicts-of-interest text; required before any named security can be listed. */
  conflictsText?: string;
  retrievedAt?: string;
};

export type Issue = {
  version: Version | "none";
  decision: Decision;
  subject: string;
  html: string;
  text: string;
  violations: Violation[];
  figures: string[];
  /** True only for a real build from verified rights; false for previews and when the checks found anything. */
  sendable: boolean;
  issueKey: string;
  publishedAt: string;
};

const LOCALE = "en-GB";
const TZ = "Europe/Rome";
const f2 = (v: number) => v.toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const day = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(LOCALE, { day: "numeric", month: "short", timeZone: "UTC" });
const dayY = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(LOCALE, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** ISO week key, e.g. "2026-W44": the idempotency key of an issue (one issue per week per version). */
export function issueWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const wd = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - wd);
  const start = Date.UTC(t.getUTCFullYear(), 0, 1);
  return `${t.getUTCFullYear()}-W${String(Math.ceil(((t.getTime() - start) / 86400_000 + 1) / 7)).padStart(2, "0")}`;
}

const bp = (v: number) => {
  const n = Math.round(v);
  return `${n > 0 ? "+" : n < 0 ? "-" : ""}${Math.abs(n)} bp`;
};

function subjectFor(c: Curve, fig: (s: string) => string): string {
  const r10 = c.rows.find((r) => r.tenor === 10)!;
  const b = Math.round(Math.abs(r10.changeBp));
  const move = b === 0 ? "were unchanged" : `${r10.changeBp < 0 ? "fell" : "rose"} ${fig(b + " bp")}`;
  return `Euro AAA government yields ${move} this week: 10-year at ${fig(f2(r10.now) + "%")} · ${day(c.asOf)}`;
}

/** Builds the issue. Missing rights or stale data downgrade the version (or build nothing); they are never assumed. */
export function buildIssue(input: IssueInput, o: GateOptions = {}): Issue {
  const today = input.now.toISOString().slice(0, 10);
  const figures: string[] = [];
  const fig = (s: string) => (figures.push(s), s);
  const curveR = curveFrom(parseEcbCsv(input.curveCsv), today);
  const polR = policyFrom(parseEcbCsv(input.depositCsv), today);
  const ecbOk = curveR.ok && polR.ok;
  const decision = chooseVersion({ ecbOk, bonds: input.bonds ?? [] }, o);
  const publishedAt = input.now.toLocaleString(LOCALE, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ, timeZoneName: "short" });
  const issueKey = `${issueWeek(input.now)}-${decision.version}`;
  if (decision.version === "none" || !curveR.ok || !polR.ok) {
    const why = !curveR.ok ? curveR.reason : !polR.ok ? polR.reason : decision.reasons.join(" ");
    return { version: "none", decision: { ...decision, reasons: [...decision.reasons, why] }, subject: "", html: "", text: "", violations: [], figures, sendable: false, issueKey, publishedAt };
  }
  const curve = curveR.curve, policy: Policy = polR.policy, version = decision.version as Version;
  const base = input.base ?? siteUrl();
  const finder = `${base}/`;
  const subject = subjectFor(curve, fig);
  const retrieved = input.retrievedAt ?? input.now.toISOString();
  const r = (t: number) => curve.rows.find((x) => x.tenor === t)!;
  const r2 = r(2), r10 = r(10);
  const gapNow = curve.slopeNow;
  const gapPrior = gapNow - curve.slopePriorChangeBp;

  // Section A: one observation, in words and one table
  const dir10 = r10.changeBp < 0 ? "lower" : r10.changeBp > 0 ? "higher" : "unchanged";
  const insight = `The euro-area AAA government 10-year spot rate was ${fig(f2(r10.now) + "%")} on ${day(curve.asOf)}, ${Math.round(Math.abs(r10.changeBp)) === 0 ? "unchanged from" : `${fig(bp(Math.abs(r10.changeBp)).replace("+", ""))} ${dir10} than on`} ${day(curve.priorDate)} (${fig(f2(r10.prior) + "%")}). The 2-year rate moved ${fig(bp(r2.changeBp))}, so the gap between the 10-year and the 2-year ${gapNow < gapPrior ? "narrowed" : gapNow > gapPrior ? "widened" : "stayed the same"}: ${fig(Math.round(gapNow) + " bp")} now, ${fig(Math.round(gapPrior) + " bp")} a week earlier.`;
  const tableRows = curve.rows.map((x) => ({ tenor: `${x.tenor}-year`, now: fig(f2(x.now) + "%"), prior: fig(f2(x.prior) + "%"), chg: fig(bp(x.changeBp)) }));

  // Section C: one comparison from approved data only
  const spread2 = (r2.now - policy.rate) * 100;
  const comparison = `The 2-year spot rate (${fig(f2(r2.now) + "%")}) is ${fig(Math.round(Math.abs(spread2)) + " bp")} ${spread2 >= 0 ? "above" : "below"} the ECB deposit facility rate (${fig(f2(policy.rate) + "%")}, in force since ${dayY(policy.since)}).`;

  // Bonds section (A and B only)
  const bonds = decision.bonds;
  const bondRows = [...bonds].sort((a, b) => a.issuer.localeCompare(b.issuer) || a.isin.localeCompare(b.isin));
  const showReturn = version === "A";
  const bondHead = ["Issuer · ISIN", "Cur.", "Coupon", "Maturity", ...(showReturn ? ["Return (per year)"] : [])];
  const bondCells = bondRows.map((b) => [`${b.issuer}\n${b.isin}`, b.currency, fig(f2(b.coupon!) + "%"), dayY(b.maturity!), ...(showReturn ? [b.returnPerYear == null ? "–" : fig(f2(b.returnPerYear) + "%")] : [])]);
  const bondRule = `These are the EUR bonds in our database first issued in the 7 days to ${day(curve.asOf)}, listed alphabetically by issuer. The list is a record of new issues, not a choice by quality, return or suitability.`;
  const defs = version === "B"
    ? "Coupon: the interest rate set in the bond's terms, paid on its nominal value. Terms are taken from the sources shown."
    : "Coupon: the interest rate set in the bond's terms, paid on its nominal value. Return (per year): an estimate of what a bond would earn per year if bought at today's price and held to maturity; not guaranteed. Realised return: what an investor actually earned afterwards. Spot rate: the yield of a hypothetical zero-coupon government bond; it describes the market, not any single bond.";
  const sources = [
    { name: "ECB Data Portal, euro-area AAA government yield curve (spot rates, Svensson model)", url: ECB_URLS.curve.split("?")[0], asOf: dayY(curve.asOf) },
    { name: "ECB key interest rates (deposit facility)", url: ECB_POLICY_PAGE, asOf: dayY(policy.since) },
    ...(version !== "C" ? bondRows.filter((b) => b.primary).map((b) => ({ name: `${b.issuer} ${b.isin}: ${b.primary!.label}`, url: b.primary!.url, asOf: dayY(b.primary!.retrievedAt.slice(0, 10)) })) : []),
  ];
  const sameFor = "This is the same e-mail for every subscriber. It is not based on your finances, goals or circumstances.";
  figures.push("1 bp");
  const changed = "Changes in basis points (1 bp = 0.01 percentage point) are calculated by 10BONDS from ECB figures; they are not ECB figures.";
  const seller = `${COMPANY.legalName}, ${COMPANY.address}`;
  const why = "You get this e-mail because you asked for the weekly 10BONDS e-mail.";
  const cta = "Screen bonds yourself on 10bonds.com";
  const ctaHint = "Choose your own horizon, return and risk level and compare bonds independently.";
  const conflicts = input.conflictsText?.trim() ?? "";
  const named = version !== "C";

  const text = [
    "10BONDS · Weekly bond-market note",
    `Published ${publishedAt}`,
    "",
    "1. The week's insight",
    insight,
    ...tableRows.map((x) => `  ${x.tenor}: ${x.now} (week earlier ${x.prior}, ${x.chg})`),
    changed,
    "",
    ...(named ? ["2. New euro bonds on record", bondRule, ...bondCells.map((c) => `  ${[c[0].replace("\n", " · "), ...c.slice(1)].join(" · ")}`), `Selection rule above. ${conflicts}`, ""] : ["2. Official policy rate", `The ECB deposit facility rate is ${fig(f2(policy.rate) + "%")}, in force since ${dayY(policy.since)}. Details: ${ECB_POLICY_PAGE}`, ""]),
    "3. One comparison",
    comparison,
    "",
    "Definitions",
    defs,
    "",
    `4. ${cta}`,
    `${ctaHint} ${finder}`,
    "",
    "Sources",
    ...sources.map((s) => `  ${s.name}, data of ${s.asOf}: ${s.url}`),
    `Retrieved ${retrieved}. ECB statistics reused under the ECB reuse policy: ${ECB_REUSE_PAGE}`,
    "",
    "--",
    FOOTER_NOTE.en,
    sameFor,
    `Sent by ${seller}.`,
    why,
    ...(input.unsubscribe ? [`Unsubscribe: ${input.unsubscribe}`] : []),
  ].join("\n");

  const th = "padding:8px 6px;font-size:12px;font-weight:600;color:#6e6e73;text-align:left;border-bottom:1px solid #e8e8ed";
  const td = "padding:9px 4px;font-size:13px;border-bottom:1px solid #f0f0f3";
  const h = "padding-top:26px;font-size:17px;font-weight:600;color:#1d1d1f";
  const p = "padding-top:8px;font-size:15px;line-height:1.55;color:#424245";
  const muted = "font-size:12px;line-height:1.55;color:#86868b;word-break:break-word;overflow-wrap:anywhere";
  const tbl = (head: string[], rows: string[][], right: number[]) =>
    `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;table-layout:auto"><tr>${head.map((x, i) => `<th style="${th}${right.includes(i) ? ";text-align:right" : ""}">${esc(x)}</th>`).join("")}</tr>${rows.map((c) => `<tr>${c.map((x, i) => `<td style="${td}${right.includes(i) ? ";text-align:right" : ""}${i === 0 ? ";font-weight:600" : ""}">${esc(x).replace(/\n/g, "<br><span style=\"font-weight:400;font-size:11px;color:#86868b\">") + (x.includes("\n") ? "</span>" : "")}</td>`).join("")}</tr>`).join("")}</table>`;

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head><body style="margin:0;background:#ffffff;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
<tr><td style="font-size:20px;font-weight:700">10BONDS</td></tr>
<tr><td style="padding-top:4px;${muted}">Weekly bond-market note · published ${esc(publishedAt)}</td></tr>
<tr><td style="padding-top:18px;font-size:22px;line-height:1.3;font-weight:600">${esc(subject.replace(/ · .*$/, ""))}</td></tr>
<tr><td style="${h}">1. The week's insight</td></tr>
<tr><td style="${p}">${esc(insight)}</td></tr>
<tr><td style="padding-top:12px">${tbl(["Maturity", day(curve.asOf), day(curve.priorDate), "Change"], tableRows.map((x) => [x.tenor, x.now, x.prior, x.chg]), [1, 2, 3])}</td></tr>
<tr><td style="padding-top:6px;${muted}">Euro-area AAA government spot rates. ${esc(changed)}</td></tr>
${named
  ? `<tr><td style="${h}">2. New euro bonds on record</td></tr>
<tr><td style="${p}">${esc(bondRule)}</td></tr>
<tr><td style="padding-top:12px"><!--bonds-->${tbl(bondHead, bondCells, showReturn ? [2, 4] : [2])}<!--/bonds--></td></tr>
<tr><td style="padding-top:8px;${muted}">${esc(conflicts)}</td></tr>`
  : `<tr><td style="${h}">2. Official policy rate</td></tr>
<tr><td style="${p}">The ECB deposit facility rate is ${esc(f2(policy.rate) + "%")}, in force since ${esc(dayY(policy.since))}. <a href="${esc(ECB_POLICY_PAGE)}" style="color:#0071e3">ECB key interest rates</a>.</td></tr>`}
<tr><td style="${h}">3. One comparison</td></tr>
<tr><td style="${p}">${esc(comparison)}</td></tr>
<tr><td style="${h}">Definitions</td></tr>
<tr><td style="${p};font-size:14px">${esc(defs)}</td></tr>
<tr><td style="padding:26px 0 4px"><a href="${esc(finder)}" style="display:inline-block;background:#0071e3;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:999px">${esc(cta)}</a></td></tr>
<tr><td style="padding-top:6px;font-size:13px;color:#6e6e73">${esc(ctaHint)}</td></tr>
<tr><td style="padding-top:26px;border-bottom:1px solid #e8e8ed"></td></tr>
<tr><td style="padding-top:14px;${muted}"><b>Sources</b><br>${sources.map((s) => `${esc(s.name)}, data of ${esc(s.asOf)}: <a href="${esc(s.url)}" style="color:#86868b">${esc(s.url)}</a>`).join("<br>")}<br>Retrieved ${esc(retrieved)}. ECB statistics reused under the <a href="${esc(ECB_REUSE_PAGE)}" style="color:#86868b">ECB reuse policy</a>.</td></tr>
<tr><td style="padding-top:14px;${muted}">${esc(FOOTER_NOTE.en)}<br>${esc(sameFor)}<br><br>Sent by ${esc(seller)}.<br>${esc(why)}${input.unsubscribe ? ` <a href="${esc(input.unsubscribe)}" style="color:#86868b">Unsubscribe</a>.` : ""}</td></tr>
</table></td></tr></table></body></html>`;

  const violations = scanOutput({ subject, html, text }, version, figures);
  if (named && !conflicts) violations.push({ rule: "named securities need the approved conflicts-of-interest text", sample: "" });
  if (!input.unsubscribe && decision.sendable) violations.push({ rule: "a sendable issue needs an unsubscribe link", sample: "" });
  return { version, decision, subject, html, text, violations, figures, sendable: decision.sendable && !violations.length, issueKey, publishedAt };
}
