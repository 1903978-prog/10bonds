// Version register for every calculation that produces a number customers see. A fingerprint is the hash of the
// model's inputs; when the inputs change, the fingerprint changes, the test in lib/legalRisk/checks.test.ts fails,
// and the author has to bump the version here on purpose (so no score changes silently).
import { DEFAULT_RATES, DEFAULT_YEARS } from "../seo/defaultRates";
import { LOSS_GIVEN_DEFAULT } from "../expectedLoss";
import { MODEL_VERSION } from "../assessmentModel";

export type ModelVersion = { id: string; module: string; version: string; effective: string; description: string; fingerprint?: string };

/** FNV-1a 32-bit hash of any JSON-able value, as 8 hex digits. */
export function fingerprint(v: unknown): string {
  const s = JSON.stringify(v);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}

export const MODEL_VERSIONS: ModelVersion[] = [
  { id: "risk-score-mapping", module: "lib/ratings.ts", version: "1.0.0", effective: "2026-10-24", description: "Risk score 1-10: own LR score when present, else the worst of the three agency grades; 1=AAA ... 10=CC/C/D." },
  { id: "expected-loss", module: "lib/expectedLoss.ts", version: "1.0.0", effective: "2026-10-19", description: "Yield after expected losses = yield - cumulative default / years x loss given default.", fingerprint: "6c8e8ec8" },
  { id: "default-rate-table", module: "lib/seo/defaultRates.ts", version: "1.0.0", effective: "2026-10-19", description: "Average cumulative default rates per notch and horizon, combined from three public studies.", fingerprint: "52b70902" },
  { id: "issuer-assessment", module: "lib/assessmentModel.ts", version: MODEL_VERSION, effective: "2026-10-25", description: "Issuer research score and six-factor scorecard on report pages; every published assessment is logged in app.assessment_evidence." },
  { id: "risk-premium-curve", module: "lib/riskPremium/versions.ts", version: "database", effective: "2026-10-20", description: "Required spread per rating; versions are stored in the database and never edited once active." },
];

/** Fingerprints of the current model inputs (compare with MODEL_VERSIONS). */
export const currentFingerprints = (): Record<string, string> => ({
  "expected-loss": fingerprint({ lgd: LOSS_GIVEN_DEFAULT }),
  "default-rate-table": fingerprint({ years: DEFAULT_YEARS, rates: DEFAULT_RATES }),
});
