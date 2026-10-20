import { cookies } from "next/headers";
import type { User } from "./accounts";
import { proStatus } from "./pro";

/** The admin's chosen view ("retail" or "pro"), set by the Retail/Pro switch in the header. */
export const VIEW_COOKIE = "tb_view";

/** Approved professionals always land in the Pro tool; the admin lands there only after switching to Pro. */
export async function landsInPro(user: User | null): Promise<boolean> {
  if (!user) return false;
  if (user.isAdmin) return (await cookies()).get(VIEW_COOKIE)?.value === "pro";
  return (await proStatus(user).catch(() => "none")) === "approved";
}
