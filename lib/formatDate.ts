// The ONE place that turns a date into text for people.
// Rule (Livio, 4 Nov 2026): always "03 Nov 2026"; with time "03 Nov 2026, 14:05".
// Display only: stored data and API values stay ISO. Do not use toLocaleDateString/toLocaleString for dates.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad2 = (n: number) => String(n).padStart(2, "0");

type DateInput = Date | string | number | null | undefined;
interface Parts { y: number; m: number; d: number; h: number; mi: number }

function parts(value: DateInput, timeZone?: string): Parts | null {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  // A date-only string such as "2026-11-03" means that calendar day everywhere (no timezone shift).
  if (!timeZone && typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) timeZone = "UTC";
  if (!timeZone) return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate(), h: d.getHours(), mi: d.getMinutes() };
  const p: Record<string, string> = {};
  for (const x of new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d)) p[x.type] = x.value;
  return { y: +p.year, m: +p.month - 1, d: +p.day, h: +p.hour, mi: +p.minute };
}

/** "03 Nov 2026" (empty string for missing/invalid input). */
export function formatDate(value: DateInput, timeZone?: string): string {
  const p = parts(value, timeZone);
  return p ? `${pad2(p.d)} ${MONTHS[p.m]} ${p.y}` : "";
}

/** "03 Nov 2026, 14:05" (24-hour clock). */
export function formatDateTime(value: DateInput, timeZone?: string): string {
  const p = parts(value, timeZone);
  return p ? `${pad2(p.d)} ${MONTHS[p.m]} ${p.y}, ${pad2(p.h)}:${pad2(p.mi)}` : "";
}
