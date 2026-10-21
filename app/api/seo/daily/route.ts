import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { takeSnapshot } from "@/lib/seo/daily";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Daily snapshot of the search numbers, called by GitHub Actions (seo-daily.yml) with an HMAC of "seo-daily" keyed by ACCOUNTS_DATABASE_URL. */
export async function POST(req: Request) {
  const key = process.env.ACCOUNTS_DATABASE_URL;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!key || !given) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const want = createHmac("sha256", key).update("seo-daily").digest("hex");
  if (given.length !== want.length || !timingSafeEqual(Buffer.from(given), Buffer.from(want))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const fetched = await takeSnapshot(true).catch((e) => {
    console.error("SEO daily snapshot failed:", (e as Error).message);
    return false;
  });
  return NextResponse.json({ ok: fetched });
}
