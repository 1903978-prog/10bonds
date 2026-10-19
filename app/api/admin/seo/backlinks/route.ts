import { NextResponse } from "next/server";
import { linksFromCsv } from "@/lib/seo/backlinkCsv";
import { bingInboundLinks } from "@/lib/seo/bing";
import { LISTING_SITES } from "@/lib/seo/listingSites";
import { SITE_URL } from "@/lib/seo/crawl";
import { bad, httpUrl, int, isoDay, notFound, oneOf, seoAdmin, str } from "@/lib/seo/input";
import {
  deleteBacklink, deleteOpportunity, getSeoSetting, listBacklinks, listOpportunities, markStale, saveBacklinks, saveOpportunity, setSeoSetting,
} from "@/lib/seo/store";

export const dynamic = "force-dynamic";

const LINK_TYPES = ["editorial", "directory", "social", "forum", "partner", "sponsored"] as const;
const RELS = ["follow", "nofollow", "ugc", "sponsored"] as const;
const STATUSES = ["active", "lost", "unverified"] as const;
const OPP_KINDS = ["publisher", "blog", "education", "youtube", "mention", "other"] as const;
const OPP_STATUSES = ["idea", "contacted", "in_progress", "won", "declined"] as const;

/** Ticked listing sites: { siteId: ISO day it was done }. */
async function listingDone(): Promise<Record<string, string>> {
  try { return JSON.parse((await getSeoSetting("listing_done")) ?? "{}"); } catch { return {}; }
}

export async function GET() {
  if (!(await seoAdmin())) return notFound();
  const [backlinks, opportunities, checkedAt, done, bingAt] = await Promise.all([
    listBacklinks(), listOpportunities(), getSeoSetting("backlinks_checked_at"), listingDone(), getSeoSetting("backlinks_bing_at"),
  ]);
  return NextResponse.json(
    { backlinks, opportunities, checkedAt, listing: { sites: LISTING_SITES, done }, bing: { configured: !!process.env.BING_WEBMASTER_API_KEY, syncedAt: bingAt } },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  if (!(await seoAdmin())) return notFound();
  const b = await req.json().catch(() => ({}));
  switch (b?.op) {
    case "save": {
      const sourceUrl = httpUrl(b.sourceUrl);
      const targetUrl = httpUrl(b.targetUrl) ?? SITE_URL + "/";
      const linkType = oneOf(b.linkType, LINK_TYPES);
      const rel = oneOf(b.rel, RELS);
      const status = oneOf(b.status, STATUSES);
      if (!sourceUrl || !linkType || !rel || !status) return bad("Linking page URL, link type, rel and status are needed.");
      if (status === "active" && !isoDay(b.verifiedAt)) return bad("An active link needs the date you last saw it live.");
      await saveBacklinks([{
        id: int(b.id, 1, Number.MAX_SAFE_INTEGER), sourceUrl, targetUrl, linkType, rel, status,
        relevance: int(b.relevance, 1, 5), quality: int(b.quality, 1, 5), verifiedAt: isoDay(b.verifiedAt), discoveredAt: isoDay(b.discoveredAt),
        source: "manual", notes: str(b.notes, 500),
      }]);
      return NextResponse.json({ ok: true });
    }
    case "delete": {
      const id = int(b.id, 1, Number.MAX_SAFE_INTEGER);
      if (!id) return bad("Missing id.");
      await deleteBacklink(id);
      return NextResponse.json({ ok: true });
    }
    case "import": {
      if (typeof b.csv !== "string" || b.csv.length > 2_000_000) return bad("Attach a CSV file up to 2 MB.");
      const { links, skipped, error } = linksFromCsv(b.csv, SITE_URL + "/");
      if (error) return bad(error);
      // Links Google or another tool saw on a date count as live on that date; without a date they stay unverified.
      const n = await saveBacklinks(links.map((l) => ({
        sourceUrl: l.sourceUrl, targetUrl: l.targetUrl, linkType: "editorial", rel: l.rel, status: l.verifiedAt ? "active" : "unverified",
        relevance: null, quality: null, verifiedAt: l.verifiedAt, source: "csv", notes: null,
      })));
      await setSeoSetting("backlinks_checked_at", new Date().toISOString());
      return NextResponse.json({ imported: n, skipped });
    }
    case "checked": {
      // The admin states they looked at the backlink sources: an empty list is then a verified zero.
      await setSeoSetting("backlinks_checked_at", new Date().toISOString());
      await markStale();
      return NextResponse.json({ ok: true });
    }
    case "listing": {
      const id = typeof b.id === "string" && LISTING_SITES.some((x) => x.id === b.id) ? b.id : null;
      if (!id) return bad("Unknown site.");
      const done = await listingDone();
      if (b.done) done[id] = new Date().toISOString().slice(0, 10);
      else delete done[id];
      await setSeoSetting("listing_done", JSON.stringify(done));
      return NextResponse.json({ ok: true });
    }
    case "bing": {
      // Bing Webmaster Tools' inbound links count as seen live today; links Bing no longer reports are left as they were.
      const key = process.env.BING_WEBMASTER_API_KEY;
      if (!key) return bad("The Bing key (BING_WEBMASTER_API_KEY) is not set.");
      let links;
      try { links = await bingInboundLinks(key); } catch (e) { return bad(`Bing did not answer: ${(e as Error).message}`); }
      const today = new Date().toISOString().slice(0, 10);
      const n = await saveBacklinks(links.map((l) => ({
        sourceUrl: l.sourceUrl, targetUrl: l.targetUrl, linkType: "editorial", rel: "follow", status: "active",
        relevance: null, quality: null, verifiedAt: today, source: "bing", notes: null,
      })));
      const now = new Date().toISOString();
      await setSeoSetting("backlinks_bing_at", now);
      await setSeoSetting("backlinks_checked_at", now);
      if (!n) await markStale();
      return NextResponse.json({ imported: n });
    }
    case "opportunity": {
      const kind = oneOf(b.kind, OPP_KINDS);
      const status = oneOf(b.status, OPP_STATUSES);
      const name = str(b.name, 150);
      if (!kind || !status || !name) return bad("Type, name and status are needed.");
      await saveOpportunity({ id: int(b.id, 1, Number.MAX_SAFE_INTEGER), kind, name, status, url: httpUrl(b.url), notes: str(b.notes, 1000) });
      return NextResponse.json({ ok: true });
    }
    case "deleteOpportunity": {
      const id = int(b.id, 1, Number.MAX_SAFE_INTEGER);
      if (!id) return bad("Missing id.");
      await deleteOpportunity(id);
      return NextResponse.json({ ok: true });
    }
  }
  return bad("Unknown operation.");
}
