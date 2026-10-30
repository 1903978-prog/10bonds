// Where 10BONDS should be listed to earn backlinks and mentions: directories, finance forums, startup sites and
// social profiles, by market. Ticks are stored in app.settings (seo_listing_done) by the backlinks admin route.
// Forum and Reddit links are earned by helpful answers first: most ban plain self-promotion.

export type ListingMarket = "global" | "it" | "fr" | "de" | "us" | "uk";
export type ListingKind = "directory" | "startup" | "finance" | "forum" | "social" | "review";
export type ListingSite = { id: string; name: string; url: string; market: ListingMarket; kind: ListingKind; priority: 1 | 2 | 3; tip: string };

export const LISTING_SITES: ListingSite[] = [
  // Global profiles: quick wins that also feed Google's picture of the brand.
  { id: "google-business", name: "Google Business Profile", url: "https://business.google.com/create", market: "global", kind: "directory", priority: 1, tip: "Already started. Finish verification and add the website, logo and a short description." },
  { id: "bing-places", name: "Bing Places", url: "https://www.bingplaces.com/", market: "global", kind: "directory", priority: 1, tip: "Can import the Google Business Profile in one click." },
  { id: "linkedin", name: "LinkedIn company page", url: "https://www.linkedin.com/company/setup/new/", market: "global", kind: "social", priority: 1, tip: "Add the website link and post each new guide." },
  { id: "x", name: "X (Twitter)", url: "https://x.com/i/flow/signup", market: "global", kind: "social", priority: 1, tip: "Website in the bio; share charts from the site." },
  { id: "facebook", name: "Facebook page", url: "https://www.facebook.com/pages/create", market: "global", kind: "social", priority: 2, tip: "Website in the About section." },
  { id: "instagram", name: "Instagram", url: "https://www.instagram.com/accounts/emailsignup/", market: "global", kind: "social", priority: 2, tip: "Website link in the bio." },
  { id: "youtube", name: "YouTube channel", url: "https://www.youtube.com/create_channel", market: "global", kind: "social", priority: 2, tip: "Short videos explaining bonds; link in every description." },
  { id: "tiktok", name: "TikTok", url: "https://www.tiktok.com/signup", market: "global", kind: "social", priority: 3, tip: "Link in bio once the account has a business profile." },
  { id: "medium", name: "Medium", url: "https://medium.com/", market: "global", kind: "social", priority: 2, tip: "Republish guides with a link back to the original page." },
  { id: "quora", name: "Quora", url: "https://www.quora.com/", market: "global", kind: "forum", priority: 2, tip: "Answer bond questions and link the matching guide." },
  { id: "pinterest", name: "Pinterest business", url: "https://www.pinterest.com/business/create/", market: "global", kind: "social", priority: 3, tip: "Pin the yield-curve and default-rate charts." },
  { id: "bluesky", name: "Bluesky", url: "https://bsky.app/", market: "global", kind: "social", priority: 3, tip: "Website in the profile." },
  { id: "reddit-eu", name: "Reddit r/eupersonalfinance", url: "https://www.reddit.com/r/eupersonalfinance/", market: "global", kind: "forum", priority: 2, tip: "Help first; link only when it answers the question." },
  { id: "trustpilot", name: "Trustpilot business", url: "https://business.trustpilot.com/signup", market: "global", kind: "review", priority: 2, tip: "Free profile with a link; ask happy users for reviews." },

  // Startup and product directories.
  { id: "producthunt", name: "Product Hunt", url: "https://www.producthunt.com/posts/new", market: "global", kind: "startup", priority: 1, tip: "Launch on a Tuesday to Thursday; prepare screenshots first." },
  { id: "crunchbase", name: "Crunchbase", url: "https://www.crunchbase.com/add-new", market: "global", kind: "startup", priority: 1, tip: "Company profile for 10BONDS with the website." },
  { id: "betalist", name: "BetaList", url: "https://betalist.com/submit", market: "global", kind: "startup", priority: 2, tip: "Free listing has a waiting list." },
  { id: "alternativeto", name: "AlternativeTo", url: "https://alternativeto.net/manage-item/", market: "global", kind: "directory", priority: 2, tip: "List as an alternative to bond screeners." },
  { id: "saashub", name: "SaaSHub", url: "https://www.saashub.com/services/submit", market: "global", kind: "directory", priority: 2, tip: "Free listing with a followed link." },
  { id: "uneed", name: "Uneed", url: "https://www.uneed.best/submit-a-tool", market: "global", kind: "startup", priority: 3, tip: "Free launch queue." },
  { id: "indiehackers", name: "Indie Hackers", url: "https://www.indiehackers.com/products", market: "global", kind: "startup", priority: 3, tip: "Product page plus a build story post." },
  { id: "hackernews", name: "Hacker News (Show HN)", url: "https://news.ycombinator.com/submit", market: "global", kind: "startup", priority: 3, tip: "Title starting “Show HN:”; one try only." },
  { id: "f6s", name: "F6S", url: "https://www.f6s.com/", market: "global", kind: "startup", priority: 3, tip: "Startup profile with website." },
  { id: "startupstash", name: "Startup Stash", url: "https://startupstash.com/add-listing/", market: "global", kind: "startup", priority: 3, tip: "Free directory listing." },
  { id: "capterra", name: "Capterra", url: "https://www.capterra.com/vendors/sign-up", market: "global", kind: "review", priority: 3, tip: "Mainly for the Pro plan (professionals)." },

  // Italy.
  { id: "finanzaonline", name: "FinanzaOnline forum (Obbligazioni)", url: "https://www.finanzaonline.com/forum/register", market: "it", kind: "forum", priority: 1, tip: "Biggest Italian bond forum. Link in signature after some useful posts." },
  { id: "reddit-it", name: "Reddit r/ItaliaPersonalFinance", url: "https://www.reddit.com/r/ItaliaPersonalFinance/", market: "it", kind: "forum", priority: 1, tip: "Very active on BTP questions; answer with the matching guide." },
  { id: "investireoggi", name: "InvestireOggi forum", url: "https://forum.investireoggi.it/", market: "it", kind: "forum", priority: 2, tip: "Bond and BTP threads." },
  { id: "soldionline", name: "SoldiOnline forum", url: "https://www.soldionline.it/forum", market: "it", kind: "forum", priority: 3, tip: "Smaller, finance-focused." },
  { id: "investing-it", name: "Investing.com Italia", url: "https://it.investing.com/", market: "it", kind: "finance", priority: 3, tip: "Profile and comments on bond pages." },
  { id: "hotfrog-it", name: "Hotfrog Italia", url: "https://www.hotfrog.it/", market: "it", kind: "directory", priority: 3, tip: "Free business directory." },

  // France.
  { id: "reddit-fr", name: "Reddit r/vosfinances", url: "https://www.reddit.com/r/vosfinances/", market: "fr", kind: "forum", priority: 1, tip: "Main French personal-finance community." },
  { id: "finary", name: "Finary community", url: "https://community.finary.com/", market: "fr", kind: "forum", priority: 1, tip: "French investors; bond threads welcome useful tools." },
  { id: "boursorama", name: "Boursorama forum", url: "https://www.boursorama.com/forum/", market: "fr", kind: "forum", priority: 2, tip: "Large audience, strict moderation." },
  { id: "investing-fr", name: "Investing.com France", url: "https://fr.investing.com/", market: "fr", kind: "finance", priority: 3, tip: "Profile and comments on OAT pages." },
  { id: "hotfrog-fr", name: "Hotfrog France", url: "https://www.hotfrog.fr/", market: "fr", kind: "directory", priority: 3, tip: "Free business directory." },

  // Germany.
  { id: "wertpapierforum", name: "Wertpapier-Forum (Anleihen)", url: "https://www.wertpapier-forum.de/register/", market: "de", kind: "forum", priority: 1, tip: "Main German bond forum." },
  { id: "reddit-de", name: "Reddit r/Finanzen", url: "https://www.reddit.com/r/Finanzen/", market: "de", kind: "forum", priority: 1, tip: "Very large; links only when they answer the question." },
  { id: "finanzfluss", name: "Finanzfluss Community", url: "https://community.finanzfluss.de/", market: "de", kind: "forum", priority: 2, tip: "Beginner investors asking about Anleihen." },
  { id: "wallstreet-online", name: "wallstreet-online community", url: "https://www.wallstreet-online.de/community/", market: "de", kind: "forum", priority: 3, tip: "Bond threads exist; mixed quality." },
  { id: "hotfrog-de", name: "Hotfrog Deutschland", url: "https://www.hotfrog.de/", market: "de", kind: "directory", priority: 3, tip: "Free business directory." },

  // United States.
  { id: "reddit-bonds", name: "Reddit r/bonds", url: "https://www.reddit.com/r/bonds/", market: "us", kind: "forum", priority: 1, tip: "Exactly the audience; share the yield-by-rating chart." },
  { id: "bogleheads", name: "Bogleheads forum", url: "https://www.bogleheads.org/forum/ucp.php?mode=register", market: "us", kind: "forum", priority: 2, tip: "Strict no-promotion rule: answer questions, link guides sparingly." },
  { id: "seekingalpha", name: "Seeking Alpha (contributor)", url: "https://seekingalpha.com/page/how-to-submit", market: "us", kind: "finance", priority: 2, tip: "Write bond analysis articles with an author bio link." },
  { id: "investing-com", name: "Investing.com", url: "https://www.investing.com/", market: "us", kind: "finance", priority: 3, tip: "Profile and comments on bond pages." },

  // United Kingdom.
  { id: "reddit-uk", name: "Reddit r/UKPersonalFinance", url: "https://www.reddit.com/r/UKPersonalFinance/", market: "uk", kind: "forum", priority: 1, tip: "Gilt questions are frequent; rules forbid self-promotion posts." },
  { id: "mse", name: "MoneySavingExpert forum", url: "https://forums.moneysavingexpert.com/entry/register", market: "uk", kind: "forum", priority: 2, tip: "Savings and investments boards." },
  { id: "lemonfool", name: "The Lemon Fool", url: "https://www.lemonfool.co.uk/ucp.php?mode=register", market: "uk", kind: "forum", priority: 2, tip: "Active gilt and bond discussions." },
];
