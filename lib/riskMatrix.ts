// The mandatory risk-category matrix of Methodology 4 (owner, 28/10/2026): the bond risk classes (integers 1 to 10) a slider position may hold.
// Identical for Short, Medium and Long. One versioned table shared by the optimiser and the validator. Not editable in Admin.
export const RISK_MATRIX_VERSION = "rm1-2026-10-28";
export const MATRIX_POSITIONS = 30;

/** Allowed risk classes per slider position (index 0 = position 1), exactly as specified. */
export const RISK_MATRIX: readonly (readonly number[])[] = [
  [1], [1, 2], [1, 2, 3], [2, 3], [2, 3, 4], [3, 4],
  [3, 4, 5], [3, 4, 5], [4, 5], [4, 5, 6], [4, 5, 6], [4, 5, 6],
  [5, 6], [5, 6, 7], [5, 6, 7], [5, 6, 7], [6, 7], [6, 7, 8],
  [6, 7, 8], [6, 7, 8], [7, 8], [7, 8, 9], [7, 8, 9], [7, 8, 9],
  [8, 9], [8, 9, 10], [8, 9, 10], [8, 9, 10], [9, 10], [10],
];

export const MAX_RISK_SPREAD = 2;
export const allowedClasses = (position: number): readonly number[] => RISK_MATRIX[position - 1] ?? [];

/** Positions that share the same allowed classes (they must give distinct return / expected-loss points where feasible): this position's place `i` of `m`. */
export function windowOf(position: number): { i: number; m: number } {
  const key = (p: number) => allowedClasses(p).join(",");
  let first = position, last = position;
  while (first > 1 && key(first - 1) === key(position)) first--;
  while (last < MATRIX_POSITIONS && key(last + 1) === key(position)) last++;
  return { i: position - first, m: last - first + 1 };
}

/** True when these actual bond risk classes obey the matrix for the position: only allowed classes, and max - min <= 2. */
export function matrixOk(position: number, classes: number[]): boolean {
  const ok = new Set(allowedClasses(position));
  if (!classes.length || !classes.every((c) => Number.isInteger(c) && ok.has(c))) return false;
  return Math.max(...classes) - Math.min(...classes) <= MAX_RISK_SPREAD;
}
