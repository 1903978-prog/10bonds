import raw from "./issuerEnrichment.json";

// Per-issuer facts looked up from free public sources by the "Issuer enrichment" workflow (scripts/issuer-enrich.ts), keyed by
// lib/ranking.ts issuerKey. sector: one of the twelve sectors; sectorSource says where it came from; parent: issuerKey of the
// ultimate parent found in the GLEIF record (parentSource "gleif"), used to put subsidiaries into one issuer group.
export type Enriched = { sector?: string; sectorSource?: "sec-sic" | "name-rule" | "gleif-parent"; lei?: string; parent?: string; parentName?: string };
export const ENRICHMENT_VERSION: string = (raw as { version: string }).version;
export const ENRICHED: Record<string, Enriched> = (raw as { issuers: Record<string, Enriched> }).issuers;
