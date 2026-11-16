| ID | Legacy | Asked | This atom | Impl · Test · Merge · Deploy · Live | Next step |
|---|---|---|---|---|---|
| task_10bonds_002A | 10B-0003 | 12 Nov 2026 | Deploy removes the stuck machine a cancelled release left be | ✅ ✅ ✅ ✅ ❓ | confirm on next controlled deploy |
| task_10bonds_003A | 10B-0004 | 12 Nov 2026 | Deploy can remove one named machine when two healthy version | ✅ ✅ ✅ ✅ ❓ | confirm on next controlled deploy |
| task_10bonds_004B | 10B-0005 | 12 Nov 2026 | Credit worker runs 24/7 on the Lenovo (service install) | ✅ ❌ ✅ ❌ ❌ | install on Lenovo (physical access); PowerShell never run |
| task_10bonds_005A | 10B-0006 | 12 Nov 2026 | Worker offline e-mail removed; alerts only on status endpoin | ✅ ✅ ✅ ✅ ❓ | confirm with nightly live check |
| task_10bonds_007A | 10B-0008 | 13 Nov 2026 | Unauthorized e-mail alerts removed (backup, link check) | ✅ ✅ ✅ ✅ ❓ | confirm at next nightly live check |
| task_10bonds_007B | 10B-0008 | 13 Nov 2026 | Nightly live check reports last backup and link-check run in | ✅ ✅ ✅ ✅ ❓ | confirm at next nightly live check |
| task_10bonds_008A | 10B-0002 | 12 Nov 2026 | Keep bond runs that published portfolio results still in use | ✅ ❓ ⏸ ⏸ ⏸ | decide when to release (held out of 12 Nov release) |
| task_10bonds_009A | 10B-D01 | 11 Nov 2026 | DB setup test no longer flaky (defect D-01) | ✅ ✅ ✅ ✅ ❓ | none unless CI flakes again |
| task_10bonds_010A | #506 | 11 Nov 2026 | Failed promo coupon stops checkout instead of full-price pay | ✅ ✅ ✅ ✅ ❓ | cannot test in live Stripe mode; code check only |
| task_10bonds_011A | #489/#504 | 04 Nov 2026 | Dates shown as 03 Nov 2026 on English pages, e-mails, newsle | ✅ ❓ ✅ ✅ ❓ | spot-check pages |
| task_10bonds_011B | CLAUDE.md | 04 Nov 2026 | Dates on IT/FR/DE pages follow the same format (open questio | ❌ ❌ ❌ ❌ ❌ | Livio decision (open question in CLAUDE.md) |
| task_10bonds_013A | #522 | 15 Nov 2026 | Sovereign credit metrics must carry citations | ✅ ✅ ✅ ❌ ❌ | needs exact-SHA GO to deploy; live still 0625877 |
| task_10bonds_014A | #518 | 15 Nov 2026 | Reconcile sole-human release policy (EEN-REL-001) with regre | ✅ ✅ ✅ ❌ ❌ | needs exact-SHA GO to deploy; live still 0625877 |
| task_10bonds_015A | #519 | 15 Nov 2026 | Restore archived #454 uptime proof during controlled Fly dep | ✅ ✅ ❌ ❌ ❌ | superseded by task_10bonds_015B |
| task_10bonds_016A | #520 | 15 Nov 2026 | Stripe webhook offline signed-event acceptance + malformed J | ✅ ✅ ✅ ❌ ❌ | needs exact-SHA GO to deploy; live still 0625877 |
| task_10bonds_017A | #521 | 15 Nov 2026 | Lenovo worker read-only scheduled-task, Ollama, integrity di | ✅ ✅ ✅ ❌ ❌ | needs exact-SHA GO to deploy; live still 0625877 |
| task_10bonds_018A | #523 | 15 Nov 2026 | Add 10BONDS Copilot release-evidence guidance (docs) | ✅ ❓ ❌ ❌ ❌ | closed unmerged 16 Nov 14:06 UTC; reopen only if wanted |
| task_10bonds_019A | #525 | 15 Nov 2026 | Revise standing rules and deployment guidelines (docs) | ✅ ❓ ❌ ❌ ❌ | closed unmerged 16 Nov 14:06 UTC; reopen only if wanted |
| task_10bonds_020A | docs/release-governance-setup.md | 13 Nov 2026 | GitHub settings for release governance applied (production e | ❌ ❌ ❌ ❌ ❌ | Livio decision (owner settings) |
| task_10bonds_021A | P4 | 12 Nov 2026 | Stripe test-mode signup, plan, checkout verified end to end | ❌ ❌ ❌ ❌ ❌ | needs Stripe test key; no live payment |
| task_10bonds_015B | #526 | 16 Nov 2026 | Uptime probe during Fly deploys (replaces #519) | ✅ ✅ ❌ ❌ ❌ | review and merge |

Atoms: 26 captured · 23 implemented · 17 tested · 18 merged · 13 deployed · 5 verified live · 4 blocked

Last synced: 16 Nov 2026 14:30 UTC
