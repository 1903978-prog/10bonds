// Readiness check for Fly's blue-green release (Livio, 29/10/2026): the new machine only takes traffic after it has rendered the home page and
// the plans page once itself, so the first visitor never waits for a cold start. Once ready it stays ready (the answer is then instant).
// /api/health stays the plain "process is up" check.
export const dynamic = "force-dynamic";

let ready = false;
let running: Promise<boolean> | null = null;

async function warmPages(): Promise<boolean> {
  const base = `http://127.0.0.1:${process.env.PORT ?? "8080"}`;
  for (const path of ["/", "/pricing"]) {
    const res = await fetch(base + path, { cache: "no-store", signal: AbortSignal.timeout(20_000), headers: { "x-readiness": "1" } });
    if (!res.ok) return false;
    await res.arrayBuffer();
  }
  return true;
}

export async function GET() {
  if (!ready) {
    running ??= warmPages().catch(() => false).finally(() => { running = null; });
    ready = await running;
  }
  return Response.json({ ready }, { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
