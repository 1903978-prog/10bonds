// Weighted conformity from docs/quant/conformity/requirements.json. Implemented 100%, Partly 50%, Different/Missing 0%.
// Scores: orig (24/10 audit), live (today), A (strict V2.0), B (V2.0 + approved addendum), builtOff (if built but inactive parts were live).
import fs from "node:fs";
const rows = JSON.parse(fs.readFileSync("docs/quant/conformity/requirements.json", "utf8"));
const v = { I: 1, P: 0.5, D: 0, M: 0 };
const total = rows.reduce((s, r) => s + r.w, 0);
const score = (k) => rows.reduce((s, r) => s + r.w * v[r[k]], 0);
const pct = (x) => (100 * x / total).toFixed(1);
const out = [`# Conformity score (weights total ${total})`, "", "| Measure | Points | % |", "|---|---:|---:|"];
for (const [k, n] of [["orig", "Original audit (24/10)"], ["live", "Live today"], ["A", "Score A strict V2.0 (live)"], ["B", "Score B approved method (live)"], ["builtOff", "If built-but-off parts were live"]]) out.push(`| ${n} | ${score(k)} | ${pct(score(k))} |`);
out.push("", "## Points still to gain per requirement (Score B)", "", "| # | Requirement | Weight | Status B | Max gain | Blocker | Next step |", "|---:|---|---:|---|---:|---|---|");
let gainable = 0;
for (const r of rows.filter((r) => r.B !== "I").sort((a, b) => b.w * (1 - v[b.B]) - a.w * (1 - v[a.B]))) {
  const g = r.w * (1 - v[r.B]); gainable += g;
  out.push(`| ${r.id} | ${r.req} | ${r.w} | ${r.B} | ${g} | ${r.blocker} | ${r.next} |`);
}
const by = {};
for (const r of rows) if (r.B !== "I") (by[r.blocker || "none"] ??= 0), (by[r.blocker || "none"] += r.w * (1 - v[r.B]));
out.push("", `Total gain available: ${gainable} points. By blocker class: ${Object.entries(by).map(([k, x]) => `${k} ${x}`).join(", ")}.`);
const need = 0.95 * total;
out.push(`95% of ${total} = ${need.toFixed(2)} points; Score B live = ${score("B")}, gap ${(need - score("B")).toFixed(2)}.`);
console.log(out.join("\n"));
