# What we asked Livio (search this before asking anything — Rule 4)

# RULE ZERO — NEVER ASK LIVIO TO DO THINGS (Livio, 2/11/2026, "the worst thing you can do"): before any request to him, exhaust every way Claude, a thread, a tool or a script can do it; build one-click scripts for anything on his computer; add repos/settings yourself; never repeat steps he already received. Only a physical, legal or over-ceiling-money act may be asked, with one link and one reply word. Full text: /mnt/project-files/working-rules/never-ask-livio-2026-11-02.md

## LIVIO'S TIME — v4 ADDITIONS (2/11/2026; full text: /mnt/project-files/working-rules/protect-livio-time-v4-2026-11-02.md)

- LINKS: every message prints full clickable https:// URLs for every page, PR, thread, admin route, file, plus a "Links:" line at the end. Never "PR #468" alone, never generic /admin when a specific route exists. Open each link first (200 as the right role) and label it truthfully.
- STEPS when he must act: numbered steps, exact button names, a link per step, expected result, minimal reply, why Claude cannot.
- CHECK BEFORE ASKING: memory, chat, threads, repo, admin state, docs/livio-asks.md. Done or answered already = do not ask. If Claude can do it, do it.
- ASK ONLY for: money over ceiling, legal loosening, irreversible actions, things only he can physically do.
- Small decisions: just do, one line. Re-read the draft before posting (verified this turn, labels right, no repeats, Bangkok/CET). Own mistakes: one line, then fix.
- Self-score daily, target 9.9/10 (log in the v4 file).


Times Bangkok. Add a row for every new ask and its outcome.

| Date | What we asked Livio | Why | Outcome |
|---|---|---|---|
| 2026-10-18 | Add a GitHub Actions secret (menu directions given) | Only he can create account secrets | He asked for full direct links in every manual step, never menu paths |
| 2026-10-24 | Test iPhone results PR #151 before the thread closed | Thread was left open "for testing" | He said close threads right after merge; he reopens if wrong |
| 2026-10-27 | Multiple A/B lists on risk bands, newsletter version, benchmarks | Open design choices | Answered "1a 2b" style; his later spec overrides earlier A/Bs |
| 2026-10-27 | "Try the site" with unverified state | Wanted a human check | Complaint: lost time; threads must verify themselves |
| 2026-10-28 | Admin links /admin/bond-efficiency and /admin/methodology shared before deploy finished | Announce new pages | "Page not found"; link gate rule created (no link until deploy verified) |
| 2026-10-28 | A/B on a point his own spec had already answered | Missed the spec | Complaint; check specs before asking |
| 2026-10-28 | Approve one manual "Deploy to Fly" run (about 0.15 USD, 8 min) per batch | Deploys cost money and the sandbox cannot build | Approved for deploy 386 to 387 (live 14:41 Bangkok); each further deploy needs his yes |
| 2026-10-28 | Does he or anyone connected hold bonds or get paid by issuers, brokers or data vendors? | Needed before weekly email can send | Unanswered; weekly email sending stays OFF |
| 2026-10-28 | Press "Send test to me" then "Switch sending ON" at https://10bonds.com/admin/weekly-email | Safety gate on the weekly email | Pending (blocked by the question above) |
| 2026-10-28 | Names and credentials for the About page team section | Page stays neutral without them | Pending; section stays neutral |
| 2026-10-28 | Confirm 30 or fewer shown snapshot rows (public hides identical repeats) | Snapshots 28-31 show fewer than 30 | Kept hidden; ask only if he wants all 30 |
| 2026-10-29 | Headline wording (Mathematics-based vs AI-based) | Pasted audits disagreed | Livio 13:38: "AI-based Bond portfolios", final; live 14:42 |
| 2026-10-29 | Time-protection rules failed again | Rules lived in an optional skill | Moved into CLAUDE.md top block plus Stop hook (this change) |

## Production change approvals

A manual production data change (repair, bulk update, destructive migration, TRUNCATE, DROP) runs only if a row below is APPROVED by Livio for that exact change. Enforced by `scripts/prod-change-gate.mjs` inside the workflow (fails closed), not by habit. A row is single-use: set status to USED after the run. Print the code hash with `node scripts/prod-change-gate.mjs --workflow <key> --hash`. Routine app writes, bond imports, subscriptions, visitor events and scheduled calculations are not covered.

| ID | Exact change | Workflow | Code hash | Est. rows | Reversible | Backup + restore evidence | Rollback plan | Approved by / date | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CHG-0001 | #497 link repair: add 45 foreign keys, null 76,880 portfolio run links, no deletions | db-link-repair | (code changed since; not reusable) | 76880 | Partly: links nulled, restore from backup | Backup 10 Nov 09:56Z; restore test passed (run 42781638182) | Restore from backup | Conditional only: "Livio GO 10 Nov" as cited in commit messages (original text not retained, scope not confirmed to cover apply) | EXECUTED-NOT-AUTHORIZED |

Audit history of CHG-0001 (corrected 11 Nov 2026). Proven from GitHub: the apply ran on 10 Nov 11:46-11:47Z in workflow run 42810015367 (check run 11:40Z, run 42809321792), started by workflow_dispatch from the GitHub account 1903978-prog on main a73c612, with no technical approval gate in the workflow. Not proven: whether a person or a Claude session typed the dispatch (both act through that account; no log separates them). The earlier approval was conditional ("Livio GO 10 Nov", wording only quoted in commit messages); his stricter conditions (isolated-copy page checks, row-count reconciliation, fresh backup plus restore test just before, visitor re-creation on hold until the 18-26 Oct cause is known) were written 11 Nov 01:13Z, after the run. The run therefore is recorded as EXECUTED-NOT-AUTHORIZED: it happened without the approval conditions being met or independently provable, even though a backup (10 Nov 09:56Z) existed. It cannot be reused (status is not APPROVED and the code changed).

How an approval is now proven (a line in this file is never enough): (1) a row here, APPROVED, bound to the code hash; (2) a click by Livio on the GitHub Environment `production-change` for that exact run, read back from GitHub's approvals record; (3) backup AND restore test both under 26 h old, read from the database; (4) an atomic single-use claim row `prod_change_claim:<ID>` in app.settings: reruns, second dispatches and concurrent runs are blocked. Inputs are validated (`CHG-0000` only) and passed through environment variables, never pasted into shell text.

Rules history: `/mnt/project-files/working-rules/` holds older drafts; the CLAUDE.md block supersedes them.
