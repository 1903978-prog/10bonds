import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { currentUser } from "@/lib/currentUser";
import { allow, clientIp } from "@/lib/rateLimit";
import { backupCodesLeft, confirmSetup, setMfaCookie, startSetup, verifySecondFactor } from "@/lib/twoFactor";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

/** Admin two-factor: what is missing in this browser, and (for setup) a new secret with its QR code. */
export async function GET() {
  const u = await currentUser();
  if (!u?.adminState) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (u.adminState === "setup") {
    const { secret, url } = await startSetup(u);
    return NextResponse.json({ state: "setup", secret, qr: await QRCode.toDataURL(url, { margin: 1, width: 220 }) }, { headers: noStore });
  }
  if (u.adminState === "ok") return NextResponse.json({ state: "ok", backupLeft: await backupCodesLeft(u.id) }, { headers: noStore });
  return NextResponse.json({ state: "needed" }, { headers: noStore });
}

/** confirm = first code after scanning (turns 2FA on, returns the backup codes once); verify = code for this browser. */
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u?.adminState) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!allow(`2fa-admin:${clientIp(req)}`, 10) || !allow(`2fa:${u.id}`, 10))
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const code = typeof b?.code === "string" ? b.code.slice(0, 40) : "";
  if (b?.action === "confirm" && u.adminState === "setup") {
    const codes = await confirmSetup(u.id, code);
    if (!codes) return NextResponse.json({ error: "That code is not correct. Check the phone's clock and try the newest code." }, { status: 400 });
    const res = NextResponse.json({ ok: true, backupCodes: codes }, { headers: noStore });
    setMfaCookie(res, u.id);
    return res;
  }
  if (b?.action === "verify" && u.adminState === "needed") {
    if (!(await verifySecondFactor(u.id, code))) return NextResponse.json({ error: "That code is not correct." }, { status: 400 });
    const res = NextResponse.json({ ok: true }, { headers: noStore });
    setMfaCookie(res, u.id);
    return res;
  }
  return NextResponse.json({ error: "Nothing to do." }, { status: 400 });
}
