import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY, LEGAL_DRAFT_DATE } from "@/lib/legal";
import { euro, priceCents } from "@/lib/plans";

export const metadata: Metadata = { title: "Privacy and GDPR · 10BONDS", alternates: { canonical: "/privacy" } };

// Livio's privacy policy text (19 October 2026), with his four checks filled in from how 10BONDS actually works:
// passwords (scrypt hash only), technical data (IP in memory only, hosting logs), payments (Stripe) and analytics
// (own statistics, consent only, no Google Analytics or advertising pixels).

const H = ({ children }: { children: React.ReactNode }) => <h2 className="mt-8 text-lg font-semibold">{children}</h2>;
const td = "border-t border-line px-3 py-2 align-top";

export default function Privacy() {
  return (
    <article className="mx-auto max-w-6xl rounded-[28px] bg-white p-7 text-[15px] leading-relaxed shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-10" data-testid="privacy-page">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-mute">Last updated: {LEGAL_DRAFT_DATE}</p>

      <H>1. Introduction</H>
      <p className="mt-2">
        {COMPANY.legalName} (&ldquo;Company&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo; or &ldquo;our&rdquo;) respects your privacy and protects your personal data in accordance with Regulation (EU) 2016/679, the General Data Protection Regulation (GDPR).
      </p>
      <p className="mt-2">
        10BONDS, our bond information and comparison platform, is designed according to the principle of data minimisation. We collect only the personal information needed to provide and secure user accounts, run paid plans where you choose one, and, only if you allow it, measure how the site is used.
      </p>
      <p className="mt-2">We do not require users to disclose their investment portfolios, financial circumstances or investment strategies.</p>

      <H>2. Data controller</H>
      <p className="mt-2">
        {COMPANY.legalName}
        <br />Registration number: 14035002 · VAT number: EE102234240
        <br />Registered address: {COMPANY.address}
        <br />Privacy contact: <a href={`mailto:${COMPANY.privacyEmail}`} className="text-accent">{COMPANY.privacyEmail}</a>
      </p>

      <H>3. Personal data we collect</H>
      <p className="mt-2">To create and maintain an account we ask only for:</p>
      <ul className="mt-2 list-disc space-y-1.5 pl-5">
        <li><strong>Username:</strong> to identify your account within the platform.</li>
        <li><strong>E-mail address:</strong> for registration, sign-in, essential service messages and password recovery.</li>
        <li><strong>Password:</strong> for sign-in. We store only a salted scrypt hash of it, an industry-standard one-way cryptographic method. The password itself is never stored, logged or readable by us.</li>
      </ul>
      <p className="mt-3">We also hold, as part of your account: your plan, sign-up and last sign-in dates, the version and date of the Terms you accepted, whether you confirmed your e-mail, which trial code you used and when, whether you asked for the newsletter (with the date and place of that choice, and of any unsubscribe), and the time of each counted search so the weekly allowance of the free plan works.</p>
      <p className="mt-3"><strong>Technical data.</strong> Your IP address is held briefly in the server&apos;s memory to limit repeated sign-in and sign-up attempts; it is not written to our database. Sign-in uses a session cookie (see section 9). Our hosting provider, Fly.io, receives your IP address with every request in order to deliver the website and may keep it in short-lived technical and security logs. We do not keep access logs of our own.</p>
      <p className="mt-3"><strong>Paid plans.</strong> If you buy Plus, Premium or Pro, payment is handled by Stripe. You enter your card and billing details (name, billing address, country, VAT number if you give one) on Stripe&apos;s own page; Stripe processes them and we never see your card details. We keep only the Stripe customer and subscription reference, the plan, its status, billing period and renewal date. Stripe keeps payment and invoice records as tax law requires.</p>
      <p className="mt-3"><strong>Professional access (Pro).</strong> If you apply for Pro, we hold the firm, role, country, regulator, licence number, website and the declaration you made, to check that you are a regulated professional.</p>
      <p className="mt-3"><strong>Usage statistics, only with your consent.</strong> If you accept statistics in the cookie banner, we record pages visited, searches made and buttons clicked, linked to a random visitor id (and to your account while you are signed in), in our own database. No IP address is stored with them. We do not use Google Analytics, advertising pixels or any third-party tracking. If you decline, nothing is recorded.</p>

      <H>4. Financial information we do not request</H>
      <p className="mt-2">Our retail bond-comparison service does not ask you for:</p>
      <ul className="mt-2 list-disc space-y-1.5 pl-5">
        <li>details of your existing investment portfolio;</li>
        <li>securities holdings or investment account balances;</li>
        <li>personal investment strategies or objectives;</li>
        <li>income, savings, assets or net worth;</li>
        <li>investment experience or suitability questionnaires;</li>
        <li>risk-tolerance assessments based on your personal financial circumstances;</li>
        <li>brokerage-account credentials.</li>
      </ul>
      <p className="mt-3">The platform provides general bond-market information and objective comparison tools without requiring you to disclose your personal financial situation. We do not build personal investor profiles from information about your holdings. The Pro portfolio tool works on a list of bonds you upload for the analysis; it is used to compute the result and is not kept as a profile of you.</p>

      <H>5. Purpose and legal basis for processing</H>
      <div className="mt-3 overflow-x-auto" tabIndex={0} role="region" aria-label="Table (scrolls sideways on small screens)">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead><tr><th className="px-3 py-2">Purpose</th><th className="px-3 py-2">Legal basis (GDPR art. 6)</th></tr></thead>
          <tbody>
            <tr><td className={td}>Creating and running your account, the search and the weekly allowance</td><td className={td}>Performance of a contract (6(1)(b))</td></tr>
            <tr><td className={td}>Paid plans: taking payments, renewals and invoices</td><td className={td}>Contract and legal obligation (6(1)(b) and (c))</td></tr>
            <tr><td className={td}>Checking that Pro users are regulated professionals</td><td className={td}>Contract and legitimate interest in offering the tool only to professionals (6(1)(b) and (f))</td></tr>
            <tr><td className={td}>Account security and fraud prevention</td><td className={td}>Legitimate interest in operating a secure service (6(1)(f))</td></tr>
            <tr><td className={td}>Essential messages: e-mail confirmation, password reset, payment issues</td><td className={td}>Contract (6(1)(b)) or legitimate interest (6(1)(f)), depending on the message</td></tr>
            <tr><td className={td}>Weekly newsletter, only if you tick the box at sign-up or switch it on in your profile</td><td className={td}>Consent (6(1)(a)), withdrawn at any time with the link in each e-mail or the switch in your profile</td></tr>
            <tr><td className={td}>Usage statistics to improve the site</td><td className={td}>Your consent (6(1)(a)), which you can withdraw at any time under &ldquo;Cookie settings&rdquo;</td></tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3">We do not use personal financial profiles to give personalised investment recommendations, and we send no marketing e-mails except the newsletter you choose to receive.</p>

      <H>6. Data retention</H>
      <ul className="mt-2 list-disc space-y-1.5 pl-5">
        <li>Account data and a Pro access request: while your account is active. When you delete your account they are deleted, unless the law requires us to keep something.</li>
        <li>Search allowance records: 30 days, then deleted automatically.</li>
        <li>Usage statistics: 13 months, then deleted automatically.</li>
        <li>IP addresses for sign-in protection: only in the server&apos;s memory, for minutes; hosting logs are kept by Fly.io for a short period for operation and security.</li>
        <li>Payment and invoice records: kept by Stripe for as long as tax law requires, even after you delete your account.</li>
      </ul>

      <H>7. Data sharing and processors</H>
      <p className="mt-2">We do not sell your personal information. These service providers process data for us, on our instructions and under a data processing agreement:</p>
      <div className="mt-3 overflow-x-auto" tabIndex={0} role="region" aria-label="Table (scrolls sideways on small screens)">
        <table className="w-full min-w-[520px] text-left text-sm" data-testid="processors">
          <thead><tr><th className="px-3 py-2">Provider</th><th className="px-3 py-2">What for</th><th className="px-3 py-2">Where</th></tr></thead>
          <tbody>
            <tr><td className={td}>Fly.io, Inc.</td><td className={td}>Hosting the website</td><td className={td}>Servers in Paris, France (EU); US company</td></tr>
            <tr><td className={td}>Neon, Inc. (Databricks)</td><td className={td}>Database holding accounts and usage data</td><td className={td}>Cloud database; US company</td></tr>
            <tr><td className={td}>Stripe Payments Europe, Ltd.</td><td className={td}>Payments, subscriptions, invoices</td><td className={td}>Ireland (EU), with transfers to Stripe, Inc. (US)</td></tr>
            <tr><td className={td}>Resend (Plus Five Five, Inc.)</td><td className={td}>Sending account e-mails (confirmation, password reset)</td><td className={td}>US</td></tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3">We may also disclose personal information where the law requires it. Where data leaves the European Economic Area, the transfer relies on the EU-US Data Privacy Framework where the provider is certified, or on the European Commission&apos;s Standard Contractual Clauses.</p>

      <H>8. Data security</H>
      <p className="mt-2">We apply technical and organisational measures to protect personal information against unauthorised access, disclosure, alteration and loss, including:</p>
      <ul className="mt-2 list-disc space-y-1.5 pl-5">
        <li>passwords stored only as salted scrypt hashes;</li>
        <li>encrypted connections (HTTPS) for every page;</li>
        <li>database access limited to the roles that need it;</li>
        <li>rate limits on sign-in and sign-up attempts, and a robot check at sign-up;</li>
        <li>two-factor sign-in (authenticator app) for the administrator account;</li>
        <li>signed, HTTP-only session cookies.</li>
      </ul>
      <p className="mt-3">No online service can guarantee absolute security. If a breach puts your data at risk, we tell the supervisory authority within 72 hours and you without undue delay.</p>

      <H>9. Cookies and technical information</H>
      <p className="mt-2">We use strictly necessary cookies for sign-in sessions, security and remembering your cookie choice. Usage statistics run only if you accept them in the cookie banner, and you can change your choice at any time under &ldquo;Cookie settings&rdquo; at the bottom of every page. There are no advertising or third-party tracking cookies. Details: <Link href="/cookies" className="text-accent">cookie policy</Link>.</p>

      <H>10. Your GDPR rights</H>
      <p className="mt-2">Subject to the legal conditions, you have the right to:</p>
      <ul className="mt-2 list-disc space-y-1.5 pl-5">
        <li>access your personal information and receive a copy (art. 15);</li>
        <li>correct inaccurate information (art. 16);</li>
        <li>have your information deleted (art. 17);</li>
        <li>restrict processing (art. 18);</li>
        <li>receive your data in a machine-readable format (art. 20);</li>
        <li>object to processing based on legitimate interests (art. 21);</li>
        <li>withdraw consent at any time, without affecting what was done before (art. 7(3));</li>
        <li>lodge a complaint with a data protection supervisory authority.</li>
      </ul>
      <p className="mt-3">
        On your <Link href="/account" className="text-accent">profile page</Link> you can download all your data, delete your activity data and delete your account with everything in it, at once. For anything else write to <a href={`mailto:${COMPANY.privacyEmail}`} className="text-accent">{COMPANY.privacyEmail}</a>. We answer within one month.
      </p>
      <p className="mt-3">As the Company is established in Estonia, you can contact the {COMPANY.authority}, or the authority of the country where you live.</p>

      <H>11. Automated decision-making</H>
      <p className="mt-2">The platform ranks and compares bonds automatically from product characteristics such as yield, duration and risk score. These calculations use no personal financial profile and are not decisions about you that produce legal or similarly significant effects within the meaning of Article 22 GDPR.</p>

      <H>12. Payments, children and changes to this policy</H>
      <p className="mt-2">
        Paid plans (Plus {euro(priceCents("plus", "month"))}, Premium {euro(priceCents("premium", "month"))}, Pro {euro(priceCents("pro", "month"))} a month, or 20% less yearly) are handled by Stripe. When you delete your account, any subscription is cancelled at once and nothing more is charged.
      </p>
      <p className="mt-2">10BONDS is for adults. We do not knowingly hold data about anyone under 18.</p>
      <p className="mt-2">We may update this policy to reflect changes in our services, technical setup or legal obligations. The latest version is published here with its date, and account holders are told by e-mail of material changes.</p>

      <H>13. Contact</H>
      <p className="mt-2">
        For questions about this policy or the processing of your personal information:
        <br />{COMPANY.legalName}, registration number 14035002
        <br />Männimäe/1, Pudisoo küla, Kuusalu vald, 74626 Harju maakond, Estonia
        <br />E-mail: <a href={`mailto:${COMPANY.privacyEmail}`} className="text-accent">{COMPANY.privacyEmail}</a>
      </p>
    </article>
  );
}
