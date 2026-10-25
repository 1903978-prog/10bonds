// Rating coherence rules on live data, read-only (lib/coherentFrontier.ts): per horizon, the slider of Methodology 1,
// of the spread rules without the new rules ("before") and of the coherent optimiser ("after"), with the rating,
// issuer-group and sector profile of every list and the solver's certificate. Fails if a coherent list breaks a rule,
// a frontier is not strictly rising, or any solve was not certified.
// Usage: npx vite-node -c vitest.config.ts scripts/coherence-live-check.ts
import { loadBondsFor } from "@/lib/bonds";
import { buildSlider } from "@/lib/sliderPortfolios";
import { exactFrontier } from "@/lib/exactFrontier";
import { coherentFrontier } from "@/lib/coherentFrontier";
import { stepGap } from "@/lib/stepGap";
import { checkList, DEFAULT_POLICY, factsOf, policySignature } from "@/lib/coherence";
import { CLASS_NAMES } from "@/lib/creditProfileText";
import { TERMS } from "@/lib/limits";
import { groupInfo } from "@/lib/issuerGroups";
import { sectorOf, UNCLASSIFIED } from "@/lib/sectors";
import type { PublicBond } from "@/lib/types";

const f2 = (x: number) => x.toFixed(2);
let bad = 0;
const src = await loadBondsFor({ currency: "EUR", size: "100k" });
const by = new Map(src.bonds.map((b) => [b.isin, b]));
const unclassified = new Set(src.bonds.filter((b) => sectorOf(b) === UNCLASSIFIED).map((b) => groupInfo(b).group));
const groups = new Set(src.bonds.map((b) => groupInfo(b).group));
console.log(`EUR all orders: ${src.bonds.length} bonds, ${groups.size} issuer groups, ${unclassified.size} groups without a sector: ${[...unclassified].sort().join(", ")}`);
console.log(`Rules ${policySignature(DEFAULT_POLICY)}`);

const describe = (isins: string[]) => {
  const bonds = isins.map((i) => by.get(i)!) as PublicBond[];
  const facts = bonds.map(factsOf);
  const checks = checkList(facts, DEFAULT_POLICY, 10);
  const classes = new Map<number, number>();
  facts.forEach((f) => classes.set(f.cls, (classes.get(f.cls) ?? 0) + 1));
  const sectors = new Map<string, number>();
  facts.forEach((f) => sectors.set(f.sector, (sectors.get(f.sector) ?? 0) + 1));
  const gcount = new Map<string, number>();
  facts.forEach((f) => gcount.set(f.group!, (gcount.get(f.group!) ?? 0) + 1));
  const dup = [...gcount].filter(([, n]) => n > 1).map(([g, n]) => `${g}×${n}`);
  const total = facts.reduce((s, f) => s + f.pd, 0);
  return {
    ok: checks.every((c) => c.ok),
    failed: checks.filter((c) => !c.ok).map((c) => `${c.rule} (${c.detail})`),
    ratings: [...classes].sort((a, b) => a[0] - b[0]).map(([c, n]) => `${n} ${CLASS_NAMES[c]}`).join(" + "),
    sectors: [...sectors].sort((a, b) => b[1] - a[1]).map(([s, n]) => `${n} ${s}`).join(", "),
    dup: dup.length ? dup.join(", ") : "none",
    topShare: total > 0 ? Math.round((Math.max(...facts.map((f) => f.pd)) / total) * 1000) / 10 : 0,
    issuers: bonds.map((b) => `${b.issuer} [${CLASS_NAMES[factsOf(b).cls]}, ${f2(b.grossYtm!)}%]`).join("; "),
  };
};

for (const t of TERMS) {
  console.log(`\n== EUR all orders ${t.key} (${t.duration}y)`);
  const m1 = buildSlider(exactFrontier(src.bonds, t.duration));
  const before = buildSlider(exactFrontier(src.bonds, t.duration, stepGap));
  let t0 = Date.now();
  const frontier = await coherentFrontier(src.bonds, t.duration);
  const secs = (Date.now() - t0) / 1000;
  const after = buildSlider(frontier);
  const c = frontier.cert;
  console.log(`certificate: ${c.certified ? "CERTIFIED" : "UNCERTIFIED"}; ${c.solves} solver runs (${c.optimal} optimal, ${c.infeasible} infeasible, ${c.uncertified} hit the ${20}s limit); absolute gap tolerance ${c.absGap}, relative 0; ${secs.toFixed(1)}s; ${frontier.points.length} efficient lists, ${after.length} slider positions; pool ${frontier.size} bonds`);
  if (!c.certified) bad++;
  for (let i = 1; i < after.length; i++) if (!(after[i].ytm! > after[i - 1].ytm! && after[i].expectedLoss! > after[i - 1].expectedLoss!)) bad++;
  const rows = (label: string, pos: ReturnType<typeof buildSlider>) => {
    let failing = 0, dups = 0;
    for (const p of pos) { const d = describe(p.isins); if (!d.ok) failing++; if (d.dup !== "none") dups++; }
    console.log(`${label}: ${pos.length} positions, return ${f2(pos[0]?.ytm ?? 0)}-${f2(pos.at(-1)?.ytm ?? 0)}%, loss ${f2(pos[0]?.expectedLoss ?? 0)}-${f2(pos.at(-1)?.expectedLoss ?? 0)}%; lists breaking a rule: ${failing}/${pos.length}; lists with a repeated issuer group: ${dups}`);
  };
  rows("Methodology 1      ", m1);
  rows("spread rules before", before);
  rows("spread rules after ", after);
  for (const p of after) if (!describe(p.isins).ok) bad++;
  for (const [label, pos] of [["BEFORE (spread rules, old)", before], ["AFTER (coherent)", after]] as const) {
    for (const k of [Math.ceil(pos.length * 0.25), Math.ceil(pos.length * 0.5), Math.ceil(pos.length * 0.75)]) {
      const p = pos[k - 1];
      if (!p) continue;
      const d = describe(p.isins);
      console.log(`  ${label} position ${k}/${pos.length}: return ${f2(p.ytm!)}%, expected loss ${p.expectedLoss!.toFixed(3)}%; ratings ${d.ratings}; sectors ${d.sectors}; repeated groups ${d.dup}; largest loss share ${d.topShare}%; rules ${d.ok ? "all pass" : "FAIL: " + d.failed.join(", ")}`);
      console.log(`    ${d.issuers}`);
    }
  }
}
console.log(bad ? `\nPROBLEMS: ${bad}` : "\nall coherent lists pass every rule; every solve certified");
process.exit(bad ? 1 : 0);
