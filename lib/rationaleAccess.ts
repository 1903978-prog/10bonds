import type { User } from "./accounts";
import { featuresFor } from "./planFeatures";

// Who may open the "why in or out" table of a search: the plans ticked for "why_table" in the admin's feature table
// (/admin/features; Premium and Pro by default) and the admin.
export async function canSeeRationale(user: User | null): Promise<boolean> {
  return (await featuresFor(user)).includes("why_table");
}
