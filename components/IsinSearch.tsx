"use client";

import Link from "next/link";
import { useState } from "react";
import { RiskBadge } from "@/components/RiskBadge";
import { bondPagePath, type BondLang } from "@/lib/seo/bondPages";

type Found = { isin: string; issuer: string; currency: string; coupon: number | null; maturity: string | null; risk: number | null; ret: number | null; duration: number | null };
type State = { kind: "idle" } | { kind: "busy" } | { kind: "found"; bond: Found } | { kind: "invalid" } | { kind: "not_found" } | { kind: "error" };

export const ISIN_TEXT: Record<BondLang, Record<"title" | "lead" | "placeholder" | "search" | "invalid" | "notFound" | "error" | "issuer" | "coupon" | "maturity" | "risk" | "ret" | "years" | "open" | "lockedBtn", string>> = {
  en: { title: "Search a bond by ISIN", lead: "Type or paste an ISIN to see the bond.", placeholder: "ISIN, e.g. XS0000000000", search: "Search", invalid: "That is not a valid ISIN (2 letters, 9 letters or digits, 1 digit).", notFound: "We do not show this bond: it is unknown, or it has no rating, or it is not available on 10BONDS.", error: "Something went wrong. Please try again.", issuer: "Issuer", coupon: "Coupon", maturity: "Maturity", risk: "Risk", ret: "Return (per year)", years: "Duration", open: "Open bond page", lockedBtn: "Upgrade to search" },
  it: { title: "Cerca un bond per ISIN", lead: "Scrivi o incolla un ISIN per vedere il bond.", placeholder: "ISIN, es. XS0000000000", search: "Cerca", invalid: "Questo non è un ISIN valido (2 lettere, 9 lettere o cifre, 1 cifra).", notFound: "Non mostriamo questo bond: è sconosciuto, privo di rating o non disponibile su 10BONDS.", error: "Qualcosa è andato storto. Riprova.", issuer: "Emittente", coupon: "Cedola", maturity: "Scadenza", risk: "Rischio", ret: "Rendimento (annuo)", years: "Duration", open: "Apri la pagina del bond", lockedBtn: "Passa al piano superiore per cercare" },
  fr: { title: "Rechercher une obligation par ISIN", lead: "Saisissez ou collez un ISIN pour voir l'obligation.", placeholder: "ISIN, ex. XS0000000000", search: "Rechercher", invalid: "Ce n'est pas un ISIN valide (2 lettres, 9 lettres ou chiffres, 1 chiffre).", notFound: "Nous n'affichons pas cette obligation : elle est inconnue, sans notation ou indisponible sur 10BONDS.", error: "Une erreur s'est produite. Réessayez.", issuer: "Émetteur", coupon: "Coupon", maturity: "Échéance", risk: "Risque", ret: "Rendement (par an)", years: "Duration", open: "Ouvrir la page de l'obligation", lockedBtn: "Passez à l'offre supérieure pour rechercher" },
  de: { title: "Anleihe per ISIN suchen", lead: "ISIN eingeben oder einfügen, um die Anleihe zu sehen.", placeholder: "ISIN, z. B. XS0000000000", search: "Suchen", invalid: "Das ist keine gültige ISIN (2 Buchstaben, 9 Buchstaben oder Ziffern, 1 Ziffer).", notFound: "Diese Anleihe zeigen wir nicht: Sie ist unbekannt, ohne Rating oder bei 10BONDS nicht verfügbar.", error: "Etwas ist schiefgelaufen. Bitte erneut versuchen.", issuer: "Emittent", coupon: "Kupon", maturity: "Fälligkeit", risk: "Risiko", ret: "Rendite (pro Jahr)", years: "Duration", open: "Anleiheseite öffnen", lockedBtn: "Upgraden Sie zum Suchen" },
};

const BOX = "h-[188px]"; // fixed result slot: nothing moves when a result appears

export default function IsinSearch({ lang, allowed }: { lang: BondLang; allowed: boolean }) {
  const t = ISIN_TEXT[lang];
  const [q, setQ] = useState("");
  const [st, setSt] = useState<State>({ kind: "idle" });

  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (!allowed || !q.trim()) return;
    setSt({ kind: "busy" });
    try {
      const r = await fetch(`/api/bonds/lookup?isin=${encodeURIComponent(q)}`, { cache: "no-store" });
      const j = await r.json();
      if (j.status === "found") setSt({ kind: "found", bond: j.bond });
      else if (j.status === "invalid" || j.status === "not_found") setSt({ kind: j.status });
      else setSt({ kind: "error" });
    } catch {
      setSt({ kind: "error" });
    }
  }

  const rows = (b: Found): [string, React.ReactNode][] => [
    [t.issuer, b.issuer],
    [t.coupon, b.coupon === null ? "–" : `${b.coupon}%`],
    [t.maturity, b.maturity ?? "–"],
    [t.risk, <RiskBadge key="r" risk={b.risk} />],
    [t.ret, b.ret === null ? "–" : `${b.ret.toFixed(2)}%`],
    [t.years, b.duration === null ? "–" : `${b.duration.toFixed(1)}`],
  ];

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-[24px] font-semibold tracking-tight sm:text-[28px]">{t.title}</h1>
      <p className="mt-1 text-sm text-mute">{t.lead}</p>
      <form onSubmit={go} className="mt-4 flex gap-2">
        <input
          value={q} onChange={(e) => setQ(e.target.value)} disabled={!allowed} maxLength={20} autoComplete="off" spellCheck={false}
          placeholder={t.placeholder} aria-label="ISIN" data-testid="isin-input"
          className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-3 font-mono text-[15px] uppercase outline-none focus:border-accent disabled:opacity-60"
        />
        <button type="submit" disabled={!allowed || st.kind === "busy"} data-testid="isin-go" className="h-11 w-28 shrink-0 rounded-xl bg-accent text-sm font-semibold text-white disabled:opacity-50">
          {t.search}
        </button>
      </form>
      <div className={`relative mt-4 overflow-hidden rounded-2xl bg-white p-4 ${BOX}`} data-testid="isin-result">
        {!allowed ? (
          <>
            {/* Made-up figures, blurred: nothing real is sent to Free plans or visitors. */}
            <dl aria-hidden className="grid select-none grid-cols-2 gap-x-6 gap-y-3 text-[14px] blur-[6px]">
              {([[t.issuer, "Issuer name"], [t.coupon, "3.250%"], [t.maturity, "2031-03-15"], [t.risk, "4"], [t.ret, "3.80%"], [t.years, "4.6"]] as const).map(([k, v]) => (
                <div key={k}><dt className="text-xs text-mute">{k}</dt><dd className="mt-0.5 font-medium">{v}</dd></div>
              ))}
            </dl>
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <Link href="/pricing" data-testid="isin-locked-cta" className="rounded-full bg-accent px-5 py-2.5 text-center text-[14px] font-semibold text-white shadow-lg transition hover:opacity-90">{t.lockedBtn}</Link>
            </div>
          </>
        ) : st.kind === "found" ? (
          <>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[14px]">
              {rows(st.bond).map(([k, v]) => (
                <div key={k} className="min-w-0"><dt className="text-xs text-mute">{k}</dt><dd className="mt-0.5 truncate font-medium">{v}</dd></div>
              ))}
            </dl>
            <Link href={bondPagePath(lang, st.bond.isin)} className="absolute bottom-3 left-4 text-sm font-medium text-accent hover:underline">{t.open} · <span className="font-mono">{st.bond.isin}</span></Link>
          </>
        ) : (
          <p className="text-sm text-mute" role="status">
            {st.kind === "invalid" ? t.invalid : st.kind === "not_found" ? t.notFound : st.kind === "error" ? t.error : st.kind === "busy" ? "…" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
