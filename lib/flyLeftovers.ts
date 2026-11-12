// 10B-0003 (12 Nov 2026): a cancelled blue-green release can leave its new ("green") machine behind, never healthy and on
// another image. Fly then refuses every later blue-green deploy ("found multiple image versions"). This picks ONLY such
// leftovers, and only when the decision is unambiguous; otherwise it picks nothing and says why.

export type FlyMachine = { id: string; state?: string; image_ref?: { tag?: string; digest?: string }; checks?: { name?: string; status?: string }[] };

const imageOf = (m: FlyMachine) => m.image_ref?.digest || m.image_ref?.tag || "";
const healthy = (m: FlyMachine) => m.state === "started" && (m.checks?.length ?? 0) > 0 && m.checks!.every((c) => c.status === "passing");

export function leftoverMachines(machines: FlyMachine[]): { destroy: string[]; reason: string } {
  const images = new Set(machines.map(imageOf));
  if (images.size <= 1) return { destroy: [], reason: "one image only: nothing to clean" };
  const good = machines.filter(healthy);
  const goodImages = new Set(good.map(imageOf));
  if (good.length === 0) return { destroy: [], reason: "no healthy machine: refusing to remove anything" };
  if (goodImages.size !== 1 || goodImages.has("")) return { destroy: [], reason: "healthy machines run different images: refusing to choose" };
  const keep = [...goodImages][0];
  const destroy = machines.filter((m) => imageOf(m) !== keep && !healthy(m)).map((m) => m.id);
  return { destroy, reason: destroy.length ? `remove ${destroy.length} unhealthy machine(s) not on the serving image` : "nothing to clean" };
}

/** Named removal (deploy input remove_machine): allowed only if that machine exists and another healthy machine keeps serving. */
export function canRemoveNamed(machines: FlyMachine[], id: string): { ok: boolean; reason: string } {
  if (!/^[0-9a-f]{8,20}$/.test(id)) return { ok: false, reason: "not a machine id" };
  if (!machines.some((m) => m.id === id)) return { ok: false, reason: `machine ${id} not found` };
  const others = machines.filter((m) => m.id !== id && healthy(m));
  if (others.length === 0) return { ok: false, reason: "no other healthy machine: refusing (would cause downtime)" };
  return { ok: true, reason: `remove ${id}; ${others.length} other healthy machine(s) keep serving` };
}
