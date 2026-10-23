import { NextResponse } from "next/server";
import { allow, clientIp } from "@/lib/rateLimit";
import { loadBondsFor } from "@/lib/bonds";
import { parseFilter } from "@/lib/bondFilter";
import { shapeCurve } from "@/lib/singleBond";
import { bestTableFor, curveAt } from "@/lib/bestTable";
import { RISK_LEVELS } from "@/lib/limits";
import type { Tier } from "@/lib/types";
import { LIMITS } from "@/lib/limits";
import { currentUser } from "@/lib/currentUser";
import { publicQuota, consumeSearch } from "@/lib/searchQuota";

export const dynamic = "force-dynamic";

/** Best yield per risk step for one duration, with the bonds behind each dot (cut to the caller's plan). */
export async function GET(req: Request) {
  // Sliders send one request per move; 240 a minute per address (both bond routes together) is far above normal use.
  if (!allow(`bonds:${clientIp(req)}`, 240, 60_000))
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  const url = new URL(req.url);
  const raw = Number(url.searchParams.get("duration"));
  const { min, max, initial } = LIMITS.duration;
  const duration = Number.isFinite(raw) && url.searchParams.get("duration") !== null ? Math.min(max, Math.max(min, raw)) : initial;

  let data, table;
  try {
    const f = parseFilter(url.searchParams);
    [data, table] = await Promise.all([loadBondsFor(f), bestTableFor(f)]);
  } catch {
    return NextResponse.json({ error: "Bond data is not available right now. Please try again later." }, { status: 503 });
  }
  // An account whose e-mail is still unconfirmed after the grace period searches as a visitor (the owner, 23/10/2026).
  const signedIn = await currentUser();
  const user = signedIn?.confirmBlocked ? null : signedIn;
  let tier: Tier = user ? user.plan : "visitor";
  const preview = url.searchParams.get("preview");
  if (data.source === "sample" && (preview === "free" || preview === "plus")) tier = preview;

  // Weekly allowance per plan (Free: limited; Plus and Premium: see SEARCH_LIMITS). Visitors keep their short preview.
  const usage = user && tier === user.plan ? await consumeSearch(user, "single") : null;
  if (usage && !usage.allowed)
    return NextResponse.json({ error: "Weekly search limit reached.", limitReached: publicQuota(usage), tier }, { status: 402, headers: { "Cache-Control": "no-store" } });
  // How many bonds this filter has at all, and their duration span, so an empty chart can say why.
  const durs = data.bonds.map((b) => b.modifiedDuration).filter((d): d is number => d !== null);
  const coverage = { count: durs.length, min: durs.length ? Math.min(...durs) : null, max: durs.length ? Math.max(...durs) : null };
  return NextResponse.json(
    { tier, coverage, points: shapeCurve(curveAt(table, duration).map((c) => ({ ...c, label: RISK_LEVELS[c.level - 1].label })), tier, user?.isAdmin === true), quota: usage ? publicQuota(usage) : null, source: data.source, asOf: data.asOf, inputs: { duration } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
