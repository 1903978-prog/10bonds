import type { Metadata } from "next";
import Link from "next/link";
import { UsageStatsSetting } from "@/components/UsageStats";
import { COMPANY } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Cookie policy · 10BONDS",
  description: "Which cookies 10BONDS uses, what each one is for, and how to change your cookie settings at any time.",
  alternates: { canonical: "/cookies" },
  openGraph: { title: "Cookie policy · 10BONDS", description: "Which cookies 10BONDS uses, what each one is for, and how to change your cookie settings at any time.", url: "/cookies" },
};

const td = "border-t border-line px-3 py-2 align-top";
const ROWS: [string, string, string, string, string][] = [
  ["tb_session", "Cookie", "Necessary", "Keeps you signed in", "30 days or until you sign out"],
  ["tb_cookie_consent", "Local storage", "Necessary", "Remembers your cookie choice", "Until you clear it"],
  ["tb_lang", "Cookie", "Preferences", "Remembers the language you chose", "1 year"],
  ["tb_vid", "Local storage", "Statistics", "A random visitor id for usage statistics, only if you allow them", "Until you clear it or withdraw consent"],
];

export default function Cookies() {
  return (
    <article className="mx-auto max-w-6xl rounded-[28px] bg-white p-7 text-[15px] leading-relaxed shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-10" data-testid="cookies-page">
      <h1 className="text-3xl font-semibold tracking-tight">Cookie policy</h1>
      <p className="mt-2 text-mute">Which cookies and similar storage 10BONDS uses, and how to change your choice.</p>
      <h2 className="mt-8 text-lg font-semibold">Categories</h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5">
        <li><strong>Necessary:</strong> needed for the site to work, such as signing in. Always on; no consent is needed (ePrivacy Directive art. 5(3)).</li>
        <li><strong>Preferences:</strong> remember choices such as your language.</li>
        <li><strong>Statistics:</strong> help us understand how the site is used. Only with your consent. Kept 13 months, without your IP address.</li>
        <li><strong>Marketing:</strong> none are used today.</li>
      </ul>
      <h2 className="mt-8 text-lg font-semibold">What we use</h2>
      <div className="mt-3 overflow-x-auto" tabIndex={0} role="region" aria-label="Table (scrolls sideways on small screens)">
        <table className="w-full min-w-[560px] text-left text-sm" data-testid="cookie-table">
          <thead><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Purpose</th><th className="px-3 py-2">Kept</th></tr></thead>
          <tbody>
            {ROWS.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i} className={`${td} ${i === 0 ? "font-mono text-xs" : ""}`}>{c}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
      <p className="mt-3">Stripe sets its own cookies on its payment page, to prevent fraud; see Stripe&apos;s cookie policy. We use no third-party advertising or analytics cookies.</p>
      <h2 className="mt-8 text-lg font-semibold">Change your choice</h2>
      <p className="mt-2">You can change or withdraw consent at any time: <UsageStatsSetting />. You can also delete cookies in your browser.</p>
      <p className="mt-6 text-sm text-mute">Questions: {COMPANY.privacyEmail}. More in the <Link href="/privacy" className="text-accent">privacy policy</Link>.</p>
    </article>
  );
}
