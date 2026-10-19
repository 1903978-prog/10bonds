import { cookies } from "next/headers";
import { accountsConfigured, findUserById, type User } from "./accounts";
import { readSession, SESSION_COOKIE } from "./session";
import { adminStateOf, MFA_COOKIE } from "./twoFactor";

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
    const adminState = adminStateOf(u, jar.get(MFA_COOKIE)?.value);
    return adminState === undefined ? u : { ...u, adminState, isAdmin: adminState === "ok" };
  } catch {
    return null;
  }
}
