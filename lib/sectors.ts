import type { PublicBond } from "./types";
import { groupInfo } from "./issuerGroups";

// Major sector taxonomy, version 1 (the owner, 25/10/2026): twelve major sectors; banks and insurers are both inside
// Financials, so the per-sector limit of the coherence rules counts them together. The bond copy carries no sector, so
// 10bonds assigns it per issuer group from the issuer's name (lib/issuerGroups.ts), not from a data vendor. A group
// without an assignment is "Unclassified": all of them share one bucket under the same limit, so a missing
// classification can never count as a diversified sector.

export const SECTOR_TAXONOMY_VERSION = "sectors-v1";
export const UNCLASSIFIED = "Unclassified";
export const SECTORS = [
  "Financials", "Government & agencies", "Industrials", "Consumer discretionary", "Consumer staples", "Health care",
  "Technology", "Communication services", "Utilities", "Energy", "Materials", "Real estate",
] as const;

export const sectorOf = (b: Pick<PublicBond, "issuer" | "isin"> & { feedSector?: string | null }): string => groupInfo(b).sector ?? b.feedSector ?? UNCLASSIFIED;
