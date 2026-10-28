// The methodologies (names for the admin page). No server imports, so client components can use it.
// Methodology 4 is the production engine, the unified portfolio spec (docs/PORTFOLIO_SPEC.md, lib/portfolioSpec.ts). Methodologies 1 to 3 are kept for
// comparison only: an admin opens them on demand with ?m=1..3; the public site never serves them. (The former Methodology 5, the net-spread optimiser, is
// now Methodology 4's objective.)
export type Methodology = 1 | 2 | 3 | 4;
export const METHODOLOGIES: { n: Methodology; name: string; text: string; production: boolean }[] = [
  { n: 1, name: "Methodology 1", text: "Admin-only, on demand. Exact efficient frontier, no spread rule (lib/exactFrontier.ts).", production: false },
  { n: 2, name: "Methodology 2", text: "Admin-only, on demand. Spread logic: minimum extra return per rating step and the coherence rules, solved with HiGHS (lib/coherence.ts).", production: false },
  { n: 3, name: "Methodology 3", text: "Admin-only, on demand. 30 average-risk bands, stored lists (edit the bands at /admin/risk-bands).", production: false },
  { n: 4, name: "Methodology 4 (production)", text: "The unified portfolio spec (anchored risk bands): portfolio 30 is the list with the highest average risk that obeys every rule, portfolio 1 the lowest; portfolios 2 to 29 sit on 0.1-step bands between them, each with a window of three risk classes (class spread at most 2). Inside its band every portfolio holds ten bonds at 10% each with the highest equal-weight credit-adjusted net spread, one bond per issuer group, sector cap, no bond above 25% of the expected loss, duration rule per horizon, no stale prices, no subordinated debt. A position with no list is retried with ladder steps 1 to 3 and shown as adjusted. Details at /admin/portfolio-efficiency.", production: true },
];
