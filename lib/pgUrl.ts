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
