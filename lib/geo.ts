// Country of a visitor, never the IP address. Order: a country header set by the host or a CDN in front of it
// (Cloudflare cf-ipcountry, Vercel, CloudFront, a Fly proxy that adds one), then an estimate from the browser's timezone.
// An estimate is labelled "estimated" wherever it is shown.

export type Geo = { country: string | null; source: "header" | "estimated" | null };

const TZ: Record<string, string> = {
  "Europe/Rome": "IT", "Europe/Vatican": "VA", "Europe/San_Marino": "SM", "Europe/Paris": "FR", "Europe/Berlin": "DE", "Europe/Busingen": "DE", "Europe/Madrid": "ES", "Europe/Lisbon": "PT",
  "Europe/Amsterdam": "NL", "Europe/Brussels": "BE", "Europe/Luxembourg": "LU", "Europe/Vienna": "AT", "Europe/Zurich": "CH", "Europe/London": "GB", "Europe/Dublin": "IE",
  "Europe/Stockholm": "SE", "Europe/Oslo": "NO", "Europe/Copenhagen": "DK", "Europe/Helsinki": "FI", "Europe/Tallinn": "EE", "Europe/Riga": "LV", "Europe/Vilnius": "LT",
  "Europe/Warsaw": "PL", "Europe/Prague": "CZ", "Europe/Bratislava": "SK", "Europe/Budapest": "HU", "Europe/Bucharest": "RO", "Europe/Sofia": "BG", "Europe/Athens": "GR",
  "Europe/Zagreb": "HR", "Europe/Ljubljana": "SI", "Europe/Belgrade": "RS", "Europe/Malta": "MT", "Europe/Monaco": "MC", "Europe/Istanbul": "TR", "Europe/Kiev": "UA", "Europe/Kyiv": "UA", "Europe/Moscow": "RU",
  "Atlantic/Reykjavik": "IS", "Asia/Nicosia": "CY",
  "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US", "America/Los_Angeles": "US", "America/Phoenix": "US", "America/Anchorage": "US", "Pacific/Honolulu": "US",
  "America/Toronto": "CA", "America/Vancouver": "CA", "America/Montreal": "CA", "America/Mexico_City": "MX", "America/Sao_Paulo": "BR", "America/Argentina/Buenos_Aires": "AR", "America/Bogota": "CO", "America/Santiago": "CL", "America/Lima": "PE",
  "Asia/Dubai": "AE", "Asia/Riyadh": "SA", "Asia/Jerusalem": "IL", "Asia/Kolkata": "IN", "Asia/Calcutta": "IN", "Asia/Singapore": "SG", "Asia/Hong_Kong": "HK", "Asia/Shanghai": "CN", "Asia/Tokyo": "JP", "Asia/Seoul": "KR", "Asia/Bangkok": "TH", "Asia/Karachi": "PK",
  "Australia/Sydney": "AU", "Australia/Melbourne": "AU", "Australia/Perth": "AU", "Pacific/Auckland": "NZ", "Africa/Johannesburg": "ZA", "Africa/Cairo": "EG", "Africa/Lagos": "NG", "Africa/Casablanca": "MA", "Africa/Tunis": "TN",
};

const HEADERS = ["cf-ipcountry", "x-vercel-ip-country", "cloudfront-viewer-country", "x-country-code", "x-geo-country", "fly-client-country"];

/** Reads a two-letter country from the request headers, or null. */
export function countryFromHeaders(h: { get(name: string): string | null }): string | null {
  for (const n of HEADERS) {
    const v = h.get(n)?.trim().toUpperCase();
    if (v && /^[A-Z]{2}$/.test(v) && v !== "XX" && v !== "T1") return v;
  }
  return null;
}

/** Rough country from an IANA timezone name such as "Europe/Rome". */
export function countryFromTimezone(tz: unknown): string | null {
  return typeof tz === "string" ? TZ[tz] ?? null : null;
}

export function geoOf(h: { get(name: string): string | null }, tz?: unknown): Geo {
  const header = countryFromHeaders(h);
  if (header) return { country: header, source: "header" };
  const est = countryFromTimezone(tz);
  return est ? { country: est, source: "estimated" } : { country: null, source: null };
}
