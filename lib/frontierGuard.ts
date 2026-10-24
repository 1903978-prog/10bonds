import type { PublicBond } from "./types";
import { bondRisk } from "./ratings";
import { LIMITS } from "./limits";

// Diversification guard on every frontier list (the owner, 24/10/2026): 10 bonds at 1/10 each, one per issuer (as every
// list), and at most 2 bonds rated B+ or below (risk score 8 or more on the site's scale). Enforced inside the exact
// frontier (lib/exactFrontier.ts).

export const WEAK_RISK = 8;
export const MAX_WEAK = 2;

export const isWeak = (b: PublicBond) => (bondRisk(b) ?? LIMITS.risk.max) >= WEAK_RISK;
