"use client";

import { useEffect, useState } from "react";
import type { Preview, ImportedRow } from "@/lib/bondImportDb";

type Overview = { batches: { id: string; file_name: string; imported_at: string; rows_read: number; rows_imported: number }[]; current: ImportedRow[]; seniorityFill: boolean };

export default function BondImportPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [ov, setOv] = useState<Overview | null>(null);

  const load = () => fetch("/api/admin/bond-import", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then(setOv).catch(() => {});
  useEffect(() => { load(); }, []);

  async function send(mode: string) {
    if (!file) return;
    setBusy(true);
    setMsg("");
    const f = new FormData();
    f.set("file", file);
    f.set("mode", mode);
    const r = await fetch("/api/admin/bond-import", { method: "POST", body: f }).catch(() => null);
    const j = await r?.json().catch(() => null);
    setBusy(false);
    if (!j || j.error) return setMsg(j?.error ?? "Something went wrong.");
    if (j.preview) return setPreview(j.preview);
    setMsg(`Imported ${j.imported} bonds. IR / BR / Risk Pay: ${j.ratingsFilled} filled, ${j.ratingsKept} differing values kept as they were.`);
    setPreview(null);
    setFile(null);
    load();
  }

  async function toggle(on: boolean) {
    const f = new FormData();
    f.set("mode", on ? "seniority-on" : "seniority-off");
    await fetch("/api/admin/bond-import", { method: "POST", body: f });
    load();
  }

  const p = preview;
  return (
    <div className="mt-6 space-y-6 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <input type="file" accept=".xls,.xlsx,.csv" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); setMsg(""); }} />
        <button disabled={!file || busy} onClick={() => send("preview")} className="rounded-full bg-accent px-4 py-1.5 text-white disabled:opacity-40">Preview</button>
      </div>
      {msg && <p className="rounded-lg bg-yellow-100 px-3 py-2">{msg}</p>}
      {p && (
        <div className="space-y-2 rounded-lg bg-yellow-100 px-3 py-3" data-testid="import-preview">
          <p><b>{p.fileName}</b>: {p.rowsRead} rows read, {p.rowsValid} usable{p.skipped.length ? `, ${p.skipped.length} skipped (${p.skipped.slice(0, 3).map((s) => s.why).join("; ")})` : ""}{p.duplicates.length ? `, ${p.duplicates.length} repeated ISINs ignored` : ""}.</p>
          {p.alreadyImported && <p className="font-medium">This exact file was already imported.</p>}
          <p>{p.siteConnected ? `On the site: ${p.matched} found, ${p.notMatched.length} not found${p.notMatched.length ? ` (${p.notMatched.slice(0, 8).join(", ")}${p.notMatched.length > 8 ? "…" : ""})` : ""}.` : "Site bond data is not connected, so no matching was done."}</p>
          <p>Columns: {p.columns.known.length} already known ({p.columns.known.join(", ")}); {p.columns.added.length} new ({p.columns.added.join(", ")}). All are kept.</p>
          <p>Differences with the site: {Object.keys(p.conflicts).length ? Object.entries(p.conflicts).map(([k, v]) => `${k} ${v.count} (e.g. ${v.examples[0]})`).join(" · ") : "none"}.</p>
          <p>Seniority: the file states it for {p.seniority.fileStates} bonds; the site has none for {p.seniority.siteHasNone} of them. If switched on: <b>{p.seniority.extraExcluded} extra bonds excluded</b> (subordinated{p.seniority.extraExcludedIsins.length ? `: ${p.seniority.extraExcludedIsins.slice(0, 6).join(", ")}` : ""}), {p.seniority.extraNotched} rated one notch lower (senior non-preferred).</p>
          <p>IR / BR / Risk Pay: {p.ratings.fills} values will fill empty fields, {p.ratings.unchanged} already the same, {p.ratings.kept} differ from what is saved and will <b>not</b> overwrite it{p.ratings.keptIsins.length ? ` (${p.ratings.keptIsins.slice(0, 6).join(", ")})` : ""}.</p>
          {p.suspicious.length > 0 && <p>Suspicious: {p.suspicious.join(" · ")}</p>}
          <button disabled={busy || p.alreadyImported} onClick={() => send("commit")} className="rounded-full bg-accent px-4 py-1.5 text-white disabled:opacity-40">Confirm import</button>
        </div>
      )}
      {ov && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span>Use imported seniority in the rankings (only for bonds where the site has none):</span>
            <button onClick={() => toggle(!ov.seniorityFill)} className="rounded-full border border-line px-3 py-1">{ov.seniorityFill ? "ON – switch off" : "OFF – switch on"}</button>
          </div>
          <div>
            <h2 className="font-semibold">Imports</h2>
            {ov.batches.length === 0 ? <p className="text-mute">None yet.</p> : ov.batches.map((b) => <p key={b.id}>#{b.id} · {b.file_name} · {b.imported_at.slice(0, 16)} · {b.rows_imported} of {b.rows_read} rows</p>)}
          </div>
          {ov.current.length > 0 && (
            <div className="overflow-x-auto rounded-lg bg-yellow-100 p-2">
              <table className="w-full text-left text-xs">
                <thead><tr>{["ISIN", "Issuer", "Coupon", "Maturity", "Agency", "Return", "Price", "Seniority", "Verdict"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead>
                <tbody>{ov.current.map((r) => <tr key={r.isin}><td className="px-2 py-0.5">{r.isin}</td><td className="px-2">{r.issuer ?? "–"}</td><td className="px-2">{r.coupon ?? "–"}</td><td className="px-2">{r.maturity ?? "–"}</td><td className="px-2">{r.agency_rating ?? "–"}</td><td className="px-2">{r.ytm ?? "–"}</td><td className="px-2">{r.price ?? "–"}</td><td className="px-2">{r.seniority ?? "–"}</td><td className="px-2">{r.verdict ?? r.recommendation ?? "–"}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
