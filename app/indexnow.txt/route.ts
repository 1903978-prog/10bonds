import { indexNowKey } from "@/lib/seo/share";

// The IndexNow key file: Bing and the other IndexNow engines read it to check that a submission comes from this site.
export const dynamic = "force-dynamic";

export function GET() {
  const key = indexNowKey();
  return key ? new Response(key, { headers: { "Content-Type": "text/plain; charset=utf-8" } }) : new Response("Not found", { status: 404 });
}
