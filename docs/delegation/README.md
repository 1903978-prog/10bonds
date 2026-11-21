# Standing delegation: how it works and how to reuse it

Files: `policy.json` (classes), `../release-register.json` (evidence), `../../scripts/delegation.mjs` (rules), `../../scripts/delegation-run.mjs` (real inputs), `../../lib/delegation.test.ts` (boundaries).

## Pause or revoke (Livio only)
- Pause now: GitHub repository Settings, Secrets and variables, Actions, Variables: set `RELEASE_DELEGATION` to anything but `ACTIVE`, or delete it. Every automatic release then stops at the gate and at the claim.
- Revoke for good: add a row `DEL-xxxx | <policy sha256> | Livio, <date> | REVOKED` under "Standing delegation" in `docs/livio-asks.md`.

## New repository
Copy this folder, `scripts/delegation*.mjs`, the test and the gate/claim wiring; write that repository's own `policy.json` (its own paths, its own `repo` value) and get a separate activation row. An activation never carries over: the gate refuses a policy whose `repo` differs.

## Honest limits
- The independent review is recorded by the reviewing agent; GitHub cannot prove who reviewed.
- Claude and Livio share one GitHub login, so the repository variable cannot be made agent-proof by a file. Whether agents can write it is UNVERIFIED / NOT APPLIED until Livio confirms the account or token used by agents has no variable-write permission.
- The release gate reads the policy and approvals from `origin/main`, so a branch cannot approve itself, but anyone who can merge to main can edit them; that is why every edit to them is RED and changes the policy hash.
