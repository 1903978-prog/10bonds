// Risk consistency (owner, 28/10/2026): the ten bonds of every portfolio lie inside ONE window of three consecutive risk classes, i.e.
// highest bond score - lowest bond score <= 2. No exception for the slider ends. The exact model carries the rule itself (one window
// variable, below); nothing is solved without it and trimmed afterwards.

export const MAX_SPREAD = 2;
export const WINDOWS = [1, 2, 3, 4, 5, 6, 7, 8] as const; // window w holds classes w, w+1, w+2

export const spreadOf = (cls: number[]) => (cls.length ? Math.max(...cls) - Math.min(...cls) : 0);
export const riskConsistent = (cls: number[]) => cls.length > 0 && spreadOf(cls) <= MAX_SPREAD;

/** Windows that can hold a list whose average risk lies in [min, max]. */
export const windowsFor = (band: { min: number; max: number }) => WINDOWS.filter((w) => w <= band.max + 1e-9 && w + 2 >= band.min - 1e-9);

/**
 * LP rows and binaries for the window rule over bonds with the given risk classes: exactly one window is on, and a bond can be chosen
 * only when its class lies in the window that is on (x_i <= sum of the windows holding its class). `x` names bond i's binary variable.
 */
export function windowModel(cls: number[], x: (i: number) => string, tag = ""): { rows: string[]; binaries: string[] } {
  const w = (j: number) => `w${tag}${j}`;
  const rows = [` win${tag}: ${WINDOWS.map(w).join(" + ")} = 1`];
  cls.forEach((c, i) => {
    const ok = WINDOWS.filter((j) => j <= c && c <= j + 2).map(w);
    rows.push(ok.length ? ` wb${tag}${i}: ${x(i)} - ${ok.join(" - ")} <= 0` : ` wb${tag}${i}: ${x(i)} <= 0`);
  });
  return { rows, binaries: WINDOWS.map(w) };
}
