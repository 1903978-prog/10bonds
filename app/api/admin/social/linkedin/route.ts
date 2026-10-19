import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { seoAdmin, notFound } from "@/lib/seo/input";
import { linkedInAuthUrl, linkedInConnect } from "@/lib/seo/share";

// "Connect LinkedIn" in Admin -> SEO -> Sharing: the first visit goes to LinkedIn's sign-in, LinkedIn sends the
// admin back here with a code, and the token for posting on the 10BONDS page is stored (encrypted).
export const dynamic = "force-dynamic";

const COOKIE = "tb_li_state";
const back = (req: Request, msg: string) => NextResponse.redirect(new URL(`/admin/seo?tab=sharing&linkedin=${encodeURIComponent(msg)}`, req.url));

export async function GET(req: Request) {
  if (!(await seoAdmin())) return notFound();
  const q = new URL(req.url).searchParams;
  const jar = await cookies();
  const code = q.get("code");
  if (!code) {
    if (q.get("error")) return back(req, q.get("error_description") ?? q.get("error") ?? "cancelled");
    const state = randomBytes(16).toString("hex");
    const url = linkedInAuthUrl(state);
    if (!url) return back(req, "LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET are not set yet.");
    const res = NextResponse.redirect(url);
    res.cookies.set(COOKIE, state, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/admin/social/linkedin", maxAge: 600 });
    return res;
  }
  if (!q.get("state") || q.get("state") !== jar.get(COOKIE)?.value) return back(req, "The sign-in expired; please try again.");
  try {
    await linkedInConnect(code);
  } catch (e) {
    return back(req, (e as Error).message);
  }
  const res = back(req, "connected");
  res.cookies.delete({ name: COOKIE, path: "/api/admin/social/linkedin" });
  return res;
}
