import type { CountryContent } from "@/lib/brokers/content";

export function formatters(c: CountryContent) {
  const eurFmt = new Intl.NumberFormat(c.locale, { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const eur0 = new Intl.NumberFormat(c.locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const pctFmt = new Intl.NumberFormat(c.locale, { maximumFractionDigits: 3 });
  const dateFmt = new Intl.DateTimeFormat(c.locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return {
    eur: (n: number) => eurFmt.format(n),
    eurRound: (n: number) => eur0.format(n),
    /** Whole amounts without cents (5.000.000 €), others with cents (2,95 €). */
    eurSmart: (n: number) => (Number.isInteger(n) && n >= 100 ? eur0.format(n) : eurFmt.format(n)),
    pct: (n: number) => `${pctFmt.format(n)}%`,
    date: (iso: string) => dateFmt.format(new Date(`${iso}T00:00:00Z`)),
  };
}
