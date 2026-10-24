import { NextResponse } from "next/server";
import sitemap from "@/app/sitemap";
import { serviceAccount } from "@/lib/seo/google";
import { bad, notFound, seoAdmin, str } from "@/lib/seo/input";
import { indexNowKey, linkedInRedirect, linkedInStatus, shareAll, shareBondPages, shareLog, xConfigured } from "@/lib/seo/share";
import { loadAllShown } from "@/lib/bonds";
import { getSeoSetting, setSeoSetting } from "@/lib/seo/store";
import { gscProperty } from "@/lib/seo/engines";

// Admin -> SEO -> Sharing: which channels are on, the log of what was sent, and the few settings they need.
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await seoAdmin())) return notFound();
  const [log, linkedin, gscSite] = await Promise.all([shareLog(), linkedInStatus(), gscProperty()]);
  return NextResponse.json(
    {
      log,
      indexnow: !!indexNowKey(),
      google: { serviceAccount: serviceAccount()?.client_email ?? null, site: gscSite },
      linkedin: { ...linkedin, redirect: linkedInRedirect() },
      x: xConfigured(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  if (!(await seoAdmin())) return notFound();
  const b = await req.json().catch(() => ({}));
  if (b?.op === "linkedin_org") {
    // The page's number, or its admin address (https://www.linkedin.com/company/12345678/admin/).
    const id = str(b.org, 200)?.match(/(\d{3,})/)?.[1] ?? null;
    if (!id) return bad("Paste the number from your LinkedIn page's admin address.");
    await setSeoSetting("linkedin_org", id);
    return NextResponse.json({ ok: true });
  }
  if (b?.op === "linkedin_disconnect") {
    await setSeoSetting("linkedin_token", null);
    return NextResponse.json({ ok: true });
  }
  if (b?.op === "send_all") {
    const urls = (await sitemap()).map((e) => e.url);
    await shareAll(urls);
    const { bonds, source } = await loadAllShown();
    if (source === "live") await shareBondPages(bonds.map((b) => b.isin));
    return NextResponse.json({ ok: true, pages: urls.length + (source === "live" ? bonds.length * 4 : 0) });
  }
  return bad("Unknown action.");
}
