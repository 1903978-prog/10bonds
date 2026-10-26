/**
 * Terms of Use and Risk Disclosure that every user accepts before an account is created.
 * Changing the text means raising TERMS_VERSION, so each account records which version it accepted.
 */
export const TERMS_VERSION = "2026-10-25.1";

export type TermsSection = { title: string; paragraphs: string[] };

export const TERMS_SECTIONS: TermsSection[] = [
  {
    title: "1. Who we are and what this agreement covers",
    paragraphs: [
      "These Terms of Use and Risk Disclosure (the \"Terms\") form a binding agreement between you and SQUARE ONE OÜ, a company registered in Estonia (registry code 14035002, VAT number EE102234240, Männimäe/1, Pudisoo küla, Kuusalu vald, 74626 Harju maakond), which operates the 10BONDS website and service (\"10BONDS\", \"we\", \"us\", \"our\"). They govern your access to and use of the website at 10bonds.com and any successor domain, every page, tool, list, ranking, figure, e-mail and feature offered under the 10BONDS name (together, the \"Service\").",
      "By ticking the acceptance box, creating an account, or otherwise using the Service, you confirm that you have read, understood and agree to be bound by these Terms in full. If you do not agree, you must not create an account and must not use the Service.",
      "If you use the Service on behalf of a company or other organisation, you confirm that you have authority to bind it, and \"you\" includes that organisation.",
    ],
  },
  {
    title: "2. Information service only: no investment advice",
    paragraphs: [
      "10BONDS is a general information and screening tool. It sorts publicly available data about bonds according to criteria that you choose, such as duration and yield. It is not an investment adviser, broker, dealer, bank, investment firm, portfolio manager, credit rating agency, financial planner, tax adviser or legal adviser, and it does not act as any of these for you.",
      "Nothing in the Service is, or should be read as, investment advice, investment research, a financial promotion directed at you, a personal recommendation, a solicitation, an offer, or an invitation to buy, sell, hold or subscribe for any security, bond, fund or other financial instrument, or to adopt any investment strategy.",
      "Rankings, lists, \"top 10\" results, scores, averages and any other output are produced mechanically from data and your inputs. They do not take into account your personal circumstances, financial situation, knowledge and experience, investment objectives, time horizon, liquidity needs, tax position or tolerance for risk. A bond appearing in a list, or ranking highly, is not a statement that it is suitable, appropriate, safe, good value or likely to perform well for you or anyone else.",
      "No suitability or appropriateness assessment is performed under the EU Markets in Financial Instruments Directive (MiFID II, Directive 2014/65/EU), the UK Financial Services and Markets Act 2000, the US Investment Advisers Act of 1940, the US Securities Exchange Act of 1934, or any similar law anywhere in the world. You will not receive the protections that such laws give to clients of regulated firms.",
      "Before making any investment decision you should obtain independent advice from a professional who is properly licensed in your country and who knows your circumstances, and you should read the official offering documents (prospectus, base prospectus, final terms, key information document) for any instrument you consider.",
      "The Service is not designed for trading. SQUARE ONE OÜ expresses no opinion on whether any investment is advisable or suitable, and the mention of any bond, issuer or financial product is not an endorsement of it. You should not use the Service as the only basis for any investment decision.",
    ],
  },
  {
    title: "3. Not regulated, not registered",
    paragraphs: [
      "10BONDS is not registered with, licensed by, authorised by or supervised by the US Securities and Exchange Commission (SEC), the Financial Industry Regulatory Authority (FINRA), any US state securities regulator, the European Securities and Markets Authority (ESMA), any national competent authority of a European Union or European Economic Area member state (including, for example, CONSOB, BaFin, the AMF or the CNMV), the UK Financial Conduct Authority, the Swiss Financial Market Supervisory Authority, or any other financial regulator in any jurisdiction.",
      "The Service is made available only on the basis that it is a publisher of general, impersonal information that is not tailored to any individual. If the law of your country treats the Service, or your use of it, as a regulated activity, or prohibits it, you must not use the Service. You are solely responsible for knowing and complying with the laws that apply to you.",
      "The Service is not directed at, and must not be used by, any person in any jurisdiction where its publication or use would be unlawful, or would require 10BONDS to obtain any registration, licence or authorisation.",
    ],
  },
  {
    title: "4. No offer of securities; selling restrictions",
    paragraphs: [
      "No information in the Service constitutes an offer of securities to the public within the meaning of the EU Prospectus Regulation (Regulation (EU) 2017/1129), the UK Prospectus Regulation, the US Securities Act of 1933 or any similar law. 10BONDS does not issue, distribute, place, underwrite or sell any instrument.",
      "Many bonds are subject to selling restrictions. Some may only be offered to qualified, professional or institutional investors, may not be offered in or into the United States or to US persons (as defined in Regulation S under the US Securities Act of 1933), may not be offered to retail investors in the EEA or the UK (for example where no key information document under the PRIIPs Regulation (EU) No 1286/2014 is available), or may have minimum denominations of EUR 100,000 or more. The presence of a bond in the Service does not mean that you are eligible to buy it, that it is available to you, or that it may lawfully be offered to you. Your bank or broker decides what you may buy.",
    ],
  },
  {
    title: "5. Data: indicative, possibly delayed, incomplete or wrong",
    paragraphs: [
      "Prices, yields, yields to maturity, durations, coupons, maturity dates, risk scores, issuer names, country information and all other figures are indicative only. They come from third-party and public sources and from calculations that rely on assumptions. They may be delayed, stale, incomplete, approximate, rounded, estimated or simply wrong, and they may differ from the prices at which you can actually trade.",
      "Yields are calculated under simplifying assumptions (for example, that the bond is held to maturity, that all payments are made in full and on time, that coupons are reinvested at the same yield, and without taxes, fees, commissions, spreads or currency effects). Your actual return can be materially lower and can be negative.",
      "The risk score shown (from 1, lowest, to 10, highest) is 10BONDS' own internal assessment, provided for information only. It is not a credit rating, it is built by 10BONDS from public credit information, it does not suggest any investment strategy, may be out of date, may refer to the issuer rather than the specific bond, and is not a guarantee of creditworthiness. You must check official credit ratings with the rating agencies, the issuer and your financial adviser, and you must not rely on the 10BONDS risk score. 10BONDS is not a credit rating agency within the meaning of the EU Credit Rating Agencies Regulation (Regulation (EC) No 1060/2009) and does not issue ratings.",
      "We do not guarantee the accuracy, completeness, timeliness, availability or fitness for any purpose of any data or output. You must verify every figure independently with your bank, broker or the official documentation before relying on it.",
      "The data is refreshed once a night and is not updated in real time: it usually reflects prices at the close of the previous trading day, or earlier. We do not verify the data received from third parties and have no obligation to do so. We are not liable for any errors, omissions, delays or interruptions in the data, or for any action taken in reliance on it. Always confirm the price with your broker or bank before executing any trade.",
      "Filters and search results are provided \"as is\" for information only. 10BONDS is not affiliated with, and receives no payment from, any broker, bank or trading platform mentioned in the Service, and gives no warranty, express or implied, that any listed bond is available through any particular broker.",
    ],
  },
  {
    title: "6. Our ratings and data: not for investment decisions",
    paragraphs: [
      "The 10bonds.com rating, the risk score, rankings, lists and every other figure in the Service are purely the output of 10BONDS' own methodology. They are not credit ratings, not recommendations and not advice, and they must not be used to make, or as the basis of, any investment decision.",
      "Our data can be entirely wrong. Every figure in the Service is illustrative only and may be inaccurate, incomplete, out of date or misleading, including the ratings, risk scores, prices, yields, durations, issuer details and rankings.",
      "We give no warranty of any kind that any rating, score, ranking or data is accurate, complete or timely. To the fullest extent permitted by law, we accept no liability for any loss or damage arising from the use of, or reliance on, the Service, its ratings or its data. If you use them for an investment decision, you do so entirely at your own risk.",
    ],
  },
  {
    title: "7. Investment risks you accept",
    paragraphs: [
      "Investing in bonds involves significant risk, including the possible loss of all the money invested. Risks include, without limitation: credit and default risk (the issuer may fail to pay interest or principal); interest-rate risk (bond prices fall when interest rates rise); liquidity risk (you may be unable to sell, or only at a large discount); market and price risk; reinvestment risk; inflation risk; currency risk for bonds denominated in a currency other than your own; call, prepayment and extension risk; subordination risk (subordinated, hybrid, perpetual and Additional Tier 1 instruments rank behind other creditors and may be written down or converted into shares); bail-in and resolution risk for banks under the EU Bank Recovery and Resolution Directive and similar laws; sovereign and political risk; legal, regulatory and tax risk; and concentration risk.",
      "Past performance, historical yields and risk scores are not reliable indicators of future results. Any figure describing a possible return is not a forecast or a promise.",
      "You alone decide whether to invest, how much and in what. You accept full responsibility for your investment decisions and their consequences.",
    ],
  },
  {
    title: "8. Eligibility and your account",
    paragraphs: [
      "You must be at least 18 years old (or the age of legal majority where you live, if higher) and legally able to enter into this agreement. You must not use the Service if you are subject to sanctions administered by the United Nations, the European Union, the United Kingdom, the United States (including the Office of Foreign Assets Control) or any other relevant authority, or if you are located in a country or territory subject to comprehensive sanctions.",
      "You must give a true e-mail address and keep your password secret. You are responsible for all activity under your account. Tell us promptly if you believe your account has been used without your permission. One account per person.",
      "We may suspend or close any account, or refuse service, at any time and for any reason, including suspected breach of these Terms, fraud, abuse or legal requirements.",
    ],
  },
  {
    title: "9. Acceptable use",
    paragraphs: [
      "You agree not to: copy, scrape, crawl, harvest, download in bulk, resell, redistribute, sublicense or commercially exploit the Service or its data; use automated tools to access it except as we expressly allow; circumvent any access limit, plan restriction or security measure; share your account; reverse engineer the Service; upload malware; interfere with its operation; use it to break any law, including securities, market-abuse, data-protection and consumer laws; or present any output of the Service as investment advice or as coming from a regulated firm.",
    ],
  },
  {
    title: "10. Paid plans",
    paragraphs: [
      "Paid plans, when offered, give access to additional information and features as described at the time of purchase. Paying for a plan does not turn the Service into advice or create any advisory, fiduciary or client relationship. Prices, features, payment terms, renewal and cancellation rules will be shown before you pay and form part of these Terms. Where the law of your country gives consumers a right of withdrawal, you will be told how it applies. Plus costs €9, Premium €19 and Pro €89 per month, or 20% less when paid yearly (€86.40, €182.40 and €854.40 a year), VAT included where applicable, charged in advance for each month or year by our payment provider Stripe until you cancel. Pro is available only to professionals whose access we have approved. You can cancel or change plan at any time on your profile page; a change of plan is prorated by Stripe, and a cancellation takes effect at the end of the period already paid, with no refund for the remaining days except where the law requires one. If a payment fails, Stripe retries it for a short period, after which the account returns to the free plan. EU and UK consumers normally have 14 days to withdraw from a contract for a digital service. Because the plan starts straight away, you are asked before paying to request this expressly and to acknowledge that, if you withdraw within 14 days, you pay for the days already used; you can withdraw by cancelling and writing to us within that period.",
      "Free trials: new accounts start on the free plan. Promo codes we hand out give the Premium features for the period stated with the code (usually 30 days); each code can be used once and has no cash value. When a trial ends your account returns to the free plan automatically; you are never charged for a trial and no payment details are needed. We may change or end trial offers at any time for the future.",
    ],
  },
  {
    title: "11. Intellectual property",
    paragraphs: [
      "The Service, its software, design, rankings, selection and arrangement of data, texts and trademarks belong to 10BONDS or its licensors and are protected by intellectual-property laws. We grant you a personal, limited, revocable, non-exclusive, non-transferable licence to use the Service for your own private, non-commercial information purposes, in line with these Terms. All other rights are reserved. Third-party data remains the property of its owners.",
    ],
  },
  {
    title: "12. No warranties",
    paragraphs: [
      "To the fullest extent permitted by law, the Service and all data and output are provided \"as is\" and \"as available\", with all faults and without any warranty, condition or representation of any kind, whether express, implied or statutory, including any warranty of accuracy, completeness, timeliness, merchantability, satisfactory quality, fitness for a particular purpose, non-infringement, or that the Service will be uninterrupted, secure or error-free.",
    ],
  },
  {
    title: "13. Limitation of liability",
    paragraphs: [
      "To the fullest extent permitted by law, 10BONDS, its owners, operators, employees, contractors, data providers and licensors shall not be liable to you or anyone else for any loss or damage of any kind arising out of or in connection with the Service or these Terms, whether in contract, tort (including negligence), breach of statutory duty or otherwise, including any investment loss, trading loss, loss of profit, loss of opportunity, loss of data, or any indirect, incidental, special, consequential, exemplary or punitive damages, even if advised of their possibility.",
      "Where liability cannot be excluded but can be limited, our total aggregate liability to you for all claims is limited to the greater of (a) the amount you paid us for the Service in the twelve months before the event giving rise to the claim and (b) EUR 50.",
      "Nothing in these Terms excludes or limits liability that cannot lawfully be excluded or limited, such as liability for death or personal injury caused by negligence, for fraud or fraudulent misrepresentation, for gross negligence or wilful misconduct where the law so requires, or any rights you have as a consumer under mandatory law (including Directive 93/13/EEC on unfair terms in consumer contracts and the consumer laws of your country of residence).",
    ],
  },
  {
    title: "14. Indemnity",
    paragraphs: [
      "To the extent permitted by law, you agree to indemnify and hold harmless 10BONDS and its owners, operators and contractors from any claim, liability, loss, cost or expense (including reasonable legal fees) arising from your breach of these Terms, your misuse of the Service, your investment decisions, or your breach of any law or third-party right.",
    ],
  },
  {
    title: "15. Privacy",
    paragraphs: [
      "We process your personal data (your e-mail address, for paying customers the subscription status and the customer reference held by Stripe (card details are held only by Stripe, never by us), username, a securely hashed form of your password, your plan, the date you accepted these Terms and, only if you allow usage statistics, records of pages visited, the time spent on each page, searches and buttons clicked, linked to an anonymous visitor number such as user001 together with your country, device type, language and the site you came from; if you refuse statistics we only add one to a daily count per page and country, with nothing that identifies you) to provide the Service, keep it secure, and improve it, in line with the EU and UK General Data Protection Regulation and other applicable data-protection laws. We do not store your IP address with usage statistics, do not sell your data and do not use third-party advertising trackers. Usage statistics are kept for at most 13 months. Cookies and similar storage are grouped as Necessary (signing in, remembering your cookie choice; always on), Preferences, Statistics and Marketing (we use no marketing cookies today); everything except Necessary is used only if you allow it in the cookie banner, and you can change your choice at any time with “Cookie settings”. We send e-mails needed to run your account, such as the link to confirm your address. You can ask to access, correct, export or delete your data, object to processing, or withdraw consent at any time, and you may complain to your data-protection authority. You can download your data, delete your activity data or delete your account at any time on your profile page. The full privacy policy is at /privacy and the cookie policy at /cookies.",
    ],
  },
  {
    title: "16. Changes, suspension and termination",
    paragraphs: [
      "We may change, suspend or discontinue the Service or any part of it at any time. We may update these Terms; the version you accepted is recorded with your account. If we make material changes we will ask you to accept the new version before you continue using your account. You may stop using the Service and close your account at any time. Sections 2 to 6 and 10 to 18 survive termination.",
    ],
  },
  {
    title: "17. Third-party links and services",
    paragraphs: [
      "The Service may link to or rely on third-party websites, data and services. We do not control them and are not responsible for their content, accuracy, availability or practices. A link is not an endorsement.",
    ],
  },
  {
    title: "18. Governing law and disputes",
    paragraphs: [
      "These Terms and any dispute arising from them are governed by the laws of Estonia, excluding its conflict-of-law rules and the UN Convention on Contracts for the International Sale of Goods. The Harju County Court (Harju Maakohus) in Tallinn, Estonia has exclusive jurisdiction, except that if you are a consumer you keep the protection of the mandatory laws of your country of residence and may bring proceedings in the courts of that country. EU consumers may also use the European Commission's online dispute resolution information at https://ec.europa.eu/consumers/odr.",
      "To the extent permitted by law, any claim must be brought individually, not as a plaintiff or class member in any class, collective or representative action, and must be brought within one year after the cause of action arises.",
    ],
  },
  {
    title: "19. General",
    paragraphs: [
      "These Terms are the entire agreement between you and us about the Service. If any provision is found invalid or unenforceable, the rest remains in force and the invalid provision is replaced by a valid one that comes closest to its intent. Our failure to enforce a right is not a waiver. You may not transfer your rights under these Terms; we may transfer ours to a successor. These Terms are written in English; a translation is for convenience only and the English version prevails to the extent permitted by law.",
    ],
  },
  {
    title: "20. Your confirmation",
    paragraphs: [
      "By ticking the box you confirm that: you have read and accept these Terms in full; you understand that 10BONDS gives information only and no investment advice or recommendation; you will not rely on the Service as the basis for any investment decision and will verify all data independently; you understand that bonds can lose value and that you may lose all the money you invest; you are at least 18 years old and allowed to use the Service under the laws that apply to you; and you accept the limitations of liability set out above.",
    ],
  },
];
