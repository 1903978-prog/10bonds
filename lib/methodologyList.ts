// The four methodologies (names for the admin page). No server imports, so client components can use it.
export type Methodology = 1 | 2 | 3 | 4;
export const METHODOLOGIES: { n: Methodology; name: string; text: string }[] = [
  { n: 1, name: "Methodology 1", text: "Exact efficient frontier, no spread rule (lib/exactFrontier.ts)." },
  { n: 2, name: "Methodology 2", text: "Spread logic: minimum extra return per rating step and the coherence rules, solved with HiGHS (lib/coherence.ts)." },
  { n: 3, name: "Methodology 3", text: "30 average-risk bands, stored lists (edit the bands at /admin/risk-bands). What runs live today." },
  { n: 4, name: "Methodology 4", text: "Mandatory risk-category matrix: each of the 30 positions may only hold bonds of its allowed risk classes (position 1 = class 1 only ... 30 = class 10 only), class spread at most 2." },
];
