/**
 * Cumulative default chance in %, read in straight lines between the table's years: from 0 at t = 0 to the first year, then year to year,
 * and beyond the last year stretched in proportion (never above 100%). Shared by the corporate and the sovereign table.
 */
export function linearCumulative(row: readonly number[], ys: readonly number[], years: number): number {
  if (!(years > 0)) return 0;
  if (years <= ys[0]) return (row[0] * years) / ys[0];
  for (let i = 1; i < ys.length; i++) {
    if (years <= ys[i]) return row[i - 1] + ((row[i] - row[i - 1]) * (years - ys[i - 1])) / (ys[i] - ys[i - 1]);
  }
  return Math.min(100, (row[row.length - 1] * years) / ys[ys.length - 1]);
}
