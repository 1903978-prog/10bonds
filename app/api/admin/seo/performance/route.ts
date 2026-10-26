import { NextResponse } from "next/server";
import { refreshPsi, storedPsi } from "@/lib/seo/assess";
import { firstPartyFunnel } from "@/lib/seo/funnel";
import { analytics, searchConsole, serviceAccount } from "@/lib/seo/google";
import { bad, marketOf, notFound, seoAdmin, str } from "@/lib/seo/input";
import { LOCALES } from "@/lib/seo/locales";
import { getSeoSetting, setSeoSetting } from "@/lib/seo/store";
import { gscProperty } from "@/lib/seo/engines";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Source<T> = { state: "not_connected" | "needs_setting" | "error" | "connected"; message: string; data: T | null };

/** Search Console rows for one market's pages only (/it/..., /fr/..., /de/...); totals stay site-wide and say so. */
function filterGsc<T extends { data: Awaited<ReturnType<typeof searchConsole>> | null }>(src: T, market: (typeof LOCALES)[number]): T {
  if (!src.data) return src;
  const mine = (url: string) => {
    try {
      const p = new URL(url).pathname;
      return p === `/${market}` || p.startsWith(`/${market}/`);
    } catch {
      return false;
    }
  };
  const pages = src.data.pages.filter((p) => mine(p.key));
  const sum = (k: "clicks" | "impressions") => pages.reduce((s, p) => s + p[k], 0);
  return { ...src, data: { ...src.data, pages, marketTotals: { clicks: sum("clicks"), impressions: sum("impressions") } } };
}

/** Real search and business numbers, kept apart from the SEO Development Score. Never filled with made-up values. */
export async function GET(req: Request) {
  if (!(await seoAdmin())) return notFound();
  const market = marketOf(new URL(req.url).searchParams.get("market"));
  const sa = serviceAccount();
  const [gscSite, ga4Property, verification, psi, funnel] = await Promise.all([
    gscProperty(),
    getSeoSetting("ga4_property"),
    getSeoSetting("google_verification"),
    storedPsi(market),
    firstPartyFunnel(28, market).catch(() => null),
  ]);
  const gsc: Source<Awaited<ReturnType<typeof searchConsole>>> = !sa
    ? { state: "not_connected", message: "No Google service account yet (GOOGLE_SERVICE_ACCOUNT_JSON).", data: null }
    : !gscSite
      ? { state: "needs_setting", message: "Enter the Search Console property below.", data: null }
      : await searchConsole(gscSite).then((data) => ({ state: "connected" as const, message: `Property ${gscSite}`, data })).catch((e) => ({ state: "error" as const, message: (e as Error).message, data: null }));
  const ga4: Source<Awaited<ReturnType<typeof analytics>>> = !sa
    ? { state: "not_connected", message: "No Google service account yet (GOOGLE_SERVICE_ACCOUNT_JSON).", data: null }
    : !ga4Property
      ? { state: "needs_setting", message: "Enter the GA4 property ID below.", data: null }
      : await analytics(ga4Property).then((data) => ({ state: "connected" as const, message: `Property ${ga4Property}`, data })).catch((e) => ({ state: "error" as const, message: (e as Error).message, data: null }));
  return NextResponse.json(
    { market, serviceAccount: sa?.client_email ?? null, settings: { gscSite, ga4Property, verification }, gsc: filterGsc(gsc, market), ga4, psi, funnel },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  if (!(await seoAdmin())) return notFound();
  const b = await req.json().catch(() => ({}));
  if (b?.op === "psi") return NextResponse.json(await refreshPsi(marketOf(b?.market)));
  const gsc = str(b?.gscSite, 200);
  if (gsc && !/^(https?:\/\/\S+\/|sc-domain:[a-z0-9.-]+)$/.test(gsc)) return bad("The Search Console property looks like https://10bonds.fly.dev/ (with the final slash) or sc-domain:example.com.");
  const ga4 = str(b?.ga4Property, 30);
  if (ga4 && !/^\d{5,15}$/.test(ga4)) return bad("The GA4 property ID is a number (Admin > Property details), not the G- measurement ID.");
  const ver = str(b?.verification, 120);
  if (ver && !/^[A-Za-z0-9_-]{10,100}$/.test(ver)) return bad("Paste only the content value of the Google verification tag.");
  await setSeoSetting("gsc_site", gsc);
  await setSeoSetting("ga4_property", ga4);
  await setSeoSetting("google_verification", ver);
  return NextResponse.json({ ok: true });
}
