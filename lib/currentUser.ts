import { cookies, headers } from "next/headers";
import { accountsConfigured, findUserById, type User } from "./accounts";
import { readSession, SESSION_COOKIE } from "./session";
import { adminStateOf, MFA_COOKIE } from "./twoFactor";

/** Set by the yellow "Admin yes/no" switch. It can only take admin powers away, never give them. */
export const AS_USER_COOKIE = "tb_as_user";

/**
 * The signed-in user. The admin account has its admin powers only in a browser that passed the
 * two-factor step; elsewhere it is an ordinary account and `adminState` says what is missing.
 */
export async function currentUser(): Promise<User | null> {
  if (!accountsConfigured()) return null;
  const jar = await cookies();
  const id = readSession(jar.get(SESSION_COOKIE)?.value);
  if (id === null) return null;
  try {
    const u = await findUserById(id);
    if (!u) return null;
    // The read-only test admin has admin powers for reading only: any request that is not GET or HEAD sees an ordinary account.
    if (u.readOnly) {
      const method = (await headers()).get("x-method") ?? "";
      if (method !== "GET" && method !== "HEAD") return { ...u, isAdmin: false, adminState: undefined };
    }
    const adminState = adminStateOf(u, jar.get(MFA_COOKIE)?.value);
    if (adminState === undefined) return u;
    if (adminState === "ok" && jar.get(AS_USER_COOKIE)?.value === "1") return { ...u, isAdmin: false, adminState: undefined, asUser: true };
    return { ...u, adminState, isAdmin: adminState === "ok" };
  } catch {
    return null;
  }
}
