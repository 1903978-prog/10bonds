// Makes (or refreshes) the two test accounts of the link check: a free user and a read-only admin.
// Run on a GitHub runner or in CI against the accounts database. Passwords come from the environment (LINKCHECK_PASSWORD), are hashed here and never printed.
// Usage: LINKCHECK_PASSWORD=... npx vite-node -c vitest.config.ts scripts/link-accounts.ts
import { accountsSql } from "@/lib/accounts";
import { FREE_USER_EMAIL, READONLY_ADMIN_EMAIL } from "@/lib/linkCheckAccounts";
import { hashPassword } from "@/lib/password";

const password = process.env.LINKCHECK_PASSWORD ?? "";
if (password.length < 24) {
  console.error("LINKCHECK_PASSWORD is missing or too short.");
  process.exit(1);
}
const sql = await accountsSql();
const hash = await hashPassword(password);
for (const [email, username] of [[FREE_USER_EMAIL, "link-check-free"], [READONLY_ADMIN_EMAIL, "link-check-admin"]] as const) {
  // The address is confirmed on purpose (nobody can read mail sent to it); the password is replaced on every run. Plan stays free.
  await sql`
    insert into app.users (email, username, password_hash, plan, terms_version, terms_accepted_at, email_verified_at)
    values (${email}, ${username}, ${hash}, 'free', 'link-check', now(), now())
    on conflict (email) do update set password_hash = ${hash}, plan = 'free', email_verified_at = coalesce(app.users.email_verified_at, now()), totp_enabled_at = null, totp_secret = null`;
  console.log(`ready: ${email}`);
}
process.exit(0);
