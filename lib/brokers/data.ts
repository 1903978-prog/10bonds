import seed from "./seed.json";
import type { BrokerProfile, Tariff } from "./types";

// Researched broker data, checked on 18 October 2026 against each broker's official tariff pages and PDFs
// (source link and quote stored with every fee). It seeds the database once; the admin keeps it current.
// Brokers whose bond fees could not be confirmed on an official source are not included.

export const PROFILES = seed.profiles as BrokerProfile[];
export const SEED_TARIFFS = seed.tariffs as Tariff[];
