import { NextResponse } from "next/server";
import { accountsConfigured, createUser, redeemTrialCode, trialCodeStatus, normaliseEmail, normaliseUsername } from "@/lib/accounts";
import { readCredentials, withSession } from "@/lib/authResponse";
import { hashPassword } from "@/lib/password";
import { allow, clientIp } from "@/lib/rateLimit";
import { TERMS_VERSION } from "@/lib/terms";
import { checkSolution } from "@/lib/botCheck";
import { sendConfirmation } from "@/lib/confirm";
import { normaliseCode } from "@/lib/codes";
import { requestLang } from "@/lib/welcomeEmail";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!accountsConfigured()) return NextResponse.json({ error: "Free accounts open very soon." }, { status: 503 });
  if (!allow(`signup:${clientIp(req)}`, 5)) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  const { email, password, username, acceptTerms, challenge, nonce, website, code: rawCode, newsletter } = await readCredentials(req);
  // "website" is a hidden field people never see; scripts that fill every field do.
  if (website || !checkSolution(challenge, nonce))
    return NextResponse.json({ error: "The robot check did not pass. Please reload the page and try again." }, { status: 400 });
  if (acceptTerms !== true)
    return NextResponse.json({ error: "Please tick the box to agree to the Terms and Conditions." }, { status: 400 });
  const e = normaliseEmail(email);
  if (!e) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  const u = normaliseUsername(username);
  if (!u) return NextResponse.json({ error: "Please choose a username of 3 to 24 letters, digits, dots, dashes or underscores." }, { status: 400 });
  if (typeof password !== "string" || password.length < 8 || password.length > 200)
    return NextResponse.json({ error: "Please choose a password of at least 8 characters." }, { status: 400 });
  // Optional 10BONDS code: checked before the account exists, so a typo can be fixed without a second sign-up.
  const hasCode = typeof rawCode === "string" && rawCode.trim() !== "";
  const code = hasCode ? normaliseCode(rawCode) : null;
  if (hasCode && !code) return NextResponse.json({ error: "That does not look like a 10BONDS code (10B-XXXX-XXXX). Leave the box empty if you have none." }, { status: 400 });
  try {
    if (code) {
      const status = await trialCodeStatus(code);
      if (status === "unknown") return NextResponse.json({ error: "This code does not exist. Check it, or leave the box empty." }, { status: 404 });
      if (status === "used") return NextResponse.json({ error: "This code has already been used. Leave the box empty to continue without it." }, { status: 409 });
    }
    const user = await createUser(e, u, await hashPassword(password), TERMS_VERSION, newsletter === true);
    if (user === "email-taken") return NextResponse.json({ error: "An account with this email already exists. Please sign in." }, { status: 409 });
    if (user === "username-taken") return NextResponse.json({ error: "This username is taken. Please choose another." }, { status: 409 });
    const redeemed = code ? await redeemTrialCode(user.id, code) : null;
    const premiumUntil = redeemed && typeof redeemed === "object" ? redeemed.premiumUntil : user.premiumUntil;
    const emailed = await sendConfirmation(user.id, user.email, u, requestLang(req));
    return withSession(user.id, {
      ok: true,
      plan: user.plan,
      premiumUntil,
      codeApplied: redeemed !== null && typeof redeemed === "object",
      // Someone used the same code in the seconds between the check and the sign-up: the account exists, the code did not apply.
      codeError: redeemed === "used" || redeemed === "unknown" ? "The account was created, but the code could not be used (it was just used by someone else)." : undefined,
      emailSent: emailed === "sent",
    });
  } catch (err) {
    console.error("[signup] failed:", (err as { code?: string }).code ?? "", (err as Error).message);
    return NextResponse.json({ error: "Sign-up is not available right now. Please try again later." }, { status: 503 });
  }
}
