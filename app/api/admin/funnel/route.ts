import { NextResponse } from "next/server";
import { countryCounts, funnelDaily } from "@/lib/accounts";
import { currentUser } from "@/lib/currentUser";
import { ALL_FUNNEL_KINDS, dropOff } from "@/lib/funnelStats";
import { FUNNEL, FUNNEL_EXTRA } from "@/lib/trackRules";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = await currentUser();
  if (!u?.isAdmin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const days = Number(new URL(req.url).searchParams.get("days") ?? 30);
  const d = await funnelDaily(days, ALL_FUNNEL_KINDS);
  const countries = await countryCounts(days);
  const dayList = [...new Set(d.perDay.map((r) => r.day))].sort().reverse();
  const table = dayList.map((day) => ({ day, counts: Object.fromEntries(d.perDay.filter((r) => r.day === day).map((r) => [r.kind, r.n])) }));
  return NextResponse.json(
    { days: d.days, steps: dropOff(d.visitors, FUNNEL), extra: dropOff(d.visitors, FUNNEL_EXTRA).map((s) => ({ kind: s.kind, visitors: s.visitors })), table, payingNow: d.payingNow, countries },
    { headers: { "Cache-Control": "no-store" } },
  );
}
