// One-off, read-only: what issuer/sector data the bond copy has, and the DZ Bank rows (rating coherence rules work).
import postgres from "postgres";
import { cleanPgUrl } from "@/lib/pgUrl";
import { loadBondsFor } from "@/lib/bonds";
import { exactFrontier } from "@/lib/exactFrontier";
import { TERMS } from "@/lib/limits";
import { issuerKey } from "@/lib/ranking";

const client = postgres(cleanPgUrl(process.env.DATABASE_URL!), { ssl: "require", max: 1, prepare: false });
const cols = await client`select column_name, data_type from information_schema.columns where table_name = 'public_bonds' order by ordinal_position`;
console.log("COLUMNS:", cols.map((c) => `${c.column_name}:${c.data_type}`).join(", "));
const dz = await client`select isin, name, issuer, seniority, rating_sp, rating_moodys, rating_fitch, gross_ytm, modified_duration from public_bonds where (issuer ilike '%dz%' or issuer ilike '%genossenschafts%') and issuer not ilike 'DZ Bank' limit 60`;
for (const r of dz) console.log("DZ:", JSON.stringify(Object.fromEntries(Object.entries(r).filter(([, v]) => v !== null))));
const others = await client`select * from public_bonds limit 2`;

const src = await loadBondsFor({ currency: "EUR", size: "100k" });
const keys = new Map<string, Set<string>>();
for (const b of src.bonds) { const k = issuerKey(b); if (!keys.has(k)) keys.set(k, new Set()); keys.get(k)!.add(b.issuer ?? ""); }
console.log("EUR issuers:", keys.size, "bonds:", src.bonds.length);
for (const [k, names] of [...keys].sort()) console.log("ISSUER\t" + k + "\t" + [...names].join(" / ") + "\t" + src.bonds.filter((b) => issuerKey(b) === k).length);
// first word clusters with more than one key, to see alias problems
const fw = new Map<string, string[]>();
for (const k of keys.keys()) { const w = k.split(" ")[0]; fw.set(w, [...(fw.get(w) ?? []), k]); }
for (const [w, ks] of fw) if (ks.length > 1) console.log("ALIAS?", w, "=>", ks.join(" | "));
for (const t of TERMS) { const t0 = Date.now(); const f = exactFrontier(src.bonds, t.duration); console.log("timing", t.key, f.size, f.points.length, Date.now() - t0, "ms"); }
process.exit(0);
