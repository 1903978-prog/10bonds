import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import Logo from "@/components/Logo";
import FooterNote, { FooterLegal } from "@/components/FooterNote";
import "./globals.css";
import AccountNav from "@/components/AccountNav";
import AccountNotices from "@/components/AccountNotices";
import KnowledgeNavLink from "@/components/KnowledgeNavLink";
import LangSwitch from "@/components/LangSwitch";
import ProNavLink from "@/components/ProNavLink";
import SearchNavLink from "@/components/SearchNavLink";
import NavLink from "@/components/NavLink";
import UsageStats from "@/components/UsageStats";
import CopyGuard from "@/components/CopyGuard";

const SITE_URL = process.env.SITE_URL ?? "https://10bonds.fly.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Bing Webmaster Tools site verification (Livio, 19 Oct 2026). Public by design, not a secret.
  verification: { other: { "msvalidate.01": "ADA17531835A822BB9A6870BCE68531B" } },
  title: "10BONDS · Find the 10 best bonds for your goals",
  description: "Pick a duration and a target yield. 10BONDS turns thousands of euro bonds into a clear shortlist of 10.",
  openGraph: {
    title: "10BONDS · 10 bonds, 2 sliders",
    description: "Pick a duration and a target yield. Get a clear shortlist of 10 euro bonds.",
    type: "website",
    siteName: "10BONDS",
  },
  twitter: { card: "summary_large_image", title: "10BONDS · 10 bonds, 2 sliders" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f5f5f7" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Builds every page per request, so each one gets the fresh script nonce from middleware.ts.
  await headers();
  return (
    <html lang="en">
      <body className="font-sans">
        <header className="sticky top-0 z-20 border-b border-line/70 bg-canvas/80 backdrop-blur-xl">
          <nav className="header-wide mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" aria-label="10BONDS home" className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight"><Logo className="h-7 w-auto" /></Link>
            <div className="ml-2 flex items-center gap-1.5 text-[13px] text-mute sm:ml-3 sm:gap-5 sm:text-sm">
              <SearchNavLink />
              <LangSwitch />
              <KnowledgeNavLink />
              <NavLink href="/pricing">Pricing</NavLink>
              {/* Fixed-width slot for the links that load after the page (Pro, Admin, Sign in, profile), so the menu never shifts. */}
              <div className="flex min-w-[128px] items-center justify-end gap-1.5 sm:min-w-[180px] sm:gap-5">
                <ProNavLink />
                <AccountNav />
              </div>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-6 pt-4 sm:px-6 sm:pt-5">
          <AccountNotices />
          {children}
        </main>
        <footer className="border-t border-line/70 py-4 text-center text-[11px] leading-snug text-mute">
          <FooterNote />
          <FooterLegal />
        </footer>
        <UsageStats />
        <CopyGuard />
      </body>
    </html>
  );
}
