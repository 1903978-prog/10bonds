// The owner's own accounts never count in any admin statistic (visits, pages, signups, funnels).
// Their browsers are left out too: any browser an owner account was ever signed in on, signed-out visits included.
import { FREE_USER_EMAIL, PAID_TEST_EMAILS, READONLY_ADMIN_EMAIL } from "./linkCheckAccounts";

export const OWNER_EMAILS = [
  ...new Set([
    "mbarbieri.fot@gmail.com",
    "mbarbieri@gmail.com",
    "1903978@gmail.com",
    // The link check's test accounts are not customers either.
    READONLY_ADMIN_EMAIL,
    FREE_USER_EMAIL,
    ...Object.values(PAID_TEST_EMAILS),
    ...(process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()),
  ].filter(Boolean)),
];

/** SQL condition for "app.events" rows: true unless the visitor is an owner's. Pass the postgres `sql` tag. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function notOwnerVisitor(sql: any) {
  return sql`visitor_id not in (
    select distinct x.visitor_id from app.events x join app.users u on u.id = x.user_id where lower(u.email) in ${sql(OWNER_EMAILS)})`;
}
