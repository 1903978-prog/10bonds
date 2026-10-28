// The five methodologies (names for the admin page). No server imports, so client components can use it.
export type Methodology = 1 | 2 | 3 | 4 | 5;
export const METHODOLOGIES: { n: Methodology; name: string; text: string }[] = [
  { n: 1, name: "Methodology 1", text: "Exact efficient frontier, no spread rule (lib/exactFrontier.ts)." },
  { n: 2, name: "Methodology 2", text: "Spread logic: minimum extra return per rating step and the coherence rules, solved with HiGHS (lib/coherence.ts)." },
  { n: 3, name: "Methodology 3", text: "30 average-risk bands, stored lists (edit the bands at /admin/risk-bands)." },
  { n: 4, name: "Methodology 4", text: "Mandatory risk-category matrix (default since 28/10/2026): each of the 30 positions may only hold bonds of its allowed risk classes (position 1 = class 1 only ... 30 = class 10 only), class spread at most 2." },
  { n: 5, name: "Methodology 5", text: "Portfolio Efficiency: the same risk matrix as Methodology 4, but each position holds the ten bonds with the highest equal-weight credit-adjusted net spread (EUR, 100k lists; other filters fall back to Methodology 4). Details at /admin/portfolio-efficiency." },
];
