"use client";
import { useEffect, useMemo, useState } from "react";

type Row = {
  id: number; email: string; username: string | null; plan: string; premiumUntil: string | null; promoCode: string | null;
  createdAt: string; emailConfirmed: boolean; lastLoginAt: string | null; lastSeenAt: string | null;
  secondsOnSite: number | null; searches: number | null; isAdmin: boolean;
};
type Key = "email" | "username" | "plan" | "promoCode" | "createdAt" | "emailConfirmed" | "lastSeenAt" | "secondsOnSite" | "searches";

const card = "rounded-[24px] bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)]";
const day = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
const when = (s: string | null) => (s ? new Date(s).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
const plan = (r: Row) => (r.premiumUntil && r.plan !== "premium" && r.plan !== "pro" ? `premium (code, until ${day(r.premiumUntil)})` : r.plan);

export function duration(secs: number | null): string {
  if (secs === null) return "no stats";
  if (secs < 60) return `${secs} s`;
  const m = Math.round(secs / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

const COLS: { key: Key; label: string }[] = [
  { key: "email", label: "E-mail" },
  { key: "username", label: "Username" },
  { key: "plan", label: "Plan" },
  { key: "promoCode", label: "Promo code" },
  { key: "createdAt", label: "Registered" },
  { key: "emailConfirmed", label: "Confirmed" },
  { key: "lastSeenAt", label: "Last seen" },
  { key: "secondsOnSite", label: "Time on site" },
  { key: "searches", label: "Searches" },
];

function csv(rows: Row[]): string {
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ["email", "username", "plan", "premium_until", "promo_code", "registered", "email_confirmed", "last_login", "last_seen", "seconds_on_site", "searches"];
  const lines = rows.map((r) => [r.email, r.username, r.plan, r.premiumUntil, r.promoCode, r.createdAt, r.emailConfirmed ? "yes" : "no", r.lastLoginAt, r.lastSeenAt, r.secondsOnSite, r.searches].map(cell).join(","));
  return [head.join(","), ...lines].join("\n");
}

export default function AdminUsers() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);
  const [sort, setSort] = useState<{ key: Key; desc: boolean }>({ key: "createdAt", desc: true });
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/admin/users", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((b) => setRows(b.users))
      .catch(() => setError(true));
  }, []);

  const shown = useMemo(() => {
    if (!rows) return [];
    const term = q.trim().toLowerCase();
    const list = term ? rows.filter((r) => `${r.email} ${r.username ?? ""} ${r.promoCode ?? ""}`.toLowerCase().includes(term)) : rows;
    const val = (r: Row) => (sort.key === "plan" ? plan(r) : r[sort.key]);
    return [...list].sort((a, b) => {
      const x = val(a), y = val(b);
      if (x === y) return 0;
      if (x === null) return 1; // empty values always last
      if (y === null) return -1;
      const c = typeof x === "string" ? x.localeCompare(String(y)) : Number(x) - Number(y);
      return sort.desc ? -c : c;
    });
  }, [rows, sort, q]);

  const download = () => {
    const blob = new Blob([csv(shown)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `10bonds-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className={card} data-testid="admin-users">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Users{rows ? ` (${rows.length})` : ""}</h2>
        <div className="flex gap-2">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search e-mail, username, code" aria-label="Search users" className="w-56 rounded-full border border-line px-4 py-2 text-sm" />
          <button onClick={download} disabled={!rows?.length} className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-[#0077ed] disabled:opacity-60" data-testid="users-csv">Download CSV</button>
        </div>
      </div>
      <p className="mt-1 text-xs text-mute">Click a column to sort. Time on site and searches come only from people who allowed Statistics cookies (“no stats” = they did not, or have not used the site signed in yet). Your own account is marked “you”.</p>
      {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">Could not load the users.</p>}
      <div className="mt-4 max-h-[36rem] overflow-auto">
        <table className="w-full min-w-[60rem] text-left text-sm">
          <thead className="sticky top-0 bg-white text-xs text-mute">
            <tr>
              {COLS.map((c) => (
                <th key={c.key} className="py-2 pr-3 font-medium" aria-sort={sort.key === c.key ? (sort.desc ? "descending" : "ascending") : undefined}>
                  <button onClick={() => setSort((s) => ({ key: c.key, desc: s.key === c.key ? !s.desc : c.key !== "email" && c.key !== "username" }))} className="hover:text-ink">
                    {c.label}{sort.key === c.key ? (sort.desc ? " ↓" : " ↑") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows && shown.length === 0 && <tr><td colSpan={COLS.length} className="py-3 text-mute">No users.</td></tr>}
            {shown.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="py-2 pr-3">{r.email}{r.isAdmin && <span className="ml-1 text-xs text-mute">(you)</span>}</td>
                <td className="pr-3">{r.username ?? "—"}</td>
                <td className="pr-3">{plan(r)}</td>
                <td className="pr-3 font-mono text-xs">{r.promoCode ?? "—"}</td>
                <td className="pr-3 text-mute">{day(r.createdAt)}</td>
                <td className="pr-3">{r.emailConfirmed ? "Yes" : <span className="text-mute">No</span>}</td>
                <td className="pr-3 text-mute">{when(r.lastSeenAt)}</td>
                <td className={`pr-3 ${r.secondsOnSite === null ? "text-mute" : ""}`}>{duration(r.secondsOnSite)}</td>
                <td className={r.searches === null ? "text-mute" : ""}>{r.searches ?? "no stats"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
