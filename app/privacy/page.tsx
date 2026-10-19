import type { Metadata } from "next";
import Link from "next/link";
import LegalDraft from "@/components/LegalDraft";
import { COMPANY } from "@/lib/legal";
import { euro, priceCents } from "@/lib/plans";

export const metadata: Metadata = { title: "Privacy and GDPR · 10BONDS", alternates: { canonical: "/privacy" } };

const H = ({ children }: { children: React.ReactNode }) => <h2 className="mt-8 text-lg font-semibold">{children}</h2>;
const td = "border-t border-line px-3 py-2 align-top";

export default function Privacy() {
  return (
    <article className="mx-auto max-w-3xl rounded-[28px] bg-white p-7 text-[15px] leading-relaxed shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-10" data-testid="privacy-page">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy policy</h1>
      <p className="mt-2 text-mute">How 10BONDS uses your personal data, and your rights under the EU General Data Protection Regulation (GDPR, Regulation (EU) 2016/679).</p>
      <LegalDraft />

      <H>1. Who is responsible (data controller)</H>
      <p className="mt-2">
        {COMPANY.legalName}, {COMPANY.address}, {COMPANY.registration}. Privacy contact: {COMPANY.privacyEmail}.
        {COMPANY.dpo && <><br />{COMPANY.dpo}</>}
      </p>

      <H>2. What data we hold</H>
      <ul className="mt-2 list-disc space-y-1.5 pl-5">
        <li><strong>Account:</strong> e-mail address, username, a secure hash of your password (never the password itself), your plan, sign-up and last sign-in dates, the version and date of the Terms you accepted, whether you confirmed your e-mail.</li>
        <li><strong>Payments:</strong> for paying customers, the Stripe customer and subscription reference, status, billing period and renewal date. Card details are entered on Stripe&apos;s page and held only by Stripe; we never see them.</li>
        <li><strong>Search allowance:</strong> the time of each counted search, so the weekly limit of the free plan works.</li>
        <li><strong>Usage statistics (only if you allow them):</strong> pages visited, searches made and buttons clicked, linked to a random visitor id. No IP address is stored with them.</li>
        <li><strong>Codes:</strong> which trial code you used and when.</li>
        <li><strong>Professional access (Pro):</strong> firm, role, country, regulator, licence number, website and the declaration you made.</li>
        <li><strong>Security:</strong> your IP address is held briefly in the server&apos;s memory to limit repeated sign-in and sign-up attempts. It is not written to our database.</li>
      </ul>

      <H>3. Why we use it, and on what legal basis</H>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead><tr><th className="px-3 py-2">Purpose</th><th className="px-3 py-2">Legal basis (GDPR art. 6)</th></tr></thead>
          <tbody>
            <tr><td className={td}>Running your account, the search, the weekly allowance and paid plans</td><td className={td}>Contract (6(1)(b))</td></tr>
            <tr><td className={td}>Taking payments and keeping invoices</td><td className={td}>Contract and legal obligation (6(1)(b) and (c))</td></tr>
            <tr><td className={td}>Checking that Pro users are regulated professionals</td><td className={td}>Contract and legitimate interest in offering the tool only to professionals (6(1)(b) and (f))</td></tr>
            <tr><td className={td}>Security, preventing abuse and fraud</td><td className={td}>Legitimate interest (6(1)(f))</td></tr>
            <tr><td className={td}>Usage statistics to improve the site</td><td className={td}>Your consent (6(1)(a)), which you can withdraw at any time under “Cookie settings”</td></tr>
            <tr><td className={td}>E-mails about your account (confirmation, payment issues)</td><td className={td}>Contract (6(1)(b))</td></tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3">We do not sell your data, do not use advertising trackers and do not make decisions about you by automated means that have legal or similar effects.</p>

      <H>4. Who processes data for us</H>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm" data-testid="processors">
          <thead><tr><th className="px-3 py-2">Provider</th><th className="px-3 py-2">What for</th><th className="px-3 py-2">Where</th></tr></thead>
          <tbody>
            <tr><td className={td}>Fly.io, Inc.</td><td className={td}>Hosting the website</td><td className={td}>Servers in Paris, France (EU); US company</td></tr>
            <tr><td className={td}>Neon, Inc. (Databricks)</td><td className={td}>Database holding accounts and usage data</td><td className={td}>[Neon region to be confirmed]; US company</td></tr>
            <tr><td className={td}>Stripe Payments Europe, Ltd.</td><td className={td}>Payments, subscriptions, invoices</td><td className={td}>Ireland (EU), with transfers to Stripe, Inc. (US)</td></tr>
            <tr><td className={td}>Resend (Plus Five Five, Inc.)</td><td className={td}>Sending account e-mails, once switched on</td><td className={td}>US</td></tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3">Each provider acts on our instructions under a data processing agreement. Where data leaves the European Economic Area, the transfer relies on the EU-US Data Privacy Framework where the provider is certified, or on the European Commission&apos;s Standard Contractual Clauses.</p>

      <H>5. How long we keep it</H>
      <ul className="mt-2 list-disc space-y-1.5 pl-5">
        <li>Account data: until you delete your account.</li>
        <li>Search allowance records: 30 days.</li>
        <li>Usage statistics: 13 months, then deleted automatically.</li>
        <li>Professional access request: until you delete your account.</li>
        <li>Invoices and payment records: kept by Stripe for as long as tax law requires (10 years in Italy), even after you delete your account.</li>
      </ul>

      <H>6. Your rights</H>
      <p className="mt-2">You have the right to:</p>
      <ul className="mt-2 list-disc space-y-1.5 pl-5">
        <li><strong>access</strong> your data and receive a copy (art. 15);</li>
        <li><strong>correct</strong> wrong data (art. 16);</li>
        <li><strong>erasure</strong>, the “right to be forgotten” (art. 17);</li>
        <li><strong>restrict</strong> processing (art. 18);</li>
        <li><strong>portability</strong>, receiving your data in a machine-readable format (art. 20);</li>
        <li><strong>object</strong> to processing based on legitimate interest (art. 21);</li>
        <li><strong>withdraw consent</strong> at any time, without affecting what was done before (art. 7(3)).</li>
      </ul>
      <p className="mt-3">
        <strong>How to use them:</strong> on your <Link href="/account" className="text-accent">profile page</Link> you can download all your data, delete your activity data and delete your account with everything in it, at once. For anything else write to {COMPANY.privacyEmail}. We answer within one month.
      </p>
      <p className="mt-3">You can also complain to a data protection authority, in particular the {COMPANY.authority}, or the authority of the country where you live.</p>

      <H>7. Payments and plans</H>
      <p className="mt-2">
        Paid plans (Plus {euro(priceCents("plus", "month"))}, Premium {euro(priceCents("premium", "month"))}, Pro {euro(priceCents("pro", "month"))} a month, or 20% less yearly) are handled by Stripe. When you delete your account, any subscription is cancelled at once and nothing more is charged.
      </p>

      <H>8. Children</H>
      <p className="mt-2">10BONDS is for adults. We do not knowingly hold data about anyone under 18.</p>

      <H>9. Security</H>
      <p className="mt-2">Connections are encrypted (HTTPS), passwords are stored only as secure hashes, database access is limited to the roles that need it, and sign-in attempts are rate-limited. If a breach puts your data at risk, we tell the authority within 72 hours and you without undue delay.</p>

      <H>10. Cookies</H>
      <p className="mt-2">See the <Link href="/cookies" className="text-accent">cookie policy</Link>.</p>

      <H>11. Changes</H>
      <p className="mt-2">We will publish any change here with its date, and tell account holders by e-mail if the change is material.</p>
    </article>
  );
}
