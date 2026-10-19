import { cookies } from "next/headers";
import { OWNER_COOKIE, accountsConfigured, forgetVisitor, recordEvents } from "@/lib/accounts";
import { currentUser } from "@/lib/currentUser";
import { allow, clientIp } from "@/lib/rateLimit";
import { parseEventBatch } from "@/lib/trackRules";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const done = new Response(null, { status: 204 });
  if (!accountsConfigured() || !allow(`events:${clientIp(req)}`, 60, 60_000)) return done;
  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > 20_000) return done;
    body = JSON.parse(text);
  } catch {
    return done;
  }
  const batch = parseEventBatch(body);
  if (!batch || batch.events.length === 0) return done;
  const user = await currentUser();
  try {
    // The owner's own visits never count in the stats, signed in or not (devices that opened /admin carry a cookie);
    // anything this browser sent before goes too.
    const ownerDevice = (await cookies()).get(OWNER_COOKIE)?.value === "1";
    if (user?.isAdmin || ownerDevice) { await forgetVisitor(batch.visitorId); return done; }
    await recordEvents(batch.events.map((e) => ({ visitorId: batch.visitorId, userId: user?.id ?? null, ...e })));
  } catch {
    // Usage stats never break the site.
  }
  return done;
}
