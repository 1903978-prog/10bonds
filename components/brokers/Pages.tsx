import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/currentUser";
import { brokerPath, CONTENT, methodologyPath, sectionPath, type CountryContent } from "@/lib/brokers/content";
import { describeRule } from "@/lib/brokers/fees";
import { abs } from "@/lib/brokers/seo";
import { loadPublicData } from "@/lib/brokers/store";
import { CATEGORIES, COUNTRIES, SCENARIOS, type Country } from "@/lib/brokers/types";
import { brokerView, countryView, type Row } from "@/lib/brokers/view";
import CostTable, { type TableRow } from "./CostTable";
import { formatters } from "./format";
import { prose } from "@/components/seo/Seo";
import { landingFor } from "@/lib/seo/landingLivio";
import { sanitizeHtml } from "@/lib/seo/sanitize";

// Server-rendered pages of the Brokers & Trading Fees section, shared by the /it, /fr and /de routes.

const card = "rounded-[28px] bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-8";
const today = () => new Date().toISOString().slice(0, 10);

/** Unpublished countries are visible to the admin only (preview). */
async function load(country: Country) {
  const data = await loadPublicData();
  const published = data.countries[country].published;
  let preview = false;
  if (!published) {
    const user = await currentUser();
    if (!user?.isAdmin) notFound();
    preview = true;
  }
  return { data, published, preview };
}

export async function isPublished(country: Country) {
  return (await loadPublicData()).countries[country].published;
}

function JsonLd({ data }: { data: unknown }) {
  // JSON-LD is data, not script; "<" is escaped so text can never close the tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

function Crumbs({ t, items }: { t: CountryContent; items: { name: string; href: string }[] }) {
  const all = [{ name: t.ui.breadcrumbHome, href: "/" }, ...items];
  return (
    <>
      <nav aria-label="breadcrumb" className="text-xs text-mute">
        {all.map((c, i) => (
          <span key={i}>
            {i > 0 && " / "}
            {i === all.length - 1 ? <span>{c.name}</span> : <Link href={c.href} className="hover:text-ink">{c.name}</Link>}
          </span>
        ))}
      </nav>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: all.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: abs(c.href) })) }} />
    </>
  );
}

function Preview({ t, on }: { t: CountryContent; on: boolean }) {
  return on ? <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{t.ui.draftBanner} <a href="/admin/brokers" className="underline">Admin</a></p> : null;
}

function Markets({ t, here }: { t: CountryContent; here: Country }) {
  return (
    <p className="text-sm text-mute">
      {t.ui.otherMarkets}:{" "}
      {COUNTRIES.filter((c) => c !== here).map((c, i) => (
        <span key={c}>
          {i > 0 && " · "}
          <Link href={sectionPath(c)} hrefLang={CONTENT[c].lang} className="text-accent">
            {CONTENT[c].sectionTitle}
          </Link>
        </span>
      ))}
    </p>
  );
}

function FindBonds({ t }: { t: CountryContent }) {
  return (
    <Link href="/" className="flex items-center justify-between gap-4 rounded-[24px] bg-ink px-6 py-5 text-white transition hover:opacity-90" data-track="brokers:find-bonds">
      <span>
        <span className="block text-lg font-semibold">{t.ui.findBonds}</span>
        <span className="block text-sm text-white/70">{t.ui.findBondsText}</span>
      </span>
      <span aria-hidden className="text-2xl">→</span>
    </Link>
  );
}

function Sponsored({ t, list, country }: { t: CountryContent; list: { id: string; name: string; url: string | null }[]; country: Country }) {
  if (list.length === 0) return null;
  return (
    <aside className="rounded-[24px] border border-dashed border-line bg-white/60 p-5" aria-label={t.ui.sponsored}>
      <p className="text-xs font-semibold uppercase tracking-wide text-mute">{t.ui.sponsored}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {list.map((s) => (
          <li key={s.id}>
            <a href={s.url ?? "#"} rel="sponsored nofollow noopener" target="_blank" className="font-medium text-accent" data-track={`broker:${s.id}:${country}:sponsored`}>
              {s.name}
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-mute">{t.ui.adDisclosure}</p>
    </aside>
  );
}

function tableRows(rows: Row[], c: Country, t: CountryContent): TableRow[] {
  const f = formatters(t);
  return rows.map((r) => ({
    id: r.profile.id,
    name: r.profile.name,
    profileHref: brokerPath(c, r.profile.id),
    site: { href: r.link.href, rel: r.link.rel, kind: r.link.kind },
    overall: r.score.overall,
    custody: r.tariff.data.custodyFee.text ?? t.ui.notDisclosed,
    verifiedAt: f.date(r.tariff.verifiedAt),
    overdue: r.overdue,
    costs: Object.fromEntries(
      CATEGORIES.map((cat) => [
        cat,
        Object.fromEntries(SCENARIOS.map((a) => {
          const x = r.costs[cat][a];
          return [String(a), { status: x.status, total: x.total, totalPct: x.totalPct, totalLabel: x.total === null ? null : f.eur(x.total), pctLabel: x.totalPct === null ? null : f.pct(x.totalPct), uncounted: x.thirdPartyUncounted.length > 0, general: !x.bondSpecific }];
        })),
      ]),
    ),
  }));
}

// ---- Country comparison --------------------------------------------------------------------------------

export async function ComparisonPage({ country }: { country: Country }) {
  const { data, preview } = await load(country);
  const t = CONTENT[country];
  const f = formatters(t);
  const v = countryView(data, country, today());
  const intro = v.settings.intro ?? t.intro;
  const path = sectionPath(country);
  const land = landingFor(path);
  return (
    <article lang={t.lang} className="mx-auto max-w-5xl space-y-6">
      <Preview t={t} on={preview} />
      <Crumbs t={t} items={[{ name: t.sectionTitle, href: path }]} />
      <header className="space-y-3">
        <h1 className="text-[34px] font-semibold leading-tight tracking-tight sm:text-[44px]">{t.sectionTitle}</h1>
        {intro.map((p, i) => (
          <p key={i} className="max-w-3xl text-[17px] leading-relaxed text-mute">{p}</p>
        ))}
        {v.lastVerified && <p className="text-sm text-mute">{t.ui.asOf} {f.date(v.lastVerified)} · <Link href={methodologyPath(country)} className="text-accent">{t.ui.methodology}</Link></p>}
      </header>

      <section className={card} aria-labelledby="cost-table">
        <h2 id="cost-table" className="text-xl font-semibold">{t.ui.tableTitle}</h2>
        <p className="mt-1 text-sm text-mute">{t.ui.tableNote} {t.ui.planNote}</p>
        <div className="mt-5">
          <CostTable
            rows={tableRows(v.rows, country, t)}
            categories={CATEGORIES.map((c) => ({ key: c, label: t.categories[c] }))}
            amounts={SCENARIOS.map((a) => ({ value: a, label: f.eurRound(a) }))}
            labels={{ ...t.ui, sortBy: t.ui.sortBy }}
          />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-mute">{t.ui.spreadsNote}</p>
        {v.rows.length < 10 && <p className="mt-2 text-xs text-mute">{t.ui.fewerThanTen}</p>}
        <p className="mt-2 text-xs text-mute">{t.ui.assessmentNote} {v.sponsored.length === 0 && t.ui.noAffiliate}</p>
      </section>

      <Sponsored t={t} country={country} list={v.sponsored.map((p) => ({ id: p.id, name: p.name, url: p.affiliate.url }))} />

      <FindBonds t={t} />

      {land && (
        <section className={card}>
          <h2 className="text-2xl font-semibold tracking-tight">{land.h1}</h2>
          <div className={`mt-4 ${prose}`} dangerouslySetInnerHTML={{ __html: sanitizeHtml(land.bodyHtml) }} />
        </section>
      )}

      <section className={`${card} space-y-6`}>
        {t.editorial.map((s) => (
          <div key={s.h}>
            <h2 className="text-xl font-semibold">{s.h}</h2>
            {s.p.map((p, i) => (
              <p key={i} className="mt-2 leading-relaxed">{p}</p>
            ))}
          </div>
        ))}
      </section>

      <section className={card}>
        <h2 className="text-xl font-semibold">FAQ</h2>
        <dl className="mt-3 space-y-4">
          {t.faq.map((q) => (
            <div key={q.q}>
              <dt className="font-semibold">{q.q}</dt>
              <dd className="mt-1 leading-relaxed text-mute">{q.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <Markets t={t} here={country} />
      <p className="text-xs leading-relaxed text-mute">{t.ui.disclaimer}</p>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: t.sectionTitle,
          itemListOrder: "https://schema.org/ItemListOrderDescending",
          numberOfItems: v.rows.length,
          itemListElement: v.rows.map((r, i) => ({ "@type": "ListItem", position: i + 1, name: r.profile.name, url: abs(brokerPath(country, r.profile.id)) })),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: t.faq.map((q) => ({ "@type": "Question", name: q.q, acceptedAnswer: { "@type": "Answer", text: q.a } })),
        }}
      />
    </article>
  );
}

function fieldName(t: CountryContent, k: string): string {
  const names: Record<string, string> = {
    commissions: t.ui.commissions, thirdPartyFees: t.ui.thirdParty, custodyFee: t.ui.custodyFee, accountFee: t.ui.accountFee,
    fxFee: t.ui.fxFee, govBonds: t.ui.govBonds, corpBonds: t.ui.corpBonds, foreignCurrencyBonds: t.ui.fxBonds, taxAgent: t.ui.taxAgent, tariffDocUrl: t.ui.sources,
  };
  return names[k] ?? k;
}

// ---- Broker profile ------------------------------------------------------------------------------------

function strengthsAndLimits(r: Row, rows: Row[], t: CountryContent) {
  const d = r.tariff.data;
  const s: string[] = [];
  const l: string[] = [];
  const at10k = (x: Row) => x.costs.domestic_gov[10_000];
  const ok = rows.filter((x) => at10k(x).status === "ok").sort((a, b) => (at10k(a).total ?? 0) - (at10k(b).total ?? 0));
  if (ok.slice(0, 3).includes(r)) s.push(t.ui.strengthsAuto.cheapest);
  if (d.accountFee.annualEur === 0 && d.custodyFee.annualEur === 0) s.push(t.ui.strengthsAuto.noCustody);
  else if ((d.accountFee.annualEur ?? 0) > 0 || (d.custodyFee.annualEur ?? 0) > 0) l.push(t.ui.limitsAuto.custody);
  if (d.taxAgent.value === true) s.push(t.ui.strengthsAuto.taxAgent);
  if (d.taxAgent.value === false) l.push(t.ui.limitsAuto.noTaxAgent);
  if (d.foreignCurrencyBonds.available) s.push(t.ui.strengthsAuto.fx);
  else l.push(t.ui.limitsAuto.noFx);
  if (new Set(d.venues).size >= 3) s.push(t.ui.strengthsAuto.manyVenues);
  if (d.corpBonds.available === false) l.push(t.ui.limitsAuto.noCorp);
  const small = r.costs.domestic_gov[5_000];
  if (small.status === "ok" && (small.totalPct ?? 0) >= 0.3) l.push(t.ui.limitsAuto.minOrder);
  if (d.unverified.length > 0) l.push(t.ui.limitsAuto.unverified);
  return { s, l };
}

export async function BrokerPage({ country, id }: { country: Country; id: string }) {
  const { data, preview } = await load(country);
  const t = CONTENT[country];
  const f = formatters(t);
  const v = brokerView(data, country, id, today());
  if (!v) notFound();
  const { row: r } = v;
  const d = r.tariff.data;
  const words = { min: t.ui.min, max: t.ui.max, upTo: t.ui.upTo, above: t.ui.above };
  const yn = (b: boolean | null) => (b === true ? t.ui.yes : b === false ? t.ui.no : t.ui.unknown);
  const { s, l } = strengthsAndLimits(r, v.rows, t);
  const sources = Array.from(
    new Set([d.tariffDocUrl, ...d.commissions.map((c) => c.sourceUrl), d.custodyFee.sourceUrl, d.accountFee.sourceUrl, d.fxFee.sourceUrl, d.govBonds.sourceUrl, d.corpBonds.sourceUrl].filter((u): u is string => !!u)),
  );
  const path = sectionPath(country);
  return (
    <article lang={t.lang} className="mx-auto max-w-4xl space-y-6">
      <Preview t={t} on={preview} />
      <Crumbs t={t} items={[{ name: t.sectionTitle, href: path }, { name: r.profile.name, href: brokerPath(country, id) }]} />
      <header className="space-y-2">
        <h1 className="text-[32px] font-semibold tracking-tight sm:text-[40px]">{r.profile.name}</h1>
        <p className="text-mute">
          {t.ui.score}: <b className="text-ink">{r.score.overall.toFixed(0)}/100</b> · #{v.rank} {t.sectionTitle} ·{" "}
          <span className={r.overdue ? "text-amber-700" : ""}>{r.overdue ? t.ui.overdue : `${t.ui.lastChecked} ${f.date(r.tariff.verifiedAt)}`}</span>
        </p>
        <p className="text-sm text-mute">{d.accountType}{r.profile.regulator ? ` · ${r.profile.regulator}` : ""}</p>
        <a href={r.link.href} rel={r.link.rel} target="_blank" className="inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white" data-track={`broker:${id}:${country}:${r.link.kind}`}>
          {t.ui.officialSite} ↗
        </a>
        {r.link.kind === "affiliate" ? <p className="text-xs text-mute">{t.ui.adDisclosure}</p> : <p className="text-xs text-mute">{t.ui.noAffiliate}</p>}
      </header>

      <section className={card}>
        <h2 className="text-xl font-semibold">{t.ui.tableTitle}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-mute">
              <tr className="border-b border-line">
                <th className="py-2 pr-3 font-medium">{t.ui.category}</th>
                {SCENARIOS.map((a) => (
                  <th key={a} className="py-2 pr-3 font-medium">{f.eurRound(a)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((c) => (
                <tr key={c} className="border-b border-line/60 align-top">
                  <td className="py-3 pr-3">{t.categories[c]}</td>
                  {SCENARIOS.map((a) => {
                    const x = r.costs[c][a];
                    if (x.status !== "ok" || x.total === null)
                      return <td key={a} className="py-3 pr-3 text-xs text-mute">{x.status === "not_offered" ? t.ui.notOffered : x.status === "not_eligible" ? t.ui.notEligible : t.ui.notDisclosed}</td>;
                    return (
                      <td key={a} className="py-3 pr-3">
                        <b>{f.eur(x.total)}</b>{x.bondSpecific ? "" : "†"} <span className="text-xs text-mute">({f.pct(x.totalPct ?? 0)})</span>
                        <span className="block text-xs text-mute">
                          {t.ui.commission} {f.eur(x.commission ?? 0)}
                          {x.thirdParty > 0 && ` + ${t.ui.thirdParty.toLowerCase()} ${f.eur(x.thirdParty)}`}
                          {(x.fx ?? 0) > 0 && ` + ${t.ui.fx.toLowerCase()} ${f.eur(x.fx ?? 0)}`}
                        </span>
                        {x.thirdPartyUncounted.length > 0 && <span className="block text-xs text-amber-700">{t.ui.uncounted}: {x.thirdPartyUncounted.join("; ")}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {d.commissions.some((c) => !c.bondSpecific) && <p className="mt-3 text-xs text-mute">† {t.ui.generalTariff}</p>}
        <p className="mt-1 text-xs text-mute">{t.ui.planNote} {t.ui.spreadsNote}</p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className={card}>
          <h2 className="text-lg font-semibold">{t.ui.products}</h2>
          <dl className="mt-3 space-y-3 text-sm">
            {[
              [t.ui.govBonds, d.govBonds],
              [t.ui.corpBonds, d.corpBonds],
              [t.ui.fxBonds, d.foreignCurrencyBonds],
            ].map(([k, a]) => {
              const av = a as typeof d.govBonds;
              return (
                <div key={k as string}>
                  <dt className="text-mute">{k as string}</dt>
                  <dd>
                    <b>{yn(av.available)}</b>
                  </dd>
                </div>
              );
            })}
            <div>
              <dt className="text-mute">{t.ui.venues}</dt>
              <dd>{d.venues.length ? d.venues.join(", ") : t.ui.notDisclosed}</dd>
            </div>
            <div>
              <dt className="text-mute">{t.ui.taxAgent}</dt>
              <dd>{yn(d.taxAgent.value)}</dd>
            </div>
          </dl>
        </section>

        <section className={card}>
          <h2 className="text-lg font-semibold">{t.ui.fees}</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="text-mute">{t.ui.commissions}</dt>
              <dd>
                <ul className="space-y-1">
                  {d.commissions.map((c, i) => (
                    <li key={i}>
                      <b>{describeRule(c.rule, f.eurSmart, f.pct, words)}</b> {t.ui.perOrder}
                      <span className="block text-xs text-mute">
                        {c.venue} · {c.appliesTo.map((x) => t.categories[x]).join(", ")}
                        {c.conditions ? ` · ${c.conditions}` : ""}
                      </span>
                      {c.promo && (
                        <span className="block text-xs text-amber-700">
                          {t.ui.promo}: {c.promo.description}
                          {c.promo.expires ? ` (${t.ui.until} ${f.date(c.promo.expires)})` : ""}
                        </span>
                      )}
                    </li>
                  ))}
                  {d.commissions.length === 0 && <li>{t.ui.notDisclosed}</li>}
                </ul>
              </dd>
            </div>
            {d.thirdPartyFees.length > 0 && (
              <div>
                <dt className="text-mute">{t.ui.thirdParty}</dt>
                <dd>
                  <ul className="space-y-1">
                    {d.thirdPartyFees.map((x, i) => (
                      <li key={i}>{x.description}: {x.amount}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-mute">{t.ui.custodyFee}</dt>
              <dd>{d.custodyFee.text ?? t.ui.notDisclosed}</dd>
            </div>
            <div>
              <dt className="text-mute">{t.ui.accountFee}</dt>
              <dd>{d.accountFee.text ?? t.ui.notDisclosed}</dd>
            </div>
            <div>
              <dt className="text-mute">{t.ui.fxFee}</dt>
              <dd>{d.fxFee.text ?? t.ui.notDisclosed}</dd>
            </div>
            {d.otherFees && (
              <div>
                <dt className="text-mute">{t.ui.otherFees}</dt>
                <dd>{d.otherFees}</dd>
              </div>
            )}
          </dl>
        </section>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className={card}>
          <h2 className="text-lg font-semibold">{t.ui.strengths}</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{s.map((x) => <li key={x}>{x}</li>)}</ul>
        </section>
        <section className={card}>
          <h2 className="text-lg font-semibold">{t.ui.limits}</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{l.map((x) => <li key={x}>{x}</li>)}</ul>
          {d.notes && <p className="mt-3 text-xs text-mute">{d.notes}</p>}
        </section>
      </div>

      <section className={card}>
        <h2 className="text-lg font-semibold">{t.ui.methodology}</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
          {(Object.keys(t.ui.criteria) as (keyof typeof t.ui.criteria)[]).map((k) => (
            <div key={k}>
              <dt className="text-xs text-mute">{t.ui.criteria[k].name}</dt>
              <dd className="text-lg font-semibold">{r.score.criteria[k].toFixed(0)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-mute">
          {t.ui.assessmentNote} <Link href={methodologyPath(country)} className="text-accent">{t.ui.methodology}</Link>
        </p>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">{t.ui.sources}</h2>
        <ul className="mt-3 space-y-1 break-all text-sm">
          {sources.map((u) => (
            <li key={u}>
              <a href={u} rel="nofollow noopener" target="_blank" className="text-accent">{u}</a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-mute">
          {t.ui.lastChecked}: {f.date(r.tariff.verifiedAt)} · {t.ui.effectiveFrom} {f.date(r.tariff.effectiveFrom)}
        </p>
        {d.unverified.length > 0 && <p className="mt-1 text-xs text-amber-700">{t.ui.unverifiedFields}: {d.unverified.map((k) => fieldName(t, k)).join(", ")}</p>}
      </section>

      <FindBonds t={t} />
      <p className="text-sm">
        <Link href={path} className="text-accent">← {t.sectionTitle}</Link>
      </p>
      <p className="text-xs leading-relaxed text-mute">{t.ui.disclaimer}</p>
    </article>
  );
}

// ---- Methodology ---------------------------------------------------------------------------------------

export async function MethodologyPage({ country }: { country: Country }) {
  const { data, preview } = await load(country);
  const t = CONTENT[country];
  const w = data.methodology.weights;
  const path = sectionPath(country);
  return (
    <article lang={t.lang} className={`mx-auto max-w-3xl ${card}`}>
      <Preview t={t} on={preview} />
      <Crumbs t={t} items={[{ name: t.sectionTitle, href: path }, { name: t.ui.methodology, href: methodologyPath(country) }]} />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{t.ui.methodology}</h1>
      {t.ui.methodologyIntro.map((p, i) => (
        <p key={i} className="mt-3 leading-relaxed">{p}</p>
      ))}
      <table className="mt-6 w-full text-left text-sm">
        <thead className="text-xs text-mute">
          <tr className="border-b border-line">
            <th className="py-2 pr-3 font-medium">{t.ui.methodology}</th>
            <th className="py-2 pr-3 font-medium">{t.ui.weight}</th>
          </tr>
        </thead>
        <tbody>
          {(Object.keys(t.ui.criteria) as (keyof typeof t.ui.criteria)[]).map((k) => (
            <tr key={k} className="border-b border-line/60 align-top">
              <td className="py-3 pr-3">
                <b>{t.ui.criteria[k].name}</b>
                <span className="block text-mute">{t.ui.criteria[k].how}</span>
              </td>
              <td className="py-3 pr-3 font-semibold">{w[k]}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-6 text-sm leading-relaxed text-mute">{t.ui.planNote}</p>
      <p className="mt-2 text-sm leading-relaxed text-mute">{t.ui.spreadsNote}</p>
      {data.profiles.every((p) => p.affiliate.status !== "active") && <p className="mt-2 text-sm leading-relaxed text-mute">{t.ui.noAffiliate}</p>}
      <p className="mt-6 text-sm">
        <Link href={path} className="text-accent">← {t.sectionTitle}</Link>
      </p>
    </article>
  );
}
