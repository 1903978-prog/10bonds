import { setNewsletter } from "@/lib/accounts";
import { NEWSLETTER_TEXT, newsletterLang, readUnsubscribeToken } from "@/lib/newsletter";
import { requestLang } from "@/lib/welcomeEmail";

export const dynamic = "force-dynamic";

// One click from the e-mail, no sign-in needed. POST is the "one-click" form mail apps use (RFC 8058).
async function unsubscribe(req: Request) {
  const t = NEWSLETTER_TEXT[newsletterLang(requestLang(req))];
  const id = readUnsubscribeToken(new URL(req.url).searchParams.get("t"));
  const ok = id !== null && (await setNewsletter(id, false, "unsubscribe-link").catch(() => false));
  const msg = ok ? t.unsubscribed : t.invalid;
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>10BONDS</title></head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f7;color:#1d1d1f;display:flex;min-height:100vh;align-items:center;justify-content:center">
<div style="background:#fff;border-radius:24px;padding:32px;max-width:420px;margin:16px;text-align:center"><p style="font-size:17px;line-height:1.5;margin:0 0 20px">${msg}</p><a href="/" style="color:#0071e3;text-decoration:none">10BONDS</a></div></body></html>`;
  return new Response(html, { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export const GET = unsubscribe;
export const POST = unsubscribe;
