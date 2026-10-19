// Prints the accounts database link the site uses (same rule as accountsUrl in lib/pgUrl.ts): the secret may hold a
// full link, or only the tenbonds_app password, in which case host and database come from the bond-data link.
// Used by the nightly backup. Usage: node scripts/accounts-url.mjs  (reads ACCOUNTS_DATABASE_URL and DATABASE_URL)
const DROP = ["channel_binding", "gssencmode", "target_session_attrs", "sslcert", "sslkey", "sslpassword"];

export function cleanPgUrl(raw) {
  const found = raw.match(/postgres(?:ql)?:\/\/[^\s'"]+/);
  const text = found ? found[0] : raw.trim();
  try {
    const u = new URL(text);
    for (const k of DROP) u.searchParams.delete(k);
    return u.toString();
  } catch {
    return text;
  }
}

export function accountsUrl(accounts, bondData, role = "tenbonds_app") {
  const raw = accounts.trim().replace(/^['"]|['"]$/g, "");
  if (/postgres(ql)?:\/\//.test(raw) || !bondData) return cleanPgUrl(raw);
  try {
    const u = new URL(cleanPgUrl(bondData));
    u.username = role;
    u.password = raw;
    return u.toString();
  } catch {
    return raw;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = process.env.ACCOUNTS_DATABASE_URL;
  if (!a) {
    console.error("ACCOUNTS_DATABASE_URL is not set.");
    process.exit(1);
  }
  process.stdout.write(accountsUrl(a, process.env.DATABASE_URL));
}
