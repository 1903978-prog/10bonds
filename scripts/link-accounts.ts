// Makes (or refreshes) the test accounts of the link check: a free user, a read-only admin and one account each on Plus, Premium and Pro.
// Run on a GitHub runner or in CI against the accounts database. Passwords come from the environment (LINKCHECK_PASSWORD), are hashed here and never printed.
// Usage: LINKCHECK_PASSWORD=... npx vite-node -c vitest.config.ts scripts/link-accounts.ts
import { accountsSql } from "@/lib/accounts";
import { FREE_USER_EMAIL, PAID_TEST_EMAILS, READONLY_ADMIN_EMAIL } from "@/lib/linkCheckAccounts";
import { hashPassword } from "@/lib/password";

const password = process.env.LINKCHECK_PASSWORD ?? "";
if (password.length < 24) {
  console.error("LINKCHECK_PASSWORD is missing or too short.");
  process.exit(1);
}
const sql = await accountsSql();
const hash = await hashPassword(password);
const accounts = [
  [FREE_USER_EMAIL, "link-check-free", "free"],
  [READONLY_ADMIN_EMAIL, "link-check-admin", "free"],
  [PAID_TEST_EMAILS.plus, "link-check-plus", "plus"],
  [PAID_TEST_EMAILS.premium, "link-check-premium", "premium"],
  [PAID_TEST_EMAILS.pro, "link-check-pro", "pro"],
] as const;
for (const [email, username, plan] of accounts) {
  // The address is confirmed on purpose (nobody can read mail sent to it); the password is replaced on every run. No Stripe subscription is attached, so nothing is ever billed.
  await sql`
    insert into app.users (email, username, password_hash, plan, terms_version, terms_accepted_at, email_verified_at)
    values (${email}, ${username}, ${hash}, ${plan}, 'link-check', now(), now())
    on conflict (email) do update set password_hash = ${hash}, plan = ${plan}, email_verified_at = coalesce(app.users.email_verified_at, now()), totp_enabled_at = null, totp_secret = null`;
  console.log(`ready: ${email}`);
}
process.exit(0);
