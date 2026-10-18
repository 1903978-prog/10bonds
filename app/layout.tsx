import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import AccountNav from "@/components/AccountNav";
import AccountNotices from "@/components/AccountNotices";
import LangSwitch from "@/components/LangSwitch";
import ProNavLink from "@/components/ProNavLink";
import UsageStats, { UsageStatsSetting } from "@/components/UsageStats";

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
      <body className="min-h-screen font-sans">
        <header className="sticky top-0 z-20 border-b border-line/70 bg-canvas/80 backdrop-blur-xl">
          <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="shrink-0 text-lg font-semibold tracking-tight">10BONDS</Link>
            <div className="ml-3 flex items-center gap-3 text-sm text-mute sm:gap-5">
              <LangSwitch />
              <ProNavLink />
              <Link href="/pricing" className="hover:text-ink">Pricing</Link>
              <Link href="/disclaimer" className="hidden hover:text-ink sm:inline">Disclaimer</Link>
              <AccountNav />
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
          <AccountNotices />
          {children}
        </main>
        <footer className="border-t border-line/70 py-8 text-center text-xs leading-relaxed text-mute">
          <p className="mx-auto max-w-2xl px-4">
            10BONDS is a bond discovery tool. Information only, not investment advice, not an offer to buy or sell.
            Yields are indicative and can change. Past performance does not guarantee future results.
          </p>
          <p className="mt-2">
            © {new Date().getFullYear()} 10BONDS · <Link href="/terms" className="underline hover:text-ink">Terms</Link> · <Link href="/pro" className="underline hover:text-ink">For wealth managers</Link> · <UsageStatsSetting />
          </p>
          <p className="mt-2">
            <Link href="/it" hrefLang="it-IT" className="underline hover:text-ink">Italiano</Link> · <Link href="/fr" hrefLang="fr-FR" className="underline hover:text-ink">Français</Link> · <Link href="/de" hrefLang="de-DE" className="underline hover:text-ink">Deutsch</Link>
          </p>
        </footer>
        <UsageStats />
      </body>
    </html>
  );
}
