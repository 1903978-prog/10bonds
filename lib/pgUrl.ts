/**
 * Make a pasted Postgres connection string usable by postgres.js.
 * - Neon's Connect box can be copied as `psql 'postgresql://...'` or with quotes/spaces around it:
 *   keep only the URL itself.
 * - Neon's string ends in `?sslmode=require&channel_binding=require`. postgres.js does not know
 *   `channel_binding` and sends it to the server as a setting, which the server refuses, so every
 *   query fails. Keep only what postgres.js reads.
 */
const DROP = ["channel_binding", "gssencmode", "target_session_attrs", "sslcert", "sslkey", "sslpassword"];

export function cleanPgUrl(raw: string): string {
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

/**
 * The accounts login may be saved as only the password of the `tenbonds_app` role (Neon shows the
 * password on its own). Then build the link from the bond-data link (same Neon project, host and
 * database) with that role and password.
 */
export function accountsUrl(accounts: string, bondData: string | undefined, role = "tenbonds_app"): string {
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
