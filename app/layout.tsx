import type { Metadata, Viewport } from "next";
import Link from "next/link";
import FooterNote, { FooterLegal } from "@/components/FooterNote";
import "./globals.css";
import AccountNav from "@/components/AccountNav";
import AccountNotices from "@/components/AccountNotices";
import KnowledgeNavLink from "@/components/KnowledgeNavLink";
import LangSwitch from "@/components/LangSwitch";
import ProNavLink from "@/components/ProNavLink";
import UsageStats from "@/components/UsageStats";

const SITE_URL = process.env.SITE_URL ?? "https://10bonds.fly.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <header className="sticky top-0 z-20 border-b border-line/70 bg-canvas/80 backdrop-blur-xl">
          <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="shrink-0 text-lg font-semibold tracking-tight">10BONDS</Link>
            <div className="ml-3 flex items-center gap-2 text-sm text-mute sm:gap-5">
              <LangSwitch />
              <KnowledgeNavLink />
              <ProNavLink />
              <Link href="/pricing" className="hover:text-ink">Pricing</Link>
              <AccountNav />
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-8 pt-5 sm:px-6 sm:pt-7">
          <AccountNotices />
          {children}
        </main>
        <footer className="border-t border-line/70 py-4 text-center text-[11px] leading-snug text-mute">
          <FooterNote />
          <FooterLegal />
        </footer>
        <UsageStats />
      </body>
    </html>
  );
}
