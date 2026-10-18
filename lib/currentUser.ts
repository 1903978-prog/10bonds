import { cookies } from "next/headers";
import { accountsConfigured, findUserById, type User } from "./accounts";
import { readSession, SESSION_COOKIE } from "./session";

export async function currentUser(): Promise<User | null> {
  if (!accountsConfigured()) return null;
  const id = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (id === null) return null;
  try {
    return await findUserById(id);
  } catch {
    return null;
  }
}
