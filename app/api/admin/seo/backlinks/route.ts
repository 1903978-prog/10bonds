import { NextResponse } from "next/server";
import { linksFromCsv } from "@/lib/seo/backlinkCsv";
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

export async function GET() {
  if (!(await seoAdmin())) return notFound();
  const [backlinks, opportunities, checkedAt] = await Promise.all([listBacklinks(), listOpportunities(), getSeoSetting("backlinks_checked_at")]);
  return NextResponse.json({ backlinks, opportunities, checkedAt }, { headers: { "Cache-Control": "no-store" } });
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
