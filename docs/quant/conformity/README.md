# Conformity program (27/10/2026)

Data: `requirements.json` (48 rows, total weight 117). Run `node scripts/quant-conformity.mjs` for the scores and the points-to-gain table.
Statuses: I = implemented 100%, P = partly 50%, D/M = different/missing 0%. Columns: `orig` audit 24/10, `live` today, `A` strict V2.0, `B` V2.0 + addendum, `builtOff` if built-but-off parts were live.

## Result (27/10)
Live 61.1%, Score A 61.1%, Score B 62.8%, built-but-off 66.7%. 95% needs 111.15 points; Score B is 73.5, so the gap is 37.65.

## What can close the gap (Score B points)
- Code only, no outside input: about 10 (rows 24, 25, 29, 30, 38, 41, 42, 45, 47 and the 10 EUR/USD curve diagnostic).
- Needs owner approval (changes live numbers): about 10.5 (rows 5, 13, 14, 18, 27).
- Needs outside data (and a legal check of reuse): about 21 (rows 4, 8, 11, 12, 15, 17, 19, 20, 26, 43, 46).
So 95% cannot be reached from code alone. The best case without data or approval is about 85 points (72%).

## Critical path
1. Default-rate data (CEREP / KBRA / sovereign study) -> rows 11, 12, 14, 15 -> then 13, 18 -> then calibrated correlation (26) -> CVaR budget (27, approval).
2. Recovery data per bond (17) -> 18, 19.
3. Historical point-in-time prices and ratings -> 43, 46.
Independent tracks: manifest (42, 38), diagnostics (24, 25, 10), validation stats (29, 30, 45, 47), slider ceiling report (41).
