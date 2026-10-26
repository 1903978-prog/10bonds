import type postgres from "postgres";

// Accounts whose e-mail address was never confirmed are otherwise kept forever. This clean-up removes them once
// they are older than UNCONFIRMED_MAX_DAYS, but only accounts that never touched payments (no Stripe customer or
// subscription) and never the admin. It is OFF unless PRIVACY_PURGE_UNCONFIRMED=on: Livio decides, and the privacy
// page's retention text is updated, before it is switched on.
export const UNCONFIRMED_MAX_DAYS = 30;

export function unconfirmedPurgeOn(env: Record<string, string | undefined> = process.env): boolean {
  return (env.PRIVACY_PURGE_UNCONFIRMED ?? "").trim().toLowerCase() === "on";
}

/** Deletes the unconfirmed, never-paid accounts older than UNCONFIRMED_MAX_DAYS with every row about them
 *  (same rows as deleteUser). Returns how many accounts went. Does nothing unless the flag is on. */
export async function purgeUnconfirmed(
  sql: ReturnType<typeof postgres>,
  adminEmails: string[],
  env: Record<string, string | undefined> = process.env,
): Promise<number> {
  if (!unconfirmedPurgeOn(env)) return 0;
  const admins = adminEmails.length ? adminEmails : [""];
  return sql.begin(async (tx) => {
    const ids = (await tx<{ id: string }[]>`
      select id from app.users
      where email_verified_at is null
        and stripe_customer_id is null and stripe_subscription_id is null
        and created_at < now() - make_interval(days => ${UNCONFIRMED_MAX_DAYS})
        and lower(email) not in ${tx(admins)}
      for update`).map((r) => r.id);
    if (!ids.length) return 0;
    await tx`delete from app.events where user_id in ${tx(ids)}`;
    await tx`delete from app.search_usage where user_id in ${tx(ids)}`;
    await tx`update app.trial_codes set redeemed_by = null where redeemed_by in ${tx(ids)}`;
    await tx`update app.trial_codes set created_by = null where created_by in ${tx(ids)}`;
    const r = await tx`delete from app.users where id in ${tx(ids)}`;
    return r.count;
  });
}
