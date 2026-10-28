"use client";

import Link from "next/link";
import { useState } from "react";
import { isIsinValid } from "@/lib/isinCheck";
import { RiskBadge } from "@/components/RiskBadge";
import { callableLabel, couponTypeLabel, seniorityLabel } from "@/lib/bondFacts";
import { fmtMin } from "@/lib/fmtMin";
import { bondPagePath, countryName, fmtDay, fmtPct, type BondLang } from "@/lib/seo/bondPages";
import type { CardAlt, CardBond } from "@/lib/bondCard";

type K = "title" | "lead" | "placeholder" | "search" | "invalid" | "notFound" | "error" | "ret" | "risk" | "industry" | "country" | "spread" | "spreadBund" | "spreadUst" | "efficiency" | "efficiencyHint" | "afterLoss" | "expLoss" | "defChance" | "coupon" | "maturity" | "duration" | "price" | "seniority" | "couponType" | "callable" | "minimum" | "currency" | "issuer" | "ratingTen" | "alts" | "back" | "altsLead" | "altsNone" | "altsHead" | "open" | "upgrade" | "empty" | "pa" | "perYear" | "toMaturity" | "rank" | "of" | "rNoRating" | "rNotListed" | "rMatured" | "rDormant" | "rNoYield" | "rStructure" | "rQuality" | "retry" | "checked" | "exclPrefix";
export const CARD_TEXT: Record<BondLang, Record<K, string>> = {
  en: { title: "Bond Card", lead: "Paste an ISIN to see every figure we hold for the bond.", placeholder: "ISIN", search: "Search", invalid: "That is not a valid ISIN.", notFound: "We do not show this bond: it is unknown, has no rating, or is not available on 10BONDS.", error: "Something went wrong. Please try again.", ret: "Return (per year)", risk: "Risk", industry: "Industry", country: "Country", spread: "Yield difference", spreadBund: "vs euro government benchmark", spreadUst: "vs US government benchmark", efficiency: "Efficiency", efficiencyHint: "Bond Efficiency Score: pay for the credit risk taken, compared with similar bonds", afterLoss: "Return after expected loss", expLoss: "Expected loss (per year)", defChance: "Default chance to maturity", coupon: "Coupon", maturity: "Maturity", duration: "Duration", price: "Price", seniority: "Seniority", couponType: "Coupon type", callable: "Callable", minimum: "Minimum", currency: "Currency", issuer: "Issuer", ratingTen: "10bonds.com rating", alts: "Better alternatives", back: "Back to the card", altsLead: "Same risk, similar duration, higher return", altsNone: "No bond with the same risk and a higher return right now.", altsHead: "Efficiency", open: "Open bond page", upgrade: "Upgrade to search", empty: "Your bond appears here", pa: "%", perYear: "per year", toMaturity: "yrs", rank: "Rank", of: "of", rNoRating: "We do not show this bond: it has no rating.", rNotListed: "This ISIN is not in our list of bonds.", rMatured: "This bond has already matured.", rDormant: "This bond needs a very large minimum investment, so we keep it out.", rNoYield: "This bond has no yield or duration in our data yet.", rStructure: "This bond does not pay a fixed coupon (floating, step-up or inflation-linked), so we do not model it.", rQuality: "This bond is in our data but is left out by our quality checks (for example price or yield).", retry: "Retry", checked: "Checked on", exclPrefix: "Excluded from portfolios:" },
  it: { title: "Bond Card", lead: "Incolla un ISIN per vedere tutte le cifre che abbiamo del bond.", placeholder: "ISIN", search: "Cerca", invalid: "Questo non è un ISIN valido.", notFound: "Non mostriamo questo bond: è sconosciuto, privo di rating o non disponibile su 10BONDS.", error: "Qualcosa è andato storto. Riprova.", ret: "Rendimento (annuo)", risk: "Rischio", industry: "Settore", country: "Paese", spread: "Differenza di rendimento", spreadBund: "vs benchmark governativo euro", spreadUst: "vs benchmark governativo USA", efficiency: "Efficienza", efficiencyHint: "Quota di bond simili (stessa valuta, duration simile) con rendimento inferiore dopo le perdite attese", afterLoss: "Rendimento dopo la perdita attesa", expLoss: "Perdita attesa (annua)", defChance: "Probabilità di default a scadenza", coupon: "Cedola", maturity: "Scadenza", duration: "Duration", price: "Prezzo", seniority: "Rango", couponType: "Tipo cedola", callable: "Callable", minimum: "Minimo", currency: "Valuta", issuer: "Emittente", ratingTen: "Rating 10bonds.com", alts: "Alternative migliori", back: "Torna alla scheda", altsLead: "Stesso rischio, duration simile, rendimento più alto", altsNone: "Al momento nessun bond con lo stesso rischio e rendimento più alto.", altsHead: "Efficienza", open: "Apri la pagina del bond", upgrade: "Passa al piano superiore", empty: "Il tuo bond appare qui", pa: "%", perYear: "annuo", toMaturity: "anni", rank: "Posizione", of: "su", rNoRating: "Non mostriamo questo bond: non ha rating.", rNotListed: "Questo ISIN non è nella nostra lista di bond.", rMatured: "Questo bond è già scaduto.", rDormant: "Questo bond richiede un investimento minimo molto alto, quindi lo escludiamo.", rNoYield: "Per questo bond non abbiamo ancora rendimento o duration.", rStructure: "Questo bond ha una struttura che non modelliamo (variabile, step-up o indicizzata).", rQuality: "Questo bond è nei nostri dati ma escluso dai controlli di qualità (ad esempio prezzo o rendimento).", retry: "Riprova", checked: "Verificato il", exclPrefix: "Escluso dai portafogli:" },
  fr: { title: "Bond Card", lead: "Collez un ISIN pour voir tous les chiffres de l'obligation.", placeholder: "ISIN", search: "Rechercher", invalid: "Ce n'est pas un ISIN valide.", notFound: "Nous n'affichons pas cette obligation : elle est inconnue, sans notation ou indisponible sur 10BONDS.", error: "Une erreur s'est produite. Réessayez.", ret: "Rendement (par an)", risk: "Risque", industry: "Secteur", country: "Pays", spread: "Écart de rendement", spreadBund: "vs référence États euro", spreadUst: "vs référence États-Unis", efficiency: "Efficacité", efficiencyHint: "Part des obligations similaires (même devise, duration proche) avec un rendement plus faible après pertes attendues", afterLoss: "Rendement après perte attendue", expLoss: "Perte attendue (par an)", defChance: "Probabilité de défaut à l'échéance", coupon: "Coupon", maturity: "Échéance", duration: "Duration", price: "Prix", seniority: "Rang", couponType: "Type de coupon", callable: "Remboursable", minimum: "Minimum", currency: "Devise", issuer: "Émetteur", ratingTen: "Note 10bonds.com", alts: "Meilleures alternatives", back: "Retour à la fiche", altsLead: "Même risque, duration proche, rendement plus élevé", altsNone: "Aucune obligation de même risque avec un rendement plus élevé pour le moment.", altsHead: "Efficacité", open: "Ouvrir la page de l'obligation", upgrade: "Passez à l'offre supérieure", empty: "Votre obligation apparaît ici", pa: "%", perYear: "par an", toMaturity: "ans", rank: "Rang", of: "sur", rNoRating: "Nous n'affichons pas cette obligation : elle n'a pas de notation.", rNotListed: "Cet ISIN n'est pas dans notre liste.", rMatured: "Cette obligation est déjà échue.", rDormant: "Cette obligation exige un minimum très élevé, nous l'écartons.", rNoYield: "Cette obligation n'a pas encore de rendement ni de duration dans nos données.", rStructure: "Cette obligation a une structure que nous ne modélisons pas.", rQuality: "Cette obligation est dans nos données mais écartée par nos contrôles de qualité.", retry: "Réessayer", checked: "Vérifié le", exclPrefix: "Exclue des portefeuilles :" },
  de: { title: "Bond Card", lead: "ISIN einfügen, um alle Kennzahlen der Anleihe zu sehen.", placeholder: "ISIN", search: "Suchen", invalid: "Das ist keine gültige ISIN.", notFound: "Diese Anleihe zeigen wir nicht: Sie ist unbekannt, ohne Rating oder bei 10BONDS nicht verfügbar.", error: "Etwas ist schiefgelaufen. Bitte erneut versuchen.", ret: "Rendite (pro Jahr)", risk: "Risiko", industry: "Branche", country: "Land", spread: "Renditeabstand", spreadBund: "vs Euro-Staatsbenchmark", spreadUst: "vs US-Staatsbenchmark", efficiency: "Effizienz", efficiencyHint: "Anteil ähnlicher Anleihen (gleiche Währung, ähnliche Duration) mit niedrigerer Rendite nach erwartetem Verlust", afterLoss: "Rendite nach erwartetem Verlust", expLoss: "Erwarteter Verlust (pro Jahr)", defChance: "Ausfallwahrscheinlichkeit bis Fälligkeit", coupon: "Kupon", maturity: "Fälligkeit", duration: "Duration", price: "Kurs", seniority: "Rang", couponType: "Kupontyp", callable: "Kündbar", minimum: "Minimum", currency: "Währung", issuer: "Emittent", ratingTen: "10bonds.com-Rating", alts: "Bessere Alternativen", back: "Zurück zur Karte", altsLead: "Gleiches Risiko, ähnliche Duration, höhere Rendite", altsNone: "Derzeit keine Anleihe mit gleichem Risiko und höherer Rendite.", altsHead: "Effizienz", open: "Anleiheseite öffnen", upgrade: "Upgraden zum Suchen", empty: "Ihre Anleihe erscheint hier", pa: "%", perYear: "pro Jahr", toMaturity: "J.", rank: "Rang", of: "von", rNoRating: "Diese Anleihe zeigen wir nicht: Sie hat kein Rating.", rNotListed: "Diese ISIN ist nicht in unserer Liste.", rMatured: "Diese Anleihe ist bereits fällig geworden.", rDormant: "Diese Anleihe verlangt eine sehr hohe Mindestanlage, deshalb lassen wir sie weg.", rNoYield: "Für diese Anleihe haben wir noch keine Rendite oder Duration.", rStructure: "Diese Anleihe hat eine Struktur, die wir nicht modellieren.", rQuality: "Diese Anleihe ist in unseren Daten, wird aber von unseren Qualitätsprüfungen ausgeschlossen.", retry: "Erneut versuchen", checked: "Geprüft am", exclPrefix: "Aus Portfolios ausgeschlossen:" },
};

const SAMPLE: CardBond = {
  isin: "XS0000000000", issuer: "Issuer name", name: "Issuer name", currency: "EUR", country: "DE", industry: "Industrials", coupon: 3.25, couponType: "fixed", seniority: "Senior preferred", maturity: "2031-03-15", issueDate: null, callable: false,
  minInvestment: 1000, price: 99.1, priceDate: "2026-10-27", risk: 4, lrScore: null, ret: 3.8, duration: 4.6, lifeYears: 4.7, defaultChance: 1.2, lossGivenDefault: 0.6, expectedLoss: 0.15, afterLoss: 3.65, benchmark: "bund", spreadBp: 120, efficiency: 62, peerRank: 100, peers: 260,
};

type State = { kind: "idle" } | { kind: "busy" } | { kind: "found"; card: CardBond; excluded: string | null } | { kind: "invalid" } | { kind: "not_found"; reason: string; checkedAt: string } | { kind: "error" };
const SLOT = "h-[470px]"; // fixed result slot: nothing moves when a bond or the alternatives appear

export default function BondCard({ lang, allowed, initialIsin = "" }: { lang: BondLang; allowed: boolean; initialIsin?: string }) {
  const t = CARD_TEXT[lang];
  const [q, setQ] = useState(initialIsin);
  const [st, setSt] = useState<State>({ kind: "idle" });
  const [alts, setAlts] = useState<CardAlt[] | null>(null);
  const [showAlts, setShowAlts] = useState(false);
  const [altBusy, setAltBusy] = useState(false);

  async function go(e?: React.FormEvent) {
    e?.preventDefault();
    if (!allowed || !q.trim()) return;
    const isin = q.replace(/\s+/g, "").toUpperCase();
    setAlts(null);
    setShowAlts(false);
    if (!isIsinValid(isin)) { setSt({ kind: "invalid" }); return; }
    setSt({ kind: "busy" });
    // Never an endless wait: give up after 3.5 s with an error and a Retry button; the button is free again after any outcome.
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 3500);
    try {
      const r = await fetch(`/api/bonds/card?isin=${encodeURIComponent(isin)}`, { cache: "no-store", signal: ctl.signal });
      const j = await r.json();
      if (j.status === "found") setSt({ kind: "found", card: j.card, excluded: j.excluded ?? null });
      else if (j.status === "invalid") setSt({ kind: "invalid" });
      else if (j.status === "not_found") setSt({ kind: "not_found", reason: String(j.reason ?? ""), checkedAt: String(j.checkedAt ?? "") });
      else setSt({ kind: "error" });
    } catch {
      setSt({ kind: "error" });
    } finally {
      clearTimeout(timer);
    }
  }

  const reasonText = (r: string | null | undefined) => ({ no_rating: t.rNoRating, not_listed: t.rNotListed, matured: t.rMatured, dormant: t.rDormant, no_yield: t.rNoYield, structure: t.rStructure, quality: t.rQuality } as Record<string, string>)[r ?? ""] ?? t.notFound;

  async function openAlts(isin: string) {
    setShowAlts(true);
    if (alts) return;
    setAltBusy(true);
    try {
      const j = await (await fetch(`/api/bonds/card?isin=${isin}&alts=1`, { cache: "no-store", signal: AbortSignal.timeout(3500) })).json();
      setAlts(j.status === "found" ? j.alternatives ?? [] : []);
    } catch {
      setAlts([]);
    } finally {
      setAltBusy(false);
    }
  }

  const num = (n: number | null | undefined, d = 2, suffix = "") => (n === null || n === undefined ? "–" : `${fmtPct(lang, n, d)}${suffix}`);
  const card = st.kind === "found" ? st.card : !allowed ? SAMPLE : null;

  const tiles = (c: CardBond): [string, React.ReactNode, string?][] => [
    [t.ret, num(c.ret, 2, "%")],
    [t.risk, <RiskBadge key="r" risk={c.risk} size="lg" />],
    [t.efficiency, c.efficiency === null ? "–" : `${c.efficiency}/100`, t.efficiencyHint],
    [`${t.spread} ${c.benchmark === "bund" ? t.spreadBund : t.spreadUst}`, c.spreadBp === null ? "–" : `${c.spreadBp > 0 ? "+" : ""}${c.spreadBp} bp`],
  ];
  const rows = (c: CardBond): [string, React.ReactNode][] => [
    [t.industry, c.industry ?? "–"],
    [t.country, countryName(lang, c.country) ?? "–"],
    [t.afterLoss, num(c.afterLoss, 2, "%")],
    [t.expLoss, num(c.expectedLoss, 2, "%")],
    [t.defChance, num(c.defaultChance, 1, "%")],
    [t.coupon, c.coupon === null ? "–" : `${fmtPct(lang, c.coupon, 3)}%`],
    [t.maturity, c.maturity ? fmtDay(lang, c.maturity) : "–"],
    [t.duration, c.duration === null ? "–" : `${fmtPct(lang, c.duration, 1)} ${t.toMaturity}`],
    [t.price, c.price === null ? "–" : `${fmtPct(lang, c.price, 2)}${c.priceDate ? ` · ${fmtDay(lang, c.priceDate.slice(0, 10))}` : ""}`],
    [t.seniority, seniorityLabel(lang, c.seniority)],
    [t.couponType, couponTypeLabel(lang, c.couponType)],
    [t.callable, callableLabel(lang, c.callable)],
    [t.minimum, fmtMin(c.minInvestment, c.currency)],
    [t.currency, c.currency],
    ...(c.lrScore === null ? [] : ([[t.ratingTen, `${Math.round(c.lrScore)}/100`]] as [string, React.ReactNode][])),
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <section>
        <h1 className="text-[24px] font-semibold tracking-tight sm:text-[28px]">{t.title}</h1>
        <p className="mt-1 text-sm text-mute">{t.lead}</p>
        <form onSubmit={go} className="mt-4 flex flex-col gap-3">
          <input
            value={q} onChange={(e) => setQ(e.target.value.toUpperCase())} disabled={!allowed} maxLength={20} autoComplete="off" spellCheck={false}
            placeholder={t.placeholder} aria-label="ISIN" data-testid="card-input"
            className="h-16 w-full rounded-2xl border border-line bg-white px-4 font-mono text-[22px] uppercase tracking-wide outline-none focus:border-accent disabled:opacity-60 sm:h-20 sm:text-[28px]"
          />
          {allowed ? (
            <button type="submit" disabled={st.kind === "busy"} data-testid="card-go" className="h-11 w-full rounded-xl bg-accent text-sm font-semibold text-white disabled:opacity-50">{t.search}</button>
          ) : (
            <Link href="/pricing" data-testid="card-locked-cta" className="flex h-11 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-white">{t.upgrade}</Link>
          )}
          <div className="min-h-[44px] text-sm text-mute" role="status">
            {st.kind === "invalid" ? t.invalid : st.kind === "not_found" ? (
              <>{reasonText(st.reason)}{st.checkedAt ? <span className="block text-xs">{t.checked} {st.checkedAt.slice(0, 10)}</span> : null}</>
            ) : st.kind === "error" ? (
              <>{t.error} <button type="button" onClick={() => go()} data-testid="card-retry" className="font-medium text-accent hover:underline">{t.retry}</button></>
            ) : ""}
          </div>
        </form>
      </section>

      <section className={`relative overflow-hidden rounded-lg border border-line bg-white p-4 ${SLOT}`} data-testid="card-result">
        {!card ? (
          <p className="flex h-full items-center justify-center text-sm text-mute">{st.kind === "busy" ? "…" : t.empty}</p>
        ) : showAlts && allowed ? (
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold">{card.issuer} · <span className="font-mono text-[13px] font-normal text-mute">{card.isin}</span></div>
                <div className="text-xs text-mute">{t.altsLead}</div>
              </div>
              <button type="button" onClick={() => setShowAlts(false)} className="shrink-0 text-sm font-medium text-accent hover:underline" data-testid="card-back">{t.back}</button>
            </div>
            <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
              {altBusy || !alts ? <p className="text-sm text-mute">…</p> : alts.length === 0 ? <p className="text-sm text-mute">{t.altsNone}</p> : (
                <table className="w-full text-left text-[13px]">
                  <thead className="text-xs text-mute"><tr><th className="py-1 font-normal">{t.issuer}</th><th className="font-normal">{t.risk}</th><th className="text-right font-normal">{t.ret}</th><th className="text-right font-normal">{t.afterLoss}</th><th className="text-right font-normal">{t.altsHead}</th></tr></thead>
                  <tbody>
                    {alts.map((a) => (
                      <tr key={a.isin} className="border-t border-line/60">
                        <td className="max-w-[180px] py-1.5"><Link href={`/bond-card?isin=${a.isin}${lang === "en" ? "" : `&lang=${lang}`}`} className="block truncate font-medium hover:text-accent">{a.issuer}</Link><span className="font-mono text-[11px] text-mute">{a.isin}</span></td>
                        <td><RiskBadge risk={a.risk} /></td>
                        <td className="text-right tabular-nums">{num(a.ret, 2, "%")}</td>
                        <td className="text-right tabular-nums">{num(a.afterLoss, 2, "%")}</td>
                        <td className="text-right font-semibold tabular-nums">{a.efficiency === null ? "–" : `${a.efficiency}/100`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          <div className={`flex h-full flex-col ${allowed ? "" : "select-none blur-[6px]"}`} aria-hidden={!allowed}>
            <div className="min-w-0">
              <div className="truncate text-[18px] font-semibold">{card.issuer}</div>
              <div className="font-mono text-xs text-mute">{card.isin} · {card.currency}</div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {tiles(card).map(([k, v, hint]) => (
                <div key={k} title={hint} className="min-w-0 rounded-lg bg-[#f5f5f7] px-3 py-2">
                  <div className="line-clamp-2 h-7 text-[11px] leading-tight text-mute">{k}</div>
                  <div className="mt-0.5 flex h-8 items-center text-[20px] font-semibold tabular-nums">{v}</div>
                </div>
              ))}
            </div>
            <dl className="mt-3 grid min-h-0 flex-1 grid-cols-2 content-start gap-x-6 gap-y-2 text-[13px] sm:grid-cols-3">
              {rows(card).map(([k, v]) => (
                <div key={k} className="min-w-0"><dt className="truncate text-[11px] text-mute">{k}</dt><dd className="mt-0.5 truncate font-medium">{v}</dd></div>
              ))}
            </dl>
            <p className="min-h-[18px] pt-1 text-xs font-medium text-red-600" data-testid="card-excluded">{st.kind === "found" && st.excluded ? `${t.exclPrefix} ${reasonText(st.excluded)}` : ""}</p>
            <div className="flex items-center justify-between gap-2 pt-2">
              {st.kind === "found" && st.excluded ? <span /> : <Link href={bondPagePath(lang, card.isin)} className="text-sm font-medium text-accent hover:underline">{t.open}</Link>}
              <button type="button" onClick={() => openAlts(card.isin)} disabled={st.kind === "found" && Boolean(st.excluded)} data-testid="card-alts" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{t.alts}</button>
            </div>
          </div>
        )}
        {!allowed && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <Link href="/pricing" className="rounded-full bg-accent px-5 py-2.5 text-center text-[14px] font-semibold text-white shadow-lg transition hover:opacity-90">{t.upgrade}</Link>
          </div>
        )}
      </section>
    </div>
  );
}
