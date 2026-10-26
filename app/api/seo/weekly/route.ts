import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runAssessment } from "@/lib/seo/assess";
import { loadAllShown } from "@/lib/bonds";
import { shareBondPages } from "@/lib/seo/share";

export const dynamic = "force-dynamic";

/**
 * Weekly refresh of the SEO & GEO page, called every Monday by GitHub Actions (seo-weekly.yml). The caller proves itself
 * with an HMAC of "seo-weekly" keyed by ACCOUNTS_DATABASE_URL, a secret both GitHub and the server already hold.
 * Answers at once and runs in the background, since a full crawl takes a few minutes.
 */
export async function POST(req: Request) {
  const key = process.env.ACCOUNTS_DATABASE_URL;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!key || !given) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const want = createHmac("sha256", key).update("seo-weekly").digest("hex");
  if (given.length !== want.length || !timingSafeEqual(Buffer.from(given), Buffer.from(want))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  runAssessment("weekly", "auto").catch((e) => console.error("SEO weekly refresh failed:", (e as Error).message));
  // The bond pages (/bonds/{ISIN} in every language) go to IndexNow once a week.
  loadAllShown()
    .then((d) => (d.source === "live" ? shareBondPages(d.bonds.map((b) => b.isin)) : undefined))
    .catch((e) => console.error("Bond pages IndexNow failed:", (e as Error).message));
  return NextResponse.json({ ok: true, started: new Date().toISOString() }, { status: 202 });
}
