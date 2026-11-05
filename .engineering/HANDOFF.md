# HANDOFF — exact recovery instructions
1. Run `python3 scripts/aeos/aeos.py resume`.
2. Compare the checkpoint SHA with `git log -1`.
3. Continue with the checkpoint's "Next task". Do not restart a broad audit.

Overwritten by `aeos.py checkpoint`:

<!-- CHECKPOINT:BEGIN -->
- Time: 2026-11-05 12:31 UTC
- Repo: 1903978-prog/10bonds
- Branch: claude/aeos-install
- SHA: 2ae06cf
- Task done: Install AEOS 1.0.0 (docs/config only, no business logic)
- Next task: Await user mandate; no backlog assigned
- Changes: none
- Tests run: test_aeos.py 15 tests; validate OK
- Result: PARTIAL
- Blockers: none
- Approvals held: none: no merge/deploy approved
- Release restrictions: HOLD (CLAUDE.md): no workflow runs on push to claude/** or session branches; HOLD: draft PRs do not run CI; CI starts when marked ready; HOLD: only nightly-live-check may e-mail Livio; RULE ZERO: never ask Livio to do what a tool can do; Lenovo: only qwen3:8b with keep_alive; dates like 03 Nov 2026; Production deploy: separate written approval
<!-- CHECKPOINT:END -->
