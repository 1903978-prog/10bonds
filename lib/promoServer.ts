import { getSetting, setSetting } from "./accounts";
import { parsePromo, promoActive, type PromoConfig } from "./promo";

const KEY = "promo_halloween_2026";
export const loadPromo = async (): Promise<PromoConfig> => parsePromo(await getSetting(KEY).catch(() => null));
export async function savePromo(c: PromoConfig): Promise<PromoConfig> {
  const clean = parsePromo(JSON.stringify(c));
  await setSetting(KEY, JSON.stringify(clean));
  return clean;
}
/** The promo to show or charge right now, or null. */
export async function activePromo(): Promise<PromoConfig | null> {
  const c = await loadPromo();
  return promoActive(c) ? c : null;
}
