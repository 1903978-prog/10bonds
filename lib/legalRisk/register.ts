// Legal & regulatory risk register (assessment of 25 Oct 2026, thread "Run full legal risk audit and dashboard").
//
// INTERNAL PRIORITISATION TOOL, NOT LEGAL ADVICE. Probability and impact are subjective expert judgements (0-100) made
// from what the code shows; they are not statistically calibrated and not a prediction of any claim or regulatory action.
// Risk = probability x impact / 100. Nothing here says the platform is, or is not, legally compliant: that needs counsel.
// Evidence marked `verified: true` was read in this repository on the date above; `false` means inferred or not checkable from code.

export const ASSESSED_AT = "2026-10-25";

export type Applicability = "Applicable" | "Potentially applicable" | "Not applicable" | "Unresolved";
export type Confidence = "High" | "Medium" | "Low";
export type Owner = "Engineering" | "Product" | "Legal" | "Operations";
export type Verification = "Automated test" | "Document" | "Legal opinion";
/** Status 1 of 3: what software and copy can do. Never means "legally compliant". */
export type TechnicalStatus = "implemented" | "partial" | "not_started" | "not_needed";

export type Evidence = { ref: string; note: string; verified: boolean };

export type Criterion = {
  id: number;
  group: "A. Financial regulation" | "B. Litigation and publishing" | "C. Intellectual property and data" | "D. Consumer and platform compliance";
  title: string;
  jurisdiction: string;
  law: string;
  applicability: Applicability;
  evidence: Evidence[];
  probability: number;
  impact: number;
  mitigation: string;
  /** Safeguards already in the code or copy (this audit or earlier work). */
  implemented: string[];
  /** Material changes that need the owner's approval before anyone builds them. */
  awaitingApproval: string[];
  /** Questions only qualified counsel can answer. */
  legalQuestions: string[];
  residualProbability: number;
  residualImpact: number;
  confidence: Confidence;
  verification: Verification[];
  owner: Owner;
  technical: TechnicalStatus;
  /** True when the question could be whether an authorisation, registration or licence is needed, whatever the score. */
  authorisationQuestion: boolean;
  /** Ids of automated checks (lib/legalRisk/checks.ts, lib/legalRisk/sourceChecks.test.ts) that guard this criterion. */
  checks: string[];
};

export const risk = (p: number, i: number) => Math.round((p * i) / 100);
export const initialRisk = (c: Criterion) => risk(c.probability, c.impact);
export const residualRisk = (c: Criterion) => risk(c.residualProbability, c.residualImpact);

export const CRITERIA: Criterion[] = [
  {
    id: 1, group: "A. Financial regulation", title: "EU Credit Rating Agencies Regulation",
    jurisdiction: "EU", law: "Regulation (EC) 1060/2009: Art. 3(1)(a) credit rating, Art. 2(2) exclusions, Art. 14 registration",
    applicability: "Unresolved",
    evidence: [
      { ref: "lib/ratings.ts:43 bondNotch, :30 riskOfLr", note: "Issuer/bond risk is a 1-10 scale published for ~17,000 bonds; a fixed scale of categories is the feature the Regulation looks at.", verified: true },
      { ref: "lib/disclaimer.ts:45", note: "Site states the score 'is not a credit rating' and 10BONDS 'is not a credit rating agency', but the owner also renamed it '10bonds.com rating' (project memory), which points the other way.", verified: true },
      { ref: "lib/disclaimer.ts:ASSESSMENTS_ABOUT (PR #214)", note: "'About our credit assessments' (owner wording) says the scores are model-based, not official credit ratings of a registered agency, with a 'Methodology and limits' list.", verified: true },
      { ref: "docs/handover/lr-ratings.md", note: "Own LR score is designed (0-100, automatic) but the database column is still empty, so today the score is derived from third-party grades.", verified: true },
    ],
    probability: 45, impact: 85,
    mitigation: "Keep the 1-10 output explicitly a 'quantitative risk score', not a 'rating': avoid the word 'rating' for customers, state methodology limits and that it is not an opinion on creditworthiness issued under the Regulation, never use it for regulatory purposes. Counsel to decide whether automated scores on a published scale fall inside Art. 3(1)(a) or the Art. 2(2) exclusions.",
    implemented: ["Disclaimer section 'The risk score is not a credit rating' (lib/disclaimer.ts:45) and 'About our credit assessments' with methodology limits (PR #214)", "No agency names or letters sent to customers", "Regression test blocks claims that the score is an agency-style rating or that 10BONDS is a rating agency"],
    awaitingApproval: ["Rename '10bonds.com rating' to 'risk score' in customer copy (owner decision on product naming)", "Counsel opinion before the own-score (LR) goes live"],
    legalQuestions: ["Is a published, automatically computed 1-10 score on a fixed scale a 'credit rating' under Art. 3(1)(a)?", "Does any Art. 2(2) exclusion apply (e.g. distribution not by subscription)? Paid plans make this harder."],
    residualProbability: 30, residualImpact: 85, confidence: "Low", verification: ["Legal opinion", "Document"], owner: "Legal",
    technical: "partial", authorisationQuestion: true, checks: ["no-rating-agency-claims", "model-versions"],
  },
  {
    id: 2, group: "A. Financial regulation", title: "US credit-rating agency / NRSRO framework",
    jurisdiction: "US", law: "Securities Exchange Act of 1934 §3(a)(60), §3(a)(62), §15E; antifraud (Rule 10b-5, Securities Act §17(a))",
    applicability: "Unresolved",
    evidence: [
      { ref: "lib/disclaimer.ts:45", note: "Not described as an NRSRO or a rating by a registered agency.", verified: true },
      { ref: "app/knowledge, lib/seo/guidesEn.ts (US/UK guides)", note: "US-targeted English guides exist; USD bonds are in the database.", verified: true },
    ],
    probability: 20, impact: 50,
    mitigation: "Registration as an NRSRO is voluntary; the live questions are use of the word 'rating' and antifraud. Keep 'score' wording, never claim NRSRO status or equivalence, keep disclosures that scores are model output.",
    implemented: ["No NRSRO/agency equivalence claims (guarded by test)", "Methodology limits text (disclaimer)"],
    awaitingApproval: [],
    legalQuestions: ["Does publishing a symbol-based score on US-listed or USD bonds to US users create any registration or exemption question?"],
    residualProbability: 15, residualImpact: 50, confidence: "Low", verification: ["Legal opinion", "Automated test"], owner: "Legal",
    technical: "partial", authorisationQuestion: false, checks: ["no-rating-agency-claims"],
  },
  {
    id: 3, group: "A. Financial regulation", title: "EU MiFID II investment advice",
    jurisdiction: "EU / EEA (Estonia, Italy, France, Germany targeted)", law: "Directive 2014/65/EU Art. 4(1)(4) personal recommendation, Art. 3 and 24; Delegated Reg. 2017/565 Art. 9",
    applicability: "Potentially applicable",
    evidence: [
      { ref: "lib/singleBond.ts, lib/bestTable.ts, components/Finder.tsx", note: "User enters horizon, desired return and worst rating accepted; the system returns a named list of 10 bonds with ISINs (paid). That is investor-specific input producing specific instruments.", verified: true },
      { ref: "app/api/pro/replace/route.ts:1-45, lib/replacement.ts", note: "Pro tool takes an uploaded portfolio and returns per-holding swap/keep lines (action 'swap' / 'keep', fields sell/buy). Closest feature to a personal recommendation.", verified: true },
      { ref: "lib/terms.ts:23-26, lib/disclaimer.ts:17-22", note: "Terms and disclaimer say no suitability assessment, no recommendation.", verified: true },
      { ref: "components/ProRequestForm.tsx:61", note: "Professionals confirm they stay responsible for suitability; Pro access approved by admin.", verified: true },
    ],
    probability: 35, impact: 75,
    mitigation: "Keep the finder impersonal (filters, not suitability); never ask for age, income, objectives or risk tolerance (guarded by test); keep Pro limited to approved professionals under written terms; replace 'sell/buy/keep' wording in Pro with neutral 'alternative with similar duration'.",
    implemented: ["No onboarding profiling fields (guarded by test)", "Disclaimers in Terms and Disclaimer pages", "Pro limited to approved professionals", "Test blocks suitability/risk-tolerance questions entering customer code", "Pro engine screens already use Held / Alternative / No alternative; the last 'keep' wording removed"],
    awaitingApproval: ["Written B2B terms for Pro stating the firm makes any advice"],
    legalQuestions: ["Do the finder's inputs plus a named top-10 amount to a 'personal recommendation' in Estonia, Italy, France, Germany?", "Is the Pro swap list advice even for professional users?"],
    residualProbability: 25, residualImpact: 70, confidence: "Low", verification: ["Legal opinion", "Automated test"], owner: "Legal",
    technical: "partial", authorisationQuestion: true, checks: ["no-suitability-profiling", "api-route-inventory", "no-buy-sell-labels"],
  },
  {
    id: 4, group: "A. Financial regulation", title: "US Investment Advisers Act",
    jurisdiction: "US (federal and state)", law: "Investment Advisers Act of 1940 §202(a)(11) and publisher exclusion §202(a)(11)(D); Lowe v. SEC, 472 U.S. 181 (1985); state adviser statutes",
    applicability: "Unresolved",
    evidence: [
      { ref: "lib/tiers.ts, lib/features.ts", note: "Subscription fee is charged for access to impersonal tools; no individual advice or personal portfolio monitoring for non-Pro users.", verified: true },
      { ref: "app/api/pro/replace/route.ts", note: "Pro tool analyses an uploaded portfolio (personalised), not stored.", verified: true },
    ],
    probability: 25, impact: 70,
    mitigation: "Stay inside the publisher exclusion: bona fide, regular, general circulation, impersonal. Personalised portfolio analysis (Pro) is the weak spot: keep to approved professionals, no US retail access to Pro, no 'you should' wording.",
    implemented: ["Impersonal wording rules (guarded by test)", "Pro restricted to approved accounts"],
    awaitingApproval: ["Block Pro for US-resident individuals (needs country on the Pro request form)"],
    legalQuestions: ["Does the Pro portfolio swap tool fall outside the publisher exclusion? Is a state notice or exemption needed?"],
    residualProbability: 15, residualImpact: 70, confidence: "Low", verification: ["Legal opinion"], owner: "Legal",
    technical: "partial", authorisationQuestion: true, checks: ["no-suitability-profiling", "no-buy-sell-labels"],
  },
  {
    id: 5, group: "A. Financial regulation", title: "EU Market Abuse Regulation: investment recommendations",
    jurisdiction: "EU (and UK MAR)", law: "Regulation (EU) 596/2014 Art. 3(1)(34)-(35), Art. 20; Delegated Regulation (EU) 2016/958 (objective presentation, disclosure of interests and conflicts)",
    applicability: "Potentially applicable",
    evidence: [
      { ref: "components/report/ReportView.tsx:112-136", note: "verdict() can render BUY / WATCH / AVOID badges, but since PR #214 only when admin or the 'show_verdicts' switch is on (showView = admin || verdicts).", verified: true },
      { ref: "lib/assessments.ts:9-11", note: "verdictsOn() is false unless the setting equals \"1\": labels are hidden from customers by default.", verified: true },
      { ref: "lib/companiesInFocus.ts (view, recommendation, outlook)", note: "Curated research carries a 'view', an outlook -10..+10 and an analyst 'recommendation' per company.", verified: true },
      { ref: "lib/bondReport.ts:199-206", note: "conclusion.analyst = c.recommendation; conclusion.view is passed to the page.", verified: true },
    ],
    probability: 30, impact: 65,
    mitigation: "Keep the labels switched off until counsel decides; if they return, use neutral quantitative wording, disclose interests (affiliate broker links exist), separate facts, estimates and opinion, add authorship and date. Checklist: docs/legal/compliance-review-checklist.md (PR #214).",
    implemented: ["Labels hidden from customers by default (PR #214); regression tests: no new BUY/SELL labels outside the known baseline (ReportView.tsx) and the switch must default to off", "Broker sponsored links labelled 'sponsored' (components/brokers/Pages.tsx:92-100)"],
    awaitingApproval: ["Do not switch the BUY/WATCH/AVOID labels on at /admin/assessments before counsel answers item 1 of docs/legal/compliance-review-checklist.md"],
    legalQuestions: ["Is the issuer report an 'investment recommendation' under MAR Art. 3(1)(34) when it states a view per bond?"],
    residualProbability: 15, residualImpact: 60, confidence: "Medium", verification: ["Automated test", "Legal opinion"], owner: "Product",
    technical: "implemented", authorisationQuestion: false, checks: ["no-buy-sell-labels", "verdicts-default-off", "report-evidence"],
  },
  {
    id: 6, group: "A. Financial regulation", title: "Market manipulation and misleading investment communications",
    jurisdiction: "EU / US / UK", law: "MAR Art. 12 and 15; Securities Exchange Act §10(b) and Rule 10b-5; UK FSMA s.89 / FCA Handbook COBS 4 (fair, clear, not misleading)",
    applicability: "Potentially applicable",
    evidence: [
      { ref: "lib/etfBenchmark.ts:18-23", note: "Benchmark figure 4.46% is provisional, unverified (verified: false), source is 'figure given by the owner'. It drives the landing comparison card.", verified: true },
      { ref: "lib/finderText.ts:12", note: "Tooltip calls the comparison 'illustrative', different instruments, gross.", verified: true },
      { ref: "lib/landingText.ts:57-58", note: "'Same modeled risk: the illustrative AI portfolio returns 1.00 point more per year.'", verified: true },
    ],
    probability: 30, impact: 60,
    mitigation: "Benchmarks and examples need a documented basis, a date and a 'verified' flag before they are published; keep comparisons on equal duration and risk definition; avoid selective best-case examples.",
    implemented: ["Benchmark has date/source/verified fields and a staleness warning (app/admin/benchmark/page.tsx)", "This dashboard warns when the live benchmark is unverified or older than 45 days", "ETF comparison slide hidden from customers until the benchmark is verified; the admin still sees it in yellow (components/Landing.tsx, lib/landingSnapshot.ts verified flag)"],
    awaitingApproval: ["Set `verified: true` in lib/landingSnapshot.ts only after methodology and data-use rights are confirmed"],
    legalQuestions: ["Is an unverified provisional ETF figure acceptable in a public comparison?"],
    residualProbability: 12, residualImpact: 50, confidence: "Medium", verification: ["Automated test", "Document"], owner: "Product",
    technical: "partial", authorisationQuestion: false, checks: ["benchmark-fresh", "marketing-claims"],
  },
  {
    id: 7, group: "A. Financial regulation", title: "Cross-border financial-services regulation",
    jurisdiction: "EU member states, UK, US, other", law: "MiFID II Art. 39/41 (third-country firms); UK FSMA s.21 financial promotion; Italian TUF; Reg. (EU) 2017/1129 not engaged (no offer of securities); state blue-sky laws",
    applicability: "Unresolved",
    evidence: [
      { ref: "app/it, app/fr, app/de, app/[lang]; lib/seo/guidesEn.ts", note: "Localised pages for IT/FR/DE and US/UK English guides: active targeting of several markets.", verified: true },
      { ref: "components/AuthForm.tsx, app/api/auth", note: "No country-of-residence capture or country gating found at sign-up or checkout.", verified: true },
      { ref: "lib/legal.ts", note: "Seller shown as SQUARE ONE OÜ (Estonia). The owner expects a Wyoming LLC: entity not confirmed.", verified: true },
    ],
    probability: 35, impact: 60,
    mitigation: "Confirm the operating entity first, then decide per market: restrict marketing to markets where counsel confirms the model is general information, and add a residence statement/gate for the US and UK if counsel advises.",
    implemented: ["Footer and Terms state that the service is general information only", "Test: legal entity named in the Terms and the footer match lib/legal.ts"],
    awaitingApproval: ["Country-of-residence question or geo-gating at sign-up (adds friction and a new data field)"],
    legalQuestions: ["Which entity (Wyoming LLC or SQUARE ONE OÜ) operates the service, and which regulator's perimeter does each target market create?", "UK: does an impersonal bond screener fall inside the s.21 restriction?"],
    residualProbability: 30, residualImpact: 55, confidence: "Low", verification: ["Legal opinion", "Document"], owner: "Legal",
    technical: "not_started", authorisationQuestion: true, checks: ["entity-consistency"],
  },
  {
    id: 8, group: "A. Financial regulation", title: "Brokerage, portfolio management and execution boundaries",
    jurisdiction: "EU / US", law: "MiFID II Annex I Sect. A(1)-(4) (reception/transmission, execution, portfolio management); Exchange Act §15(a) broker registration",
    applicability: "Not applicable",
    evidence: [
      { ref: "lib/brokers/view.ts:10-17, :57", note: "Broker pages link out to brokers (official or affiliate links); no order entry, routing or custody found in the codebase.", verified: true },
      { ref: "app/api (route inventory)", note: "No endpoint accepts orders or moves client money; Stripe handles only subscription payments.", verified: true },
    ],
    probability: 10, impact: 70,
    mitigation: "Keep it that way: test fails if a new order/trade/execute endpoint appears. Affiliate fees per referral could raise a 'transmission' question; counsel to confirm. Pay-per-click affiliate links are disclosed as sponsored.",
    implemented: ["Route inventory test: a new API route needs a deliberate update", "Test blocks words like 'place order' / 'execute trade' in customer code"],
    awaitingApproval: [],
    legalQuestions: ["Do per-referral affiliate fees from brokers amount to reception/transmission of orders or an inducement issue?"],
    residualProbability: 8, residualImpact: 70, confidence: "Medium", verification: ["Automated test", "Legal opinion"], owner: "Engineering",
    technical: "implemented", authorisationQuestion: false, checks: ["api-route-inventory", "no-execution-features"],
  },
  {
    id: 9, group: "B. Litigation and publishing", title: "Corporate defamation and reputational harm",
    jurisdiction: "UK / EU / US (state law)", law: "UK Defamation Act 2013 ss.1-4; national defamation and unfair-competition laws (IT, FR, DE); US state defamation and trade-libel law; GDPR not relevant to companies",
    applicability: "Potentially applicable",
    evidence: [
      { ref: "lib/companiesInFocus.ts, lib/countriesInFocus.ts, app/risk-assessment", note: "Named issuers and countries carry scores, risks lists and an outlook (e.g. LVMH outlook -2/10).", verified: true },
      { ref: "components/report/ReportView.tsx", note: "Issuer reports state risks and 'weakness' items in plain words.", verified: true },
      { ref: "components/report/ReportCorrection.tsx; app/api/corrections/route.ts; lib/assessments.ts:34-63", note: "Since PR #214 every report page has a 'Request a correction' form; requests are stored (app.correction_requests) and reviewed on /admin/assessments.", verified: true },
      { ref: "lib/assessments.ts:15-25, lib/assessmentModel.ts", note: "Each published assessment is stored with source, date, model version and figures (app.assessment_evidence).", verified: true },
    ],
    probability: 30, impact: 65,
    mitigation: "Separate facts, estimates and opinions; state source dates; give a visible correction contact; keep an audit trail of published score versions; avoid statements about management or solvency that are not sourced.",
    implemented: ["Correction form and evidence log (PR #214)", "Customer report page blanks any dated-market or model figure that lacks its date/basis (lib/legalRisk/evidence.ts, app/report/[isin]/page.tsx)"],
    awaitingApproval: ["Retention period for evidence and correction records (suggested 5 years, owner to confirm)", "Who approves a correction before it is published"],
    legalQuestions: ["Which jurisdictions' defamation law applies to named-issuer scores read by EU and UK users?"],
    residualProbability: 18, residualImpact: 60, confidence: "Medium", verification: ["Automated test", "Legal opinion"], owner: "Product",
    technical: "partial", authorisationQuestion: false, checks: ["report-evidence"],
  },
  {
    id: 10, group: "B. Litigation and publishing", title: "Negligent misstatement and investor reliance",
    jurisdiction: "UK / EU / US", law: "Hedley Byrne v Heller [1964] AC 465 (UK); national tort and consumer law; Unfair Contract Terms rules limit exclusion clauses for consumers",
    applicability: "Potentially applicable",
    evidence: [
      { ref: "lib/terms.ts:23-26, 88, 121", note: "Terms exclude advice and reliance; but exclusion clauses are limited for consumers.", verified: true },
      { ref: "lib/bondReport.ts:65, :99-104", note: "Yields older than 5 days are flagged 'not current' and shown provisional.", verified: true },
      { ref: "lib/finderText.ts:17", note: "Expected-loss method disclosed to users in one sentence.", verified: true },
    ],
    probability: 25, impact: 50,
    mitigation: "Keep freshness flags, show missing data as 'Not verified', never default silently, keep the footer sentence, log the data date shown.",
    implemented: ["Stale-yield handling tested (lib/bondReport.test.ts, lib/legalRisk checks)", "Footer and Disclaimer say gross, indicative, not guaranteed"],
    awaitingApproval: [],
    legalQuestions: ["Are the Terms' reliance exclusions enforceable against EU/UK consumers?"],
    residualProbability: 18, residualImpact: 45, confidence: "Medium", verification: ["Automated test", "Legal opinion"], owner: "Product",
    technical: "implemented", authorisationQuestion: false, checks: ["stale-yield", "report-evidence"],
  },
  {
    id: 11, group: "B. Litigation and publishing", title: "Methodological integrity and misleading credit scores",
    jurisdiction: "EU / US / UK", law: "UCPD Art. 6-7 (misleading actions/omissions); MAR Art. 12; general misrepresentation law; Rule 10b-5",
    applicability: "Potentially applicable",
    evidence: [
      { ref: "lib/ratings.ts:43-49", note: "Today's score is the WORST of S&P, Moody's, Fitch when no own score exists (own score column is empty for all bonds per project memory).", verified: true },
      { ref: "lib/disclaimer.ts:45", note: "Disclaimer says the score is 'built by 10BONDS from public credit information', which understates that it is currently a mapping of third-party grades: a misleading-description risk.", verified: true },
      { ref: "lib/seo/defaultRates.ts:1-5; lib/expectedLoss.ts:1-30", note: "Default rates are the simple average of three agency studies; loss given default is a fixed 60% constant for all bonds; linear interpolation between published horizons.", verified: true },
      { ref: "lib/riskPremium/versions.ts; lib/assessmentModel.ts", note: "Risk premium curves are versioned and immutable once active; issuer research assessments carry MODEL_VERSION '10bonds-research-1.0' and are logged. The per-bond scoring rules (expectedLoss, bondNotch) carried no version stamp before this audit.", verified: true },
    ],
    probability: 55, impact: 60,
    mitigation: "State accurately how the score is built today; version and date every scoring model and store inputs/outputs; disclose fixed assumptions (LGD 60%, averaged default tables); refuse to display scores without a model version.",
    implemented: ["Company and country scores, the Risk assessment menu, report pages and the rating methodology are admin-only (yellow); customers get a plain not-found and see only the finder's neutral risk level", "Model version registry (lib/legalRisk/modelVersions.ts, reusing MODEL_VERSION from PR #214) + test that every scoring module has a version and that changed inputs force a version bump", "Default-rate table sanity test (monotonic by notch and horizon)", "Risk-score disclaimer reworded in EN/IT/FR/DE: says the score is derived from public credit information including third-party assessments and converted to the 10BONDS scale (no agency names)"],
    awaitingApproval: ["Per-bond stored score version, inputs and timestamp (database change)"],
    legalQuestions: ["Is 'built by 10BONDS from public credit information' accurate enough while the score derives from third-party grades?", "Does the 1-10 risk level shown in the finder count as a credit rating under the CRA Regulation?", "Does the Terms liability cap and the wording 'must not be used for investment decisions' hold up against consumers (UCPD, unfair terms)?", "Is the independence assumption in the probability of at least one issuer default (P = 1 - product of (1 - PD)) adequately disclosed?", "Pro: does replacing bonds in an uploaded client portfolio come close to MiFID II advice (ESMA 2023 Practical Case 4)?"],
    residualProbability: 25, residualImpact: 50, confidence: "Medium", verification: ["Automated test", "Document"], owner: "Engineering",
    technical: "partial", authorisationQuestion: false, checks: ["model-versions", "default-rates-sane"],
  },
  {
    id: 12, group: "B. Litigation and publishing", title: "Conflicts of interest and undisclosed incentives",
    jurisdiction: "EU / UK / US", law: "MAR Art. 20 and Delegated Reg. 2016/958 Art. 5-6; UCPD Annex I point 11 (paid advertising); FTC Endorsement Guides 16 CFR 255",
    applicability: "Potentially applicable",
    evidence: [
      { ref: "lib/brokers/view.ts:12-17, :57; docs/BROKERS.md:37", note: "Affiliate links exist, used only for an active signed agreement, with rel=sponsored.", verified: true },
      { ref: "components/brokers/Pages.tsx:92-100, :169", note: "A 'sponsored' block is shown, and a note when there is no affiliate.", verified: true },
      { ref: "(not in code)", note: "Owner or team holdings in the bonds shown, issuer sponsorships and referral fees from other sources cannot be checked from code.", verified: false },
    ],
    probability: 15, impact: 40,
    mitigation: "Keep sponsored labelling; add a short conflicts statement (no issuer pays for scores; owner's holdings policy) once facts are confirmed.",
    implemented: ["Affiliate links only with active agreement and 'sponsored' labelling"],
    awaitingApproval: ["Conflicts statement text (needs the owner to confirm holdings and referral facts)"],
    legalQuestions: [],
    residualProbability: 10, residualImpact: 35, confidence: "Low", verification: ["Document"], owner: "Operations",
    technical: "partial", authorisationQuestion: false, checks: [],
  },
  {
    id: 13, group: "C. Intellectual property and data", title: "Financial market-data licensing",
    jurisdiction: "EU / US / UK", law: "Contract (vendor/exchange licence terms); Directive 96/9/EC sui generis database right; copyright",
    applicability: "Unresolved",
    evidence: [
      { ref: "docs/OPERATIONS.md:21", note: "Bond data is a read-only copy filled nightly by the separate 'LM op model' project; the upstream vendor is not documented in this repository.", verified: true },
      { ref: "lib/bondReport.ts:103-104", note: "Report labels yields 'Exchange / broker data' (hidden from customers by hideSources, kept for admins): suggests an exchange/broker origin.", verified: true },
      { ref: "lib/ytmHistory.ts", note: "A daily yield history is kept (first audit: 120 days) and weekly ranges; price drops page is admin-only because 52w min/max are supplier-sensitive (project memory).", verified: true },
      { ref: "/mnt/project-files/legal-audit/data-legal-risk.md rows 1, 9, 10, 15", note: "First audit already flagged the unknown source as the top open item.", verified: true },
    ],
    probability: 60, impact: 70,
    mitigation: "Document the source and licence of every field in the nightly copy; get written confirmation that commercial display and derived-data use are allowed; otherwise change source or fields. Do not rely on hiding the supplier's name.",
    implemented: ["Customer view hides data sources, observation dates and quote tables (PRs #210/#211)", "Test: only allowlisted external hosts may be called from the code (lib/legalRisk/sourceChecks.test.ts)", "Data source inventory published on this dashboard", "Licensing and cross-border checklist for counsel (docs/legal/licensing-cross-border-checklist.md, PR #214)"],
    awaitingApproval: ["Remove or round fields whose licence cannot be confirmed (change to the product)"],
    legalQuestions: ["Does the licence behind the LM op model data permit public, paid redistribution and derived scores?"],
    residualProbability: 40, residualImpact: 65, confidence: "Low", verification: ["Document", "Legal opinion", "Automated test"], owner: "Operations",
    technical: "partial", authorisationQuestion: false, checks: ["external-hosts", "data-source-inventory"],
  },
  {
    id: 14, group: "C. Intellectual property and data", title: "Credit rating agency intellectual property",
    jurisdiction: "US / EU / UK", law: "Agency subscription/licence terms; copyright; EU database right; trade-mark law (agency names and symbols)",
    applicability: "Potentially applicable",
    evidence: [
      { ref: "lib/ratings.ts:17-49", note: "rating_sp / rating_moodys / rating_fitch letters are read from the data copy and mapped into the 1-10 score (worst of three).", verified: true },
      { ref: "lib/seo/defaultRates.ts:1-4", note: "Default table is an average of the three agencies' studies (numbers only; names not published).", verified: true },
      { ref: "lib/seo/guidesEn.ts:105-123", note: "Educational guides name S&P, Moody's, Fitch to explain rating scales.", verified: true },
      { ref: "lib/api and components (sp prop)", note: "Admin sees the S&P grade next to the score; customers do not.", verified: true },
    ],
    probability: 50, impact: 60,
    mitigation: "Move the score to the own LR methodology; stop copying raw agency letters into the public database; no agency symbols on customer pages. Removing logos or attribution does not cure a licence breach.",
    implemented: ["Agency grades never sent to customers (PR #71 and later)", "Test: customer-facing copy does not name rating agencies except in the knowledge guides baseline"],
    awaitingApproval: ["Retire the agency fallback once the LR column is filled", "Export only the 1-10 score from the data project, not the letters"],
    legalQuestions: ["Does a 1-10 mapping of agency grades count as a derived work needing a licence?"],
    residualProbability: 30, residualImpact: 55, confidence: "Medium", verification: ["Legal opinion", "Document", "Automated test"], owner: "Legal",
    technical: "partial", authorisationQuestion: false, checks: ["no-rating-agency-claims", "agency-names-baseline"],
  },
  {
    id: 15, group: "C. Intellectual property and data", title: "Copyright, trademarks and database rights",
    jurisdiction: "EU / US / UK", law: "Directive 96/9/EC Art. 7 (extraction/re-utilisation); Directive 2001/29/EC; trade-mark law; CUSIP Global Services licence for US-prefixed ISINs",
    applicability: "Potentially applicable",
    evidence: [
      { ref: "app/bonds/[isin], app/sitemap.ts", note: "A public page per bond (~17,000) with facts and scores, indexed for search.", verified: true },
      { ref: "lib/xlsx.ts, lib/tiers.ts", note: "Excel export of the top 10 (ISIN, return, risk) for paid users.", verified: true },
      { ref: "lib/seo/knowledgeEn.ts, lib/seo/guides*.ts", note: "Guides are written in-house; no third-party report reproductions found in the files read.", verified: false },
    ],
    probability: 30, impact: 45,
    mitigation: "Keep per-bond pages to facts plus own calculations, avoid bulk export of a substantial part of the database, license CUSIP use for US ISINs or hide them.",
    implemented: ["Copy guard against scraping (components/CopyGuard.tsx)", "ISINs only for paid plans (lib/tiers.ts)"],
    awaitingApproval: ["Hide ISINs with US prefix until a CUSIP licence exists"],
    legalQuestions: ["Does the per-ISIN public page set re-utilise a substantial part of a protected database?"],
    residualProbability: 22, residualImpact: 40, confidence: "Low", verification: ["Document", "Legal opinion"], owner: "Legal",
    technical: "partial", authorisationQuestion: false, checks: ["external-hosts"],
  },
  {
    id: 16, group: "D. Consumer and platform compliance", title: "Consumer protection and advertising",
    jurisdiction: "EU / UK / US", law: "Directive 2005/29/EC (UCPD) Art. 6-7 and Annex I; UK CPUTR/DMCC Act 2024; FTC Act §5; national advertising codes",
    applicability: "Applicable",
    evidence: [
      { ref: "lib/landingText.ts:31-34", note: "Kicker 'AI portfolio · Pareto-efficient', headline 'Higher return. Lower risk.'", verified: true },
      { ref: "lib/landingText.ts:39, :51, :57-58", note: "'AI-optimized', 'comparable modeled capital-loss risk', 'Same modeled risk: ... returns 1.00 point more per year.'", verified: true },
      { ref: "lib/etfBenchmark.ts:18-23; lib/finderText.ts:12", note: "ETF comparison rests on a provisional, unverified, unnamed benchmark; fund vs single bonds; fees line.", verified: true },
      { ref: "memory landing-no-disclaimers", note: "By owner decision the landing carries no caveat text; qualifications live on /disclaimer, away from the claim.", verified: true },
    ],
    probability: 50, impact: 55,
    mitigation: "Substantiate and qualify: keep the claim only with its qualifier in view ('modeled', 'gross', date, same duration); consider 'higher modeled return at similar modeled risk'; verify the benchmark; justify the term 'AI' or replace it with 'algorithmic'.",
    implemented: ["Banned-phrase test (guaranteed, risk-free, 'no fees', 'best bonds' in customer UI)", "Footer states returns are gross and not guaranteed", "Benchmark fields: value, date, verified flag", "Landing headline qualified in EN/IT/FR/DE ('Higher modeled return. Same modeled risk.'); 'Pareto-efficient', 'AI-optimized' and 'AI portfolio' replaced by plain wording on the landing, finder intro and disclaimer; test bans them", "ETF comparison hidden from customers until verified"],
    awaitingApproval: ["Reverse the 'no disclaimer text on the landing' rule only if counsel wants a visible qualifier beside the comparison"],
    legalQuestions: ["Is an unqualified headline plus a link to /disclaimer enough under UCPD Art. 7 (clear, timely information)?"],
    residualProbability: 20, residualImpact: 45, confidence: "Medium", verification: ["Automated test", "Legal opinion"], owner: "Product",
    technical: "implemented", authorisationQuestion: false, checks: ["marketing-claims", "benchmark-fresh", "comparative-headline"],
  },
  {
    id: 17, group: "D. Consumer and platform compliance", title: "Subscription, billing and cancellation",
    jurisdiction: "EU / UK / US", law: "Consumer Rights Directive 2011/83/EU Art. 6, 8(8), 16(m) and withdrawal function (Directive (EU) 2023/2673); Digital Content Directive 2019/770; US state automatic-renewal laws (e.g. Cal. Bus. & Prof. Code §17600 ff.)",
    applicability: "Applicable",
    evidence: [
      { ref: "lib/terms.ts:88", note: "Prices (€9, €19, €89 per month; yearly 20% off), VAT, 'until you cancel', cancel on profile page, end of period, 14-day withdrawal rule.", verified: true },
      { ref: "components/PlanButton.tsx:36", note: "Pre-payment checkbox: start straight away and pay for days used if withdrawing in 14 days.", verified: true },
      { ref: "app/api/billing/cancel, change, portal", note: "Self-service cancel, change and Stripe portal endpoints exist.", verified: true },
      { ref: "(not in code)", note: "Renewal reminder emails and the in-flow cancel button wording under the 2023/2673 rule were not verified.", verified: false },
    ],
    probability: 25, impact: 40,
    mitigation: "Keep price, renewal and cancellation terms visible before payment; confirm a one-click cancellation function and a confirmation email; check US state renewal notice rules.",
    implemented: ["Regression test: Terms keep the three prices, renewal wording, cancellation and withdrawal text; PlanButton keeps the withdrawal checkbox"],
    awaitingApproval: ["Add a visible 'Cancel contract' control near checkout as well as on /account if counsel says the 2026 EU rule needs it"],
    legalQuestions: ["Does the cancellation flow meet the EU withdrawal-function rule applying from 19 June 2026?"],
    residualProbability: 15, residualImpact: 35, confidence: "Medium", verification: ["Automated test", "Legal opinion"], owner: "Product",
    technical: "implemented", authorisationQuestion: false, checks: ["subscription-disclosures", "subscription-ui"],
  },
  {
    id: 18, group: "D. Consumer and platform compliance", title: "Privacy and data protection",
    jurisdiction: "EU / UK / US states", law: "GDPR (EU) 2016/679 Art. 5, 6, 13, 27, 28, 44 ff.; ePrivacy Directive Art. 5(3); UK GDPR; California CCPA/CPRA",
    applicability: "Applicable",
    evidence: [
      { ref: "lib/track.ts:5-49", note: "Statistics run only after consent (tb_cookie_consent); IP not stored with statistics.", verified: true },
      { ref: "app/privacy/page.tsx:51-103; lib/terms.ts:121", note: "Privacy page lists processors (Fly.io, Neon, Stripe...), retention 13 months for statistics, data rights.", verified: true },
      { ref: "lib/legal.ts", note: "Controller is SQUARE ONE OÜ with the Estonian authority; if a Wyoming LLC is the real operator, the controller, Art. 27 representative and transfers change.", verified: true },
      { ref: "PR #69 (open draft)", note: "Data-processing-terms links and e-mail masking in logs are in an unmerged PR from 19 Oct.", verified: true },
    ],
    probability: 25, impact: 50,
    mitigation: "Resolve the controller identity; merge or redo PR #69; document transfers (SCCs / Data Privacy Framework) per processor; US state privacy notice if thresholds are met.",
    implemented: ["Consent-gated statistics, no marketing cookies, no IP stored", "Pro portfolio uploads not stored or logged (app/api/pro/replace/route.ts:11)"],
    awaitingApproval: ["Merge PR #69 (stale, needs a rebase review)", "Appoint an EU representative if the operator is outside the EU"],
    legalQuestions: ["Who is the controller? Are transfers to US processors covered?"],
    residualProbability: 15, residualImpact: 45, confidence: "Medium", verification: ["Document", "Legal opinion"], owner: "Legal",
    technical: "partial", authorisationQuestion: false, checks: ["entity-consistency"],
  },
  {
    id: 19, group: "D. Consumer and platform compliance", title: "AI governance and automated decision-making",
    jurisdiction: "EU / US", law: "Regulation (EU) 2024/1689 (AI Act) Art. 5, 50, Annex III; GDPR Art. 22; UCPD (AI claims); SEC enforcement on AI-washing (adviser context)",
    applicability: "Unresolved",
    evidence: [
      { ref: "lib/gptRatings.ts:1-20; lib/gptStore.ts", note: "GPT is used only by the admin: ISINs are copied into GPT and ratings pasted back, shown in an admin column, 'never sent to customers'.", verified: true },
      { ref: "lib/highsSolver.ts, lib/monteCarlo.ts", note: "Portfolio optimisation is a MILP solver and Monte Carlo simulation, not a trained model.", verified: true },
      { ref: "lib/landingText.ts:16-17, :39", note: "Customer copy calls the result 'AI-selected' / 'AI-optimized': the label may overstate or mislabel the technique.", verified: true },
      { ref: "(not in code)", note: "Whether the curated issuer research text was drafted with an LLM is not recorded in the repository.", verified: false },
    ],
    probability: 15, impact: 40,
    mitigation: "Keep LLM output admin-only and separate from numeric scores; record when research text is AI-assisted and human-reviewed; align 'AI' marketing with the real technique. Scoring legal entities is not Annex III credit scoring of natural persons, but counsel should confirm.",
    implemented: ["Test: no LLM/GPT calls in customer routes or customer text (guards separation)", "GPT ratings are admin-only and not used in any score", "'AI' wording replaced by 'model' in landing and disclaimer copy; the techniques named are the ones actually used (optimization, Monte Carlo)"],
    awaitingApproval: [],
    legalQuestions: ["Does any part of the product fall under AI Act Art. 50 transparency or Annex III?"],
    residualProbability: 6, residualImpact: 30, confidence: "Low", verification: ["Automated test", "Legal opinion"], owner: "Engineering",
    technical: "partial", authorisationQuestion: false, checks: ["llm-separation"],
  },
  {
    id: 20, group: "D. Consumer and platform compliance", title: "Tax, yield and financial disclosure accuracy",
    jurisdiction: "EU / US", law: "UCPD Art. 7 (material information); PRIIPs/MiFID cost-disclosure principles (analogy); FTC Act §5; national tax rules for withholding",
    applicability: "Potentially applicable",
    evidence: [
      { ref: "lib/bondReport.ts:99-104, :123", note: "Return shown with date and status; net return only when the 0% withholding tax is verified, otherwise 'Not verified'.", verified: true },
      { ref: "lib/bondReport.ts:157", note: "Call rights show 'Callable: call dates and prices not verified'. YTM (not yield-to-worst) is the figure used.", verified: true },
      { ref: "lib/disclaimer.ts:53", note: "Returns gross, before taxes and trading costs, indicative, not guaranteed.", verified: true },
      { ref: "PR #210 (taxation hidden from customers)", note: "Tax content is admin-only now; customers see gross figures only.", verified: true },
    ],
    probability: 40, impact: 45,
    mitigation: "Keep 'gross' next to every return; label yield-to-maturity vs yield-to-worst for callable bonds; keep accrued interest and executable-price caveats; never show net return without verified tax assumptions.",
    implemented: ["Tests: net return stays 'Not verified' unless tax is verified; stale yield is never shown as current; footer says gross"],
    awaitingApproval: ["Show yield-to-worst for callable bonds (needs data from the data project)"],
    legalQuestions: [],
    residualProbability: 30, residualImpact: 40, confidence: "Medium", verification: ["Automated test", "Document"], owner: "Engineering",
    technical: "partial", authorisationQuestion: false, checks: ["net-return-tax", "stale-yield", "report-evidence"],
  },
];

export const GROUPS = [...new Set(CRITERIA.map((c) => c.group))];

/** Summary numbers for the dashboard header. */
export function summarise(list: Criterion[] = CRITERIA) {
  const n = list.length;
  const avg = (f: (c: Criterion) => number) => Math.round(list.reduce((s, c) => s + f(c), 0) / n);
  const ranked = [...list].sort((a, b) => initialRisk(b) - initialRisk(a) || residualRisk(b) - residualRisk(a));
  return {
    initialAverage: avg(initialRisk),
    residualAverage: avg(residualRisk),
    highestInitial: initialRisk(ranked[0]),
    // Items that could need an authorisation or licence, or are unresolved and sizeable: shown regardless of score.
    critical: list.filter((c) => c.authorisationQuestion || (c.applicability === "Unresolved" && residualRisk(c) >= 20)),
    ranked,
  };
}
