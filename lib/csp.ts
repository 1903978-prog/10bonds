// Browser safety rules for every page.
// Everything the site loads comes from its own address; Stripe and Resend are only called from the server.
// Scripts only run when they carry this request's one-time code (nonce); Next.js adds it to its own scripts.
// 'strict-dynamic' lets those scripts load the rest of the app's code. Development also needs 'unsafe-eval' for hot reload.
// Embeddable pages (/embed/...) are the one exception to "frame-ancestors 'none'": any website may show them in a frame.
export function buildCsp(nonce: string, dev = process.env.NODE_ENV !== "production", embeddable = false): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${dev ? " ws:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    embeddable ? "frame-ancestors *" : "frame-ancestors 'none'",
  ].join("; ");
}

// A fresh random code per request, so an attacker can never guess it.
export function newNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
