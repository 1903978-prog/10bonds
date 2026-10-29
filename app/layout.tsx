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
import HomeNavLink from "@/components/HomeNavLink";
import CalculatorNavLink from "@/components/CalculatorNavLink";
import BondCardNavLink from "@/components/BondCardNavLink";
import DailyCounter from "@/components/DailyCounter";
import TutorialNavButton from "@/components/TutorialNavButton";
import PlansNavLink from "@/components/PlansNavLink";
import DropsNavLink from "@/components/DropsNavLink";
import { currentUser } from "@/lib/currentUser";
import LangSwitch from "@/components/LangSwitch";
import NavLink from "@/components/NavLink";
import UsageStats from "@/components/UsageStats";
import CopyGuard from "@/components/CopyGuard";
import GptCalcPopup from "@/components/GptCalcPopup";
import { OG_IMAGES } from "@/lib/ogImage";
import { HYDRATION_REPORT } from "@/lib/hydrationReport";

const SITE_URL = process.env.SITE_URL ?? "https://10bonds.fly.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Bing Webmaster Tools site verification (the owner, 19 Oct 2026). Public by design, not a secret.
  verification: { other: { "msvalidate.01": "ADA17531835A822BB9A6870BCE68531B" } },
  title: "10BONDS · AI-powered bond selection",
  description: "AI-powered bond selection: pick a duration and a desired return, and 10BONDS shows 10 euro bonds that match. Data updated daily.",
  openGraph: { images: OG_IMAGES,
    title: "10BONDS · AI-powered bond selection",
    description: "AI-powered bond selection: pick a duration and a desired return, and get 10 euro bonds that match.",
    type: "website",
    siteName: "10BONDS",
  },
  twitter: { card: "summary_large_image", images: ["/og.png"], title: "10BONDS · AI-powered bond selection", description: "AI-powered bond selection: pick a duration and a desired return, and get 10 euro bonds that match." },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f5f5f7" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Builds every page per request, so each one gets the fresh script nonce from middleware.ts.
  const hdrs = await headers();
  const path = hdrs.get("x-pathname") ?? "/";
  // The same per-request nonce the middleware put in the content security policy (needed for the one diagnostic script below).
  const nonce = /'nonce-([^']+)'/.exec(hdrs.get("content-security-policy") ?? "")?.[1];
  // The page language for search engines and screen readers: the Italian, French and German sites are not English.
  // Pages without a language prefix (/pricing, /login) are drawn in the language chosen in the menu (tb_lang cookie), so lang says the same.
  const jar = await cookies();
  const chosen = jar.get("tb_lang")?.value;
  const lang = /^\/(it|fr|de)(\/|$)/.exec(path)?.[1] ?? (chosen === "it" || chosen === "fr" || chosen === "de" ? chosen : "en");
  // Whether a sign-in cookie is present, so the header draws the right links straight away instead of popping them in.
  const hasSession = Boolean(jar.get(SESSION_COOKIE)?.value);
  // Price drops is the admin's only for now (52-week values stay private): drawn on the server, so nothing pops in.
  const admin = hasSession && (await currentUser())?.isAdmin === true;
  return (
    <html lang={lang}>
      <body className="font-sans">
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: HYDRATION_REPORT }} />
        <header className="sticky top-0 z-20 border-b border-line bg-white">
          <nav className="header-wide mx-auto flex h-14 min-w-0 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" aria-label="10BONDS home" className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight"><Logo className="h-7 w-auto" /></Link>
            <div className="ml-2 flex items-center gap-1.5 text-[13px] text-mute sm:ml-3 sm:gap-5 sm:text-sm">
              {admin && <span className="hidden sm:contents"><DropsNavLink /></span>}
              {admin && <Link href="/admin/shortlist" data-testid="nav-shortlist" className="hidden rounded-full bg-yellow-200 px-2 py-0.5 sm:inline-block">Shortlist</Link>}
              {admin && <Link href="/admin/features" data-testid="nav-features" className="hidden rounded-full bg-yellow-200 px-2 py-0.5 sm:inline-block">Plan features</Link>}
              {admin && <Link href="/risk-assessment" data-testid="nav-focus" className="hidden rounded-full bg-yellow-200 px-2 py-0.5 sm:inline-block">Risk assessment</Link>}
              {admin ? <span className="hidden sm:contents"><HomeNavLink /></span> : <HomeNavLink />}
              <BondCardNavLink admin={admin} />
              <TutorialNavButton />
              <KnowledgeNavLink />
              <CalculatorNavLink admin={admin} />
              <PlansNavLink />
              {/* Fixed-width slot for the links that load after the page (Retail/Pro switch, Admin, Sign in, profile), so the menu never shifts. */}
              <div className="flex min-w-[128px] items-center justify-end gap-1.5 sm:min-w-[232px] sm:gap-5">
                {/* Language sits right before the account links (profile icon), as the owner asked. */}
                <LangSwitch />
                <AccountNav hasSession={hasSession} />
              </div>
            </div>
          </nav>
          {/* Searches left today: for signed-in accounts on the finder pages, fixed height so nothing moves. */}
          {hasSession && /^\/((it|fr|de)\/?)?$|^\/isin-search|^\/bond-card/.test(path) && <DailyCounter />}
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
