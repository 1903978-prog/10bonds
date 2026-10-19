import { bingKpis, type SearchKpis } from "./bing";
import { gscSiteFor, searchConsoleKpis, serviceAccount } from "./google";
import { getSeoSetting } from "./store";

// Google Search Console and Bing Webmaster headline figures, each reporting whether it is connected.

export type Engine = { state: "not_connected" | "no_property" | "error" | "connected"; message: string; data: SearchKpis | null };

export async function google(): Promise<Engine> {
  const sa = serviceAccount();
  if (!sa) return { state: "not_connected", message: "Google is not connected yet.", data: null };
  try {
    // The 10bonds.com property shared with the service account; the Performance tab setting is the fallback.
    const site = (await gscSiteFor()) ?? (await getSeoSetting("gsc_site"));
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
    return { state: "connected", message: "www.10bonds.com", data: await bingKpis(key) };
  } catch (e) {
    return { state: "error", message: (e as Error).message, data: null };
  }
}
