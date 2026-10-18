"use client";

import { useCallback, useEffect, useState } from "react";
import { LOCALES, pathOf, type Locale } from "@/lib/seo/locales";
import type { Guide, Person } from "@/lib/seo/store";
import { api, Badge, btn, btnLight, card, day, ErrorNote, Field, input, Table, when } from "./ui";

type Form = {
  id: number | null; locale: Locale; translationGroup: string; machineTranslated: boolean; slug: string; title: string; seoTitle: string; metaDescription: string;
  primaryKeyword: string; relatedKeywords: string; relatedSlugs: string; bodyHtml: string; authorId: string; reviewerId: string; status: string;
  noindex: boolean; canonicalUrl: string; markReviewed: boolean; note: string;
};
const blank = (locale: Locale): Form => ({
  id: null, locale, translationGroup: "", machineTranslated: false, slug: "", title: "", seoTitle: "", metaDescription: "", primaryKeyword: "", relatedKeywords: "",
  relatedSlugs: "", bodyHtml: "", authorId: "", reviewerId: "", status: "draft", noindex: false, canonicalUrl: "", markReviewed: false, note: "",
});
const toForm = (g: Guide): Form => ({
  id: g.id, locale: g.locale, translationGroup: g.translationGroup ?? "", machineTranslated: g.machineTranslated, slug: g.slug, title: g.title, seoTitle: g.seoTitle,
  metaDescription: g.metaDescription, primaryKeyword: g.primaryKeyword, relatedKeywords: g.relatedKeywords.join(", "), relatedSlugs: g.relatedSlugs.join(", "),
  bodyHtml: g.bodyHtml, authorId: g.authorId?.toString() ?? "", reviewerId: g.reviewerId?.toString() ?? "", status: g.status, noindex: g.noindex,
  canonicalUrl: g.canonicalUrl ?? "", markReviewed: false, note: "",
});
const TONE = { published: "green", review: "amber", draft: "gray" } as const;

export default function Guides({ market }: { market: Locale }) {
  const [data, setData] = useState<{ guides: Guide[]; people: Person[] } | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [log, setLog] = useState<{ at: string; by: string; status: string; note: string | null }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api("/api/admin/seo/guides"));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ guide: Guide }>("/api/admin/seo/guides", {
        ...form, authorId: form.authorId || null, reviewerId: form.reviewerId || null,
        relatedKeywords: form.relatedKeywords, relatedSlugs: form.relatedSlugs, canonicalUrl: form.canonicalUrl || null,
      });
      setForm(toForm(r.guide));
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  async function localize(g: Guide, locale: Locale) {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ guide: Guide }>("/api/admin/seo/guides", { op: "localize", id: g.id, locale });
      await load();
      setForm(toForm(r.guide));
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  const openLog = async (id: number) => setLog((await api<{ log: typeof log }>(`/api/admin/seo/guides?log=${id}`)).log);

  if (!data) return error ? <ErrorNote error={error} /> : <p className="text-sm text-mute">Loading…</p>;
  const guides = data.guides.filter((g) => g.locale === market);
  const groups = new Map<string, Guide[]>();
  for (const g of data.guides) if (g.translationGroup) groups.set(g.translationGroup, [...(groups.get(g.translationGroup) ?? []), g]);

  return (
    <div className="space-y-5" data-testid="seo-guides">
      <section className={card}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Guides · {market.toUpperCase()}</h2>
            <p className="mt-1 max-w-3xl text-xs text-mute">Only “published” guides are public. Ready-written guides wait in “review” for you to read, edit and publish. Translated versions stay drafts, flagged “unverified”, until a person reviews them.</p>
          </div>
          <button onClick={() => { setForm(blank(market)); setLog(null); }} className={btn}>New guide</button>
        </div>
        <ErrorNote error={error} />
        <Table head={["Title", "Status", "Updated", "Reviewed", "Other languages", ""]} min="46rem">
          {guides.length === 0 && <tr><td colSpan={6} className="py-3 text-mute">No guides in this language yet.</td></tr>}
          {guides.map((g) => {
            const sib = g.translationGroup ? groups.get(g.translationGroup) ?? [] : [];
            return (
              <tr key={g.id} className="border-t border-line align-top">
                <td className="py-2 pr-3"><span className="font-medium">{g.title}</span><span className="block text-[11px] text-mute">{pathOf(g.locale, "guides", g.slug)}</span></td>
                <td className="pr-3"><Badge tone={TONE[g.status]}>{g.status}</Badge>{g.machineTranslated && <span className="ml-1"><Badge tone="purple">unverified</Badge></span>}</td>
                <td className="pr-3 text-xs">{day(g.updatedAt)}</td>
                <td className="pr-3 text-xs">{day(g.reviewedAt)}</td>
                <td className="pr-3 text-xs">
                  {LOCALES.filter((l) => l !== g.locale).map((l) => {
                    const s = sib.find((x) => x.locale === l);
                    return s ? <span key={l} className="mr-2">{l.toUpperCase()} <Badge tone={TONE[s.status]}>{s.status}</Badge></span>
                      : <button key={l} disabled={busy} onClick={() => localize(g, l)} className="mr-2 text-accent">+ {l.toUpperCase()} draft</button>;
                  })}
                </td>
                <td className="whitespace-nowrap">
                  <button onClick={() => { setForm(toForm(g)); setLog(null); }} className="text-sm text-accent">Edit</button>
                  <a href={`${pathOf(g.locale, "guides", g.slug)}${g.status === "published" ? "" : "?preview=1"}`} target="_blank" className="ml-3 text-sm text-accent">{g.status === "published" ? "View" : "Preview"}</a>
                </td>
              </tr>
            );
          })}
        </Table>
      </section>

      {form && (
        <section className={card}>
          <h2 className="text-lg font-semibold">{form.id ? "Edit guide" : "New guide"}</h2>
          {form.machineTranslated && <p className="mt-2 rounded-xl bg-purple-50 px-4 py-3 text-sm text-purple-900">This version was started from another language and is not verified. Translate it, then tick “Mark as reviewed” before publishing.</p>}
          <form onSubmit={save} className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Language">
              <select value={form.locale} onChange={(e) => setForm({ ...form, locale: e.target.value as Locale })} className={input} disabled={!!form.id}>
                {LOCALES.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
              </select>
            </Field>
            <Field label="URL slug" hint={pathOf(form.locale, "guides", form.slug || "…")}><input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} className={input} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} /></Field>
            <Field label="Title (H1)"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={input} maxLength={150} /></Field>
            <Field label="SEO title" hint={`${form.seoTitle.length} characters (aim for 30-60)`}><input required value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} className={input} maxLength={120} /></Field>
            <Field label="Meta description" hint={`${form.metaDescription.length} characters (aim for 70-160)`} wide><textarea required value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} className={input} rows={2} maxLength={300} /></Field>
            <Field label="Primary keyword"><input required value={form.primaryKeyword} onChange={(e) => setForm({ ...form, primaryKeyword: e.target.value })} className={input} maxLength={100} /></Field>
            <Field label="Related keywords" hint="Comma separated"><input value={form.relatedKeywords} onChange={(e) => setForm({ ...form, relatedKeywords: e.target.value })} className={input} /></Field>
            <Field label="Content (HTML)" hint="Allowed: paragraphs, h2-h4 (with id for anchors), lists, links, tables, quotes. Scripts and styles are removed. End with a link into the tool." wide>
              <textarea required value={form.bodyHtml} onChange={(e) => setForm({ ...form, bodyHtml: e.target.value })} className={`${input} font-mono`} rows={14} />
            </Field>
            <Field label="Author">
              <select value={form.authorId} onChange={(e) => setForm({ ...form, authorId: e.target.value })} className={input}>
                <option value="">Redazione 10BONDS</option>{data.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Reviewer">
              <select value={form.reviewerId} onChange={(e) => setForm({ ...form, reviewerId: e.target.value })} className={input}>
                <option value="">None</option>{data.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Related guides (slugs)" hint="Comma separated, same language"><input value={form.relatedSlugs} onChange={(e) => setForm({ ...form, relatedSlugs: e.target.value })} className={input} /></Field>
            <Field label="Translation group" hint="Same value links language versions (hreflang)"><input value={form.translationGroup} onChange={(e) => setForm({ ...form, translationGroup: e.target.value })} className={input} /></Field>
            <Field label="Canonical URL" hint="Leave empty: the guide's own address"><input value={form.canonicalUrl} onChange={(e) => setForm({ ...form, canonicalUrl: e.target.value })} className={input} /></Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={input} data-testid="guide-status">
                <option value="draft">Draft</option><option value="review">Review</option><option value="published">Published</option>
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.noindex} onChange={(e) => setForm({ ...form, noindex: e.target.checked })} /> Hide from search engines (noindex)</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.markReviewed} onChange={(e) => setForm({ ...form, markReviewed: e.target.checked })} /> Mark as reviewed now (sets the review date)</label>
            <Field label="Change note (kept in the log)" wide><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={input} maxLength={300} /></Field>
            <p className="text-xs text-mute sm:col-span-2">Structured data (Article, breadcrumbs) and the language links are added automatically.</p>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button disabled={busy} className={btn}>{busy ? "Saving…" : "Save"}</button>
              <button type="button" onClick={() => setForm(null)} className={btnLight}>Close</button>
              {form.id && <button type="button" onClick={() => openLog(form.id!)} className={btnLight}>Review history</button>}
            </div>
            <div className="sm:col-span-2"><ErrorNote error={error} /></div>
          </form>
          {log && (
            <Table head={["When", "Who", "Status", "Note"]}>
              {log.map((l, i) => <tr key={i} className="border-t border-line"><td className="py-2 pr-3">{when(l.at)}</td><td className="pr-3">{l.by}</td><td className="pr-3">{l.status}</td><td className="text-xs text-mute">{l.note ?? ""}</td></tr>)}
            </Table>
          )}
        </section>
      )}

      <People people={data.people} onChange={load} />
    </div>
  );
}

function People({ people, onChange }: { people: Person[]; onChange: () => void }) {
  const empty = { id: 0, name: "", role: "", bio: "", credentials: "", credentialsVerified: false, isPublic: true };
  const [form, setForm] = useState<typeof empty | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    try {
      await api("/api/admin/seo/people", { ...form, id: form.id || null });
      setForm(null);
      onChange();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  async function remove(id: number) {
    if (!confirm("Delete this profile? Guides keep working and show “Redazione 10BONDS”.")) return;
    await api(`/api/admin/seo/people?id=${id}`, undefined, "DELETE").catch((e) => setError((e as Error).message));
    onChange();
  }
  return (
    <section className={card}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Authors & reviewers</h2>
          <p className="mt-1 text-xs text-mute">Shown on the “Redazione” pages and on guides. Type only real people and real credentials; “verified” means you checked them.</p>
        </div>
        <button onClick={() => setForm({ ...empty })} className={btnLight}>Add person</button>
      </div>
      <ErrorNote error={error} />
      <ul className="mt-3 space-y-2 text-sm">
        {people.length === 0 && <li className="text-mute">No profiles yet: guides show “Redazione 10BONDS”.</li>}
        {people.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-canvas px-3 py-2">
            <span><b>{p.name}</b> · {p.role}{p.credentials && <> · {p.credentials} {p.credentialsVerified && <Badge tone="green">verified</Badge>}</>}{!p.isPublic && <> <Badge>hidden</Badge></>}</span>
            <span>
              <button onClick={() => setForm({ id: p.id, name: p.name, role: p.role, bio: p.bio ?? "", credentials: p.credentials ?? "", credentialsVerified: p.credentialsVerified, isPublic: p.isPublic })} className="text-accent">Edit</button>
              <button onClick={() => remove(p.id)} className="ml-3 text-red-700">Delete</button>
            </span>
          </li>
        ))}
      </ul>
      {form && (
        <form onSubmit={save} className="mt-3 grid gap-3 rounded-xl bg-canvas p-3 sm:grid-cols-2">
          <Field label="Name"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} maxLength={100} /></Field>
          <Field label="Role"><input required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={input} maxLength={120} /></Field>
          <Field label="Short bio" wide><textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className={input} rows={3} maxLength={1500} /></Field>
          <Field label="Credentials" hint="e.g. CFA charterholder — only if true"><input value={form.credentials} onChange={(e) => setForm({ ...form, credentials: e.target.value })} className={input} maxLength={500} /></Field>
          <div className="space-y-2 pt-6 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.credentialsVerified} onChange={(e) => setForm({ ...form, credentialsVerified: e.target.checked })} /> I checked these credentials</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} /> Show on the site</label>
          </div>
          <div className="flex gap-2 sm:col-span-2"><button className={btn}>Save</button><button type="button" onClick={() => setForm(null)} className={btnLight}>Cancel</button></div>
        </form>
      )}
    </section>
  );
}
