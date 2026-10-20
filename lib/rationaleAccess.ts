import type { User } from "./accounts";
import { proStatus } from "./pro";

// Who may open the "why in or out" table of a search (Livio, 20/10/2026): Premium, approved Pro users and the admin.
// One place for the plan check, so the plan pages and any later Premium feature use the same rule.
export async function canSeeRationale(user: User | null): Promise<boolean> {
  if (!user) return false;
  if (user.isAdmin || user.plan === "premium") return true;
  return (await proStatus(user).catch(() => "none")) === "approved";
}
