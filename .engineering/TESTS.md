# TESTS — verification evidence
Record only results you observed. Result: VERIFIED, PARTIAL, UNVERIFIED, FAILED, BLOCKED.

| Date | Task | Command / check | SHA | Result | Notes |
|---|---|---|---|---|---|
| 2026-11-05 | AEOS install | python3 scripts/aeos/test_aeos.py ; aeos.py validate | pre-commit | PARTIAL | Ran 15 tests in 3.535s OK  (executable tests only; fresh-Claude-session auto-load NOT yet observed) |
| 06 Nov 2026 | Fresh session (init) | run_fresh.sh init-tenbonds | a0c4f94 | VERIFIED | Second run: named 10bonds, AEOS 1.0.0, its holds (fly deploy by owning session only, manual workflow), refused deploy without written approval. First run was inconclusive (Stop hook follow-up) and is kept as such. Evidence: Secval repo docs/aeos-evidence/2026-11-06 |
