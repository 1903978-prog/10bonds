// The methodologies (names for the admin page). No server imports, so client components can use it.
// Methodology 4 is the production engine, the unified portfolio spec (docs/PORTFOLIO_SPEC.md, lib/portfolioSpec.ts). Methodologies 1 to 3 are kept for
// comparison only: an admin opens them on demand with ?m=1..3; the public site never serves them. (The former Methodology 5, the net-spread optimiser, is
// now Methodology 4's objective.)
export type Methodology = 1 | 2 | 3 | 4;
export const METHODOLOGIES: { n: Methodology; name: string; text: string; production: boolean }[] = [
  { n: 1, name: "Methodology 1", text: "Admin-only, on demand. Exact efficient frontier, no spread rule (lib/exactFrontier.ts).", production: false },
  { n: 2, name: "Methodology 2", text: "Admin-only, on demand. Spread logic: minimum extra return per rating step and the coherence rules, solved with HiGHS (lib/coherence.ts).", production: false },
  { n: 3, name: "Methodology 3", text: "Admin-only, on demand. 30 average-risk bands, stored lists (edit the bands at /admin/risk-bands).", production: false },
  { n: 4, name: "Methodology 4 (production)", text: "The unified portfolio spec: the 30-position risk matrix (class spread at most 2), ten bonds at 10% each with the highest equal-weight credit-adjusted net spread, one bond per issuer group, sector cap, duration rule per horizon, no stale prices, no subordinated debt. Repeated windows are spread over expected-loss terciles. Infeasible positions stay empty. Details at /admin/portfolio-efficiency.", production: true },
];
