import { accountsConfigured, forgetVisitor, recordEvents } from "@/lib/accounts";
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
    // The owner's own visits never count in the stats; anything this browser sent before sign-in goes too.
    if (user?.isAdmin) { await forgetVisitor(batch.visitorId); return done; }
    await recordEvents(batch.events.map((e) => ({ visitorId: batch.visitorId, userId: user?.id ?? null, ...e })));
  } catch {
    // Usage stats never break the site.
  }
  return done;
}
