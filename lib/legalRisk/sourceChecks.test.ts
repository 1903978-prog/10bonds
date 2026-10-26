import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanClaims } from "./checks";

// Source-tree regression checks for the legal-risk safeguards (see lib/legalRisk/register.ts). They look for known-bad
// patterns in customer-facing code. A pass means "none found", never "legally compliant". Known existing hits are
// listed as BASELINE with a reason: a new hit anywhere else fails the release; remove a baseline entry once fixed.

const ROOT = path.resolve(__dirname, "../..");
const walk = (dir: string, out: string[] = []): string[] => {
  for (const n of readdirSync(path.join(ROOT, dir))) {
    const rel = `${dir}/${n}`;
    const st = statSync(path.join(ROOT, rel));
    if (st.isDirectory()) { if (n !== "node_modules" && n !== ".next") walk(rel, out); } else out.push(rel);
  }
  return out;
};
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
/** Source without // and /* comments, so notes to developers do not count as customer copy. */
const code = (rel: string) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\s\/\/ .*$/gm, "");

const ADMIN = /Admin|\/admin\/|\.test\.|Gpt/;
const customerFiles = (): string[] => [
  ...walk("components").filter((f) => f.endsWith(".tsx")),
  ...walk("app").filter((f) => f.endsWith(".tsx")),
  ...walk("lib").filter((f) => /(Text|disclaimer|terms|legal)[A-Za-z]*\.ts$/.test(f) || f.startsWith("lib/seo/guides") || f.startsWith("lib/seo/knowledge")),
].filter((f) => !ADMIN.test(f));

const hits = (re: RegExp, files = customerFiles()) => files.filter((f) => re.test(code(f)));

describe("no recommendation labels", () => {
  // components/report/ReportView.tsx shows BUY / WATCH / AVOID; the thread "Reduce legal exposure of issuer reports" removes them.
  const BASELINE = ["components/report/ReportView.tsx"];
  it("no BUY / SELL / AVOID labels outside the known baseline", () => {
    const found = hits(/\b(STRONG BUY|BUY|SELL|AVOID|OUTPERFORM|UNDERPERFORM)\b|word: "(BUY|SELL|AVOID)"/);
    expect(found.filter((f) => !BASELINE.includes(f))).toEqual([]);
  });
});

describe("marketing claims", () => {
  // finderText.ts is a client-side module, so it is scanned as text here instead of being imported.
  it("finder, intro and newsletter copy has no banned safety, return or recommendation claims", () => {
    const files = ["lib/finderText.ts", "lib/introText.ts", "lib/newsletterText.ts", "lib/dropsText.ts"].filter((f) => { try { read(f); return true; } catch { return false; } });
    expect(files.length).toBeGreaterThan(0);
    expect(files.flatMap((f) => scanClaims([code(f)]).map((h) => `${f}: ${h}`))).toEqual([]);
  });
});

describe("verdict labels default off", () => {
  it("verdictsOn() is true only when the setting is exactly \"1\", and the report shows labels only to admin or when on", () => {
    expect(/return \(await getSetting\(KEY\)\.catch\(\(\) => null\)\) === "1"/.test(read("lib/assessments.ts"))).toBe(true);
    expect(/showView = admin \|\| verdicts/.test(read("components/report/ReportView.tsx"))).toBe(true);
  });
});

describe("no investor profiling", () => {
  it("customer code does not ask about risk tolerance, objectives, income or net worth", () => {
    const re = /risk tolerance|risk appetite|investment objectives?|investment experience|annual income|net worth|marital status/i;
    // The privacy page lists these as things we do NOT collect; Terms/Disclaimer deny any suitability assessment.
    const found = hits(re).filter((f) => !/app\/privacy\/page\.tsx|lib\/terms\.ts|lib\/disclaimer\.ts|lib\/seo\//.test(f));
    expect(found).toEqual([]);
  });
  it("sign-up and Pro request forms collect no profiling fields", () => {
    for (const f of ["components/AuthForm.tsx", "components/ProRequestForm.tsx"]) {
      expect(/name="(age|income|netWorth|riskProfile|riskTolerance|objective|experience)"/i.test(read(f)), f).toBe(false);
    }
  });
});

describe("no execution features", () => {
  it("customer code has no order or trade execution wording", () => {
    expect(hits(/\b(place (an |your )?order|execute (a |the )?trade|trade now|buy now|sell now)\b/i)).toEqual([]);
  });
  it("API routes: no new endpoint that looks like advice, orders or recommendations", () => {
    const routes = walk("app/api").filter((f) => f.endsWith("route.ts")).map((f) => f.replace("app/api/", "").replace("/route.ts", ""));
    const bad = routes.filter((r) => /order|trade|execut|advice|advis|recommend|suitab|signal/i.test(r));
    expect(bad).toEqual([]);
  });
});

describe("data feeds", () => {
  // Hosts the code may call. A new host needs a licence/terms check (criterion 13) before it is added here.
  const ALLOWED = new Set([
    "api.resend.com", "api.indexnow.org", "www.linkedin.com", "api.linkedin.com", "oauth2.googleapis.com", "www.googleapis.com",
    "api.stripe.com", "www.bing.com", "x",
    // admin-only rating calculator (lib/llmProvider.ts); provisional output, never customer-facing
    "api.openai.com", "api.anthropic.com", "generativelanguage.googleapis.com",
  ]);
  it("fetch() calls go only to allowlisted hosts", () => {
    const files = [...walk("lib"), ...walk("app")].filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f));
    const unknown: string[] = [];
    for (const f of files) {
      for (const m of code(f).matchAll(/fetch\(\s*[`"']https?:\/\/([a-z0-9.-]+)/gi)) if (!ALLOWED.has(m[1].toLowerCase())) unknown.push(`${f}: ${m[1]}`);
    }
    expect(unknown).toEqual([]);
  });
});

describe("rating agencies", () => {
  // Admin-gated displays of the S&P grade; customers never receive them (server strips the field).
  const BASELINE = ["components/WhyTable.tsx", "components/Finder.tsx", "components/RiskBadge.tsx", "components/seo/Seo.tsx"];
  it("agency names appear in customer-facing code only where already known", () => {
    const files = customerFiles().filter((f) => !f.startsWith("lib/seo/"));
    const found = hits(/S&P|S&amp;P|Moody|Fitch Ratings|\bFitch\b/, files);
    expect(found.filter((f) => !BASELINE.includes(f))).toEqual([]);
  });
});

describe("LLM separation", () => {
  const ALLOWED_IMPORTERS = ["components/GptRate.tsx", "components/GptCalcAll.tsx", "components/GptCalcPopup.tsx", "components/Finder.tsx", "app/api/admin/gpt-ratings/route.ts", "app/api/admin/gpt-calc/route.ts", "app/api/admin/skills/route.ts", "app/admin/skills/page.tsx", "lib/gptRatingsDb.ts", "lib/bondImportDb.ts", "lib/gptStore.ts", "lib/gptRatings.test.ts"];
  it("GPT helper modules are imported only by admin code", () => {
    const files = [...walk("components"), ...walk("app"), ...walk("lib")].filter((f) => /\.tsx?$/.test(f) && !f.startsWith("lib/legalRisk/"));
    const found = files.filter((f) => /from "(@\/lib|\.\/|\.\.\/lib\/|\.\.\/)(lib\/)?(gptRatings|gptStore|gptRatingsDb)"/.test(read(f)) || /from "\.\/(gptRatings|gptStore|gptRatingsDb)"/.test(read(f)));
    expect(found.filter((f) => !ALLOWED_IMPORTERS.includes(f))).toEqual([]);
  });
  it("the only LLM API call is the admin-only provider module, used by one admin route", () => {
    const users = [...walk("lib"), ...walk("app"), ...walk("components")].filter((f) => /\.tsx?$/.test(f) && /llmProvider/.test(read(f)) && f !== "lib/llmProvider.ts" && !/\.test\./.test(f));
    expect(users).toEqual(["app/api/admin/gpt-calc/route.ts"]);
    expect(read("app/api/admin/gpt-calc/route.ts")).toMatch(/Not found[\s\S]*404/);
  });
  it("no LLM vendor SDK or API call in the app", () => {
    const files = [...walk("lib"), ...walk("app"), ...walk("components")].filter((f) => /\.tsx?$/.test(f) && !f.startsWith("lib/legalRisk/") && !/\.test\./.test(f) && f !== "lib/llmProvider.ts");
    const found = files.filter((f) => /api\.openai\.com|generativelanguage\.googleapis|api\.anthropic\.com|from "openai"|from "@anthropic-ai/.test(read(f)));
    expect(found).toEqual([]);
  });
});

describe("subscription UI", () => {
  it("checkout keeps the express-start / withdrawal acknowledgement", () => {
    expect(/withdraw within 14 days/i.test(read("components/PlanButton.tsx"))).toBe(true);
  });
  it("cancellation endpoint exists", () => {
    expect(statSync(path.join(ROOT, "app/api/billing/cancel/route.ts")).isFile()).toBe(true);
  });
});

describe("scores are admin-only", () => {
  it("risk assessment, report and rating methodology pages are gated to the admin", () => {
    expect(read("app/risk-assessment/layout.tsx")).toContain("requireAdmin()");
    expect(read("app/report/[isin]/layout.tsx")).toContain("requireAdmin()");
    expect(read("app/methodology/page.tsx")).toContain("requireAdmin(");
  });
  it("customers get no menu link, sitemap entry or landing slide for them", () => {
    expect(read("app/layout.tsx")).toMatch(/admin && <Link href="\/risk-assessment"/);
    const sitemap = read("app/sitemap.ts");
    expect(sitemap).not.toContain('"/risk-assessment');
    expect(sitemap).not.toContain('"/methodology"');
    expect(read("components/Landing.tsx")).not.toContain("<CountrySlide");
    expect(read("components/FooterNote.tsx")).not.toContain('"/methodology"');
  });
});
