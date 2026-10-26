import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/currentUser";

/** Pages that show ratings or scores are the admin's only (the owner, 25/10/2026): customers get a plain "not found". */
export async function requireAdmin(to?: string): Promise<void> {
  if ((await currentUser())?.isAdmin === true) return;
  if (to) redirect(to);
  notFound();
}
