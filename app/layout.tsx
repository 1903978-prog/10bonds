import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { SESSION_COOKIE } from "@/lib/session";
import Link from "next/link";
import Logo from "@/components/Logo";
import FooterNote, { FooterLegal } from "@/components/FooterNote";
import "./globals.css";
import AccountNav from "@/components/AccountNav";
import AccountNotices from "@/components/AccountNotices";
import KnowledgeNavLink from "@/components/KnowledgeNavLink";
import PlansNavLink from "@/components/PlansNavLink";
import DropsNavLink from "@/components/DropsNavLink";
import { currentUser } from "@/lib/currentUser";
import LangSwitch from "@/components/LangSwitch";
import NavLink from "@/components/NavLink";
import UsageStats from "@/components/UsageStats";
import CopyGuard from "@/components/CopyGuard";
import GptCalcPopup from "@/components/GptCalcPopup";

const SITE_URL = process.env.SITE_URL ?? "https://10bonds.fly.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Bing Webmaster Tools site verification (the owner, 19 Oct 2026). Public by design, not a secret.
  verification: { other: { "msvalidate.01": "ADA17531835A822BB9A6870BCE68531B" } },
  title: "10BONDS · Find 10 bonds that match your goals",
  description: "Pick a duration and a desired return. 10BONDS turns thousands of euro bonds into a clear shortlist of 10.",
  openGraph: {
    title: "10BONDS · 10 bonds, 2 sliders",
    description: "Pick a duration and a desired return. Get a clear shortlist of 10 euro bonds.",
    type: "website",
    siteName: "10BONDS",
  },
  twitter: { card: "summary_large_image", title: "10BONDS · 10 bonds, 2 sliders" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f5f5f7" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Builds every page per request, so each one gets the fresh script nonce from middleware.ts.
  const path = (await headers()).get("x-pathname") ?? "/";
  // The page language for search engines and screen readers: the Italian, French and German sites are not English.
  const lang = /^\/(it|fr|de)(\/|$)/.exec(path)?.[1] ?? "en";
  // Whether a sign-in cookie is present, so the header draws the right links straight away instead of popping them in.
  const hasSession = Boolean((await cookies()).get(SESSION_COOKIE)?.value);
  // Price drops is the admin's only for now (52-week values stay private): drawn on the server, so nothing pops in.
  const admin = hasSession && (await currentUser())?.isAdmin === true;
  return (
    <html lang={lang}>
      <body className="font-sans">
        <header className="sticky top-0 z-20 border-b border-line/70 bg-canvas/80 backdrop-blur-xl">
          <nav className="header-wide mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" aria-label="10BONDS home" className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight"><Logo className="h-7 w-auto" /></Link>
            <div className="ml-2 flex items-center gap-1.5 text-[13px] text-mute sm:ml-3 sm:gap-5 sm:text-sm">
              {admin && <DropsNavLink />}
              {admin && <Link href="/admin/shortlist" data-testid="nav-shortlist" className="rounded-full bg-yellow-200 px-2 py-0.5">Shortlist</Link>}
              {admin && <Link href="/admin/features" data-testid="nav-features" className="hidden rounded-full bg-yellow-200 px-2 py-0.5 sm:inline-block">Plan features</Link>}
              {admin && <Link href="/risk-assessment" data-testid="nav-focus" className="hidden rounded-full bg-yellow-200 px-2 py-0.5 sm:inline-block">Risk assessment</Link>}
              <Link href="/isin-search" aria-label="Search by ISIN" title="ISIN" data-testid="nav-isin" className="flex h-5 w-5 items-center justify-center hover:text-ink">
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="M13 13l4 4" /></svg>
              </Link>
              <KnowledgeNavLink />
              <PlansNavLink />
              {/* Fixed-width slot for the links that load after the page (Retail/Pro switch, Admin, Sign in, profile), so the menu never shifts. */}
              <div className="flex min-w-[128px] items-center justify-end gap-1.5 sm:min-w-[232px] sm:gap-5">
                {/* Language sits right before the account links (profile icon), as the owner asked. */}
                <LangSwitch />
                <AccountNav hasSession={hasSession} />
              </div>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-6 pt-3 sm:px-6 sm:pt-5">
          <AccountNotices />
          {children}
        </main>
        <footer className="border-t border-line/70 py-4 text-center text-[11px] leading-snug text-mute">
          <FooterNote />
          <FooterLegal />
        </footer>
        <UsageStats />
        <CopyGuard />
        {admin && <GptCalcPopup />}
      </body>
    </html>
  );
}
