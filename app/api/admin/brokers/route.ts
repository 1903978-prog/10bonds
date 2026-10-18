import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { scoreCountry } from "@/lib/brokers/score";
import { adminLoad, approveDraft, brokerTraffic, currentOf, markVerified, rejectDraft, saveDraft, saveProfile, saveSetting } from "@/lib/brokers/store";
import { COUNTRIES, type BrokerProfile, type Country, type TariffData } from "@/lib/brokers/types";
import { datesProblem, isCountry, profileProblems, tariffProblems } from "@/lib/brokers/validate";
import { daysBetween } from "@/lib/brokers/view";

export const dynamic = "force-dynamic";

async function admin() {
  const u = await currentUser();
  return u?.isAdmin ? u : null;
}

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

export async function GET() {
  if (!(await admin())) return notFound();
  const all = await adminLoad();
  const today = new Date().toISOString().slice(0, 10);
  const countries = Object.fromEntries(
    COUNTRIES.map((c) => {
      const ids = Array.from(new Set(all.tariffs.filter((t) => t.country === c).map((t) => t.brokerId)));
      const current = ids.map((id) => currentOf(all.tariffs.filter((t) => t.country === c && t.brokerId === id), today)).filter((t) => t !== null);
      const excluded = new Set(all.countries[c].excluded.map((e) => e.id));
      const scores = scoreCountry(current.filter((t) => !excluded.has(t.brokerId)).map((t) => ({ brokerId: t.brokerId, data: t.data })), all.methodology);
      const overdue = current.filter((t) => daysBetween(t.verifiedAt, today) > all.methodology.verifyEveryDays).map((t) => t.brokerId);
      return [c, { settings: all.countries[c], scores, overdue }];
    }),
  );
  let traffic = null;
  try {
    traffic = await brokerTraffic();
  } catch {
    traffic = null;
  }
  return NextResponse.json({ ...all, countries, settings: all.countries, traffic, today }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const user = await admin();
  if (!user) return notFound();
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return bad("Bad request");
  const by = user.email;
  switch (b.action) {
    case "draft": {
      if (typeof b.brokerId !== "string" || !isCountry(b.country)) return bad("Choose a broker and a country");
      const problems = tariffProblems(b.data);
      const dp = datesProblem(b.effectiveFrom, b.verifiedAt);
      if (dp) problems.push(dp);
      if (problems.length) return NextResponse.json({ error: "The tariff has problems", problems }, { status: 400 });
      const id = await saveDraft({ brokerId: b.brokerId, country: b.country, data: b.data as TariffData, effectiveFrom: b.effectiveFrom, verifiedAt: b.verifiedAt, note: typeof b.note === "string" ? b.note.slice(0, 1000) : null }, by);
      return NextResponse.json({ ok: true, id });
    }
    case "approve":
      return (await approveDraft(Number(b.id), by)) ? NextResponse.json({ ok: true }) : bad("Draft not found");
    case "reject":
      return (await rejectDraft(Number(b.id))) ? NextResponse.json({ ok: true }) : bad("Draft not found");
    case "verify":
      return (await markVerified(Number(b.id), new Date().toISOString().slice(0, 10), by)) ? NextResponse.json({ ok: true }) : bad("Published tariff not found");
    case "profile": {
      const problems = profileProblems(b.profile);
      if (problems.length) return NextResponse.json({ error: "The profile has problems", problems }, { status: 400 });
      await saveProfile(b.profile as BrokerProfile);
      return NextResponse.json({ ok: true });
    }
    case "methodology":
      return NextResponse.json({ ok: true, value: await saveSetting("methodology", b.value) });
    case "country":
      if (!isCountry(b.country)) return bad("Unknown country");
      return NextResponse.json({ ok: true, value: await saveSetting(`country:${b.country as Country}`, b.value) });
    default:
      return bad("Unknown action");
  }
}
