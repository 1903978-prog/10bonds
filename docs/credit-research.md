# Credit research engine (Ollama worker)

How it works (owner request 1/11/2026):
1. **Queue (website, tiny):** every Top 10 answer calls `enqueueFromSearch` (lib/creditResearchDb.ts), not awaited. Bonds with a current assessment (under 30 days) are skipped; others get one job per ISIN in `app.credit_research_jobs` (P0 nothing stored, P1 stale). The same list is ignored for 5 minutes; an exposure is counted once per ISIN per 10 minutes.
2. **Worker (Lenovo):** `scripts/credit-worker/worker.mjs` claims jobs over HTTPS with a hashed, revocable token (`/api/credit-worker/*`), collects public sources (GLEIF, Wikidata/Wikipedia, the issuer's own site and PDFs, robots.txt and 2 s per host respected), and calls local Ollama only (temperature 0, JSON schema). Nothing heavy runs on the website.
3. **Scoring (website, arithmetic only):** `/complete` validates the facts (`lib/creditResearchSchema.ts`), `lib/creditScoring.ts` calculates IR and BR (version `ir-br-v0.1`), and one transaction archives the old row in `app.bond_credit_analysis_history` and replaces IR + BR together in `app.bond_credit_analysis`. `effective_grade` and exclusion columns are never touched, so portfolio selection does not change.
4. **Lists:** `gptStore` polls `/api/credit-ratings` every 20 s while a list is open and fills IR/BR when a job leaves the queue. `/api/credit-ratings?isins=` is public (IR/BR for everyone).

Fair scheduling: priority ages by 6 hours per level, so a P3 job outranks a new P0 after 18 hours. A dead worker's job is handed out again after the 15-minute lease. Failures retry after 5, 10, 20 ... minutes, five tries, then "failed" (Admin retry).

Limits of this first version: ratings are never "validated" automatically (only provisional or review_required); the model is not calibrated; only the Top 10 path and the queue exist (no EUR-shortlist expansion yet); retrieval finds only what an issuer's public site links.
