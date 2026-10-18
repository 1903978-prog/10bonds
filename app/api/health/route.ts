// Health check for Fly. Never touches the database, so it does not wake Neon.
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({ ok: true });
}
