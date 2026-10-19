/** Minimum investment in short form with its currency: €1, €1k, €100k, €1m (US$ for USD); "—" when the data does not say. */
export function fmtMin(n: number | null | undefined, currency: string = "EUR"): string {
  if (n === null || n === undefined) return "—";
  const sym = currency === "USD" ? "US$" : currency === "EUR" ? "€" : `${currency} `;
  const short = (v: number, unit: string) => `${sym}${Number.isInteger(v) ? v : Number(v.toFixed(1))}${unit}`;
  if (n >= 1_000_000) return short(n / 1_000_000, "m");
  if (n >= 1_000) return short(n / 1_000, "k");
  return `${sym}${n}`;
}
