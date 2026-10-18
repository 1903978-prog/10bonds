/**
 * Neon's console connection string ends in `?sslmode=require&channel_binding=require`. postgres.js does
 * not know `channel_binding` and sends it to the server as a setting, which the server refuses
 * ("unrecognized configuration parameter"), so every query fails. Keep only what postgres.js reads.
 */
const DROP = ["channel_binding", "gssencmode", "target_session_attrs", "sslcert", "sslkey", "sslpassword"];

export function cleanPgUrl(raw: string): string {
  try {
    const u = new URL(raw);
    for (const k of DROP) u.searchParams.delete(k);
    return u.toString();
  } catch {
    return raw;
  }
}
