import { bingKpis, type SearchKpis } from "./bing";
import { gscSiteFor, searchConsoleKpis, serviceAccount } from "./google";
import { getSeoSetting } from "./store";

// Google Search Console and Bing Webmaster headline figures, each reporting whether it is connected.

export type Engine = { state: "not_connected" | "no_property" | "error" | "connected"; message: string; data: SearchKpis | null };

/**
 * The Search Console property to read: the one set in the Performance tab, else the 10bonds.com property shared with the
 * service account. Without this fallback every Google table stayed empty when the setting was never typed in.
 */
let detected: { site: string | null; until: number } | null = null;
export async function gscProperty(): Promise<string | null> {
  if (!serviceAccount()) return null;
  const set = await getSeoSetting("gsc_site");
  if (set) return set;
  if (detected && detected.until > Date.now()) return detected.site;
  const site = await gscSiteFor().catch(() => null);
  detected = { site, until: Date.now() + (site ? 6 * 3_600_000 : 600_000) };
  return site;
}

export async function google(): Promise<Engine> {
  const sa = serviceAccount();
  if (!sa) return { state: "not_connected", message: "Google is not connected yet.", data: null };
  try {
    // The 10bonds.com property shared with the service account; the Performance tab setting is the fallback.
    const site = await gscProperty();
    if (!site) return { state: "no_property", message: `Add ${sa.client_email} as a user in Search Console.`, data: null };
    return { state: "connected", message: site, data: await searchConsoleKpis(site) };
  } catch (e) {
    return { state: "error", message: (e as Error).message, data: null };
  }
}

export async function bing(): Promise<Engine> {
  const key = process.env.BING_WEBMASTER_API_KEY;
  if (!key) return { state: "not_connected", message: "Bing is not connected yet.", data: null };
  try {
    const { sites, data } = await bingKpis(key);
    const hosts = sites.map((u) => new URL(u).hostname);
    // The site answers on 10bonds.com and www redirects, so a www-only Bing site collects almost nothing.
    const hint = hosts.includes("10bonds.com") ? "" : " Add https://10bonds.com/ in Bing Webmaster Tools to see its traffic.";
    return { state: "connected", message: hosts.join(" + ") + hint, data };
  } catch (e) {
    return { state: "error", message: (e as Error).message, data: null };
  }
}
