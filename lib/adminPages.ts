/** Every admin page with a one-line description. The admin home (/admin) lists exactly these; lib/adminPages.test.ts fails
 *  when a page folder under app/admin has no entry here, or an entry points to a page that does not exist. */
export type AdminPage = { href: string; title: string; desc: string };

export const ADMIN_PAGES: AdminPage[] = [
  { href: "/admin/funnel", title: "Funnel", desc: "Visitors to sign-ups to paying users, day by day." },
  { href: "/admin/visitors", title: "Visitors", desc: "Who visits, from where, and what they open." },
  { href: "/admin/pro", title: "Professional access requests", desc: "Approve or reject requests for the Pro plan." },
  { href: "/admin/outreach", title: "Pro outreach", desc: "Draft e-mails to professionals; nothing is sent without your click." },
  { href: "/admin/features", title: "Plan features", desc: "What each plan includes, and the daily search limit." },
  { href: "/admin/risk-premium", title: "Risk Premium Model", desc: "Default and loss tables behind the score." },
  { href: "/admin/brokers", title: "Broker management", desc: "Broker pages and their data." },
  { href: "/admin/seo", title: "SEO Management", desc: "SEO score and roadmap, rankings, backlinks, guides, sharing and technical checks." },
  { href: "/admin/benchmark", title: "ETF comparison", desc: "Compares a portfolio with a benchmark ETF." },
  { href: "/admin/methodology", title: "Methodology 1–5", desc: "Choose which method builds the portfolios." },
  { href: "/admin/risk-bands", title: "Risk bands", desc: "The 30 average-risk bands and how many bonds each holds." },
  { href: "/admin/efficient-database", title: "Efficient Database", desc: "The 90 stored portfolios behind the slider and the nightly build." },
  { href: "/admin/bond-efficiency", title: "Bond Efficiency", desc: "Bond Efficiency Score of every bond and its run log." },
  { href: "/admin/bund-benchmark", title: "Bund benchmark", desc: "Official German government curve and its weekly refresh." },
  { href: "/admin/us-treasury-benchmark", title: "US Treasury benchmark", desc: "Official US Treasury curve and its weekly refresh." },
  { href: "/admin/portfolio-efficiency", title: "Portfolio Efficiency", desc: "How close each portfolio is to the efficient line." },
  { href: "/admin/data-quality", title: "Price checks", desc: "Bonds with old or odd prices." },
  { href: "/admin/bond-data", title: "Bond data", desc: "Data coverage: how many bonds have each field, and bond import." },
  { href: "/admin/classification", title: "Country & industry", desc: "Issuers still without a country or industry." },
  { href: "/admin/legal-risk", title: "Legal risk", desc: "Legal wording and compliance checks." },
  { href: "/admin/assessments", title: "Assessments & corrections", desc: "Evidence and correction requests for company pages." },
  { href: "/admin/welcome-email", title: "Welcome e-mail", desc: "Preview of the e-mail new users get." },
  { href: "/admin/weekly-email", title: "Weekly e-mail", desc: "Preview and settings of the weekly e-mail (sending is off)." },
  { href: "/admin/skills", title: "Rating skills", desc: "Instructions used by the rating tools." },
  { href: "/admin/shortlist", title: "Shortlist", desc: "Saved bond shortlists." },
  { href: "/admin/landingpage1", title: "Landing page 1 (saved)", desc: "The saved earlier version of the landing page." },
];
