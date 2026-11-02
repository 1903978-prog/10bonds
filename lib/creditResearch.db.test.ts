import { describe, expect, it } from "vitest";
import { RISK_KEYS, type ResearchFacts } from "./creditScoring";

// Runs only against an empty test Postgres: TEST_ACCOUNTS_DATABASE_URL=postgres://... npm test
const url = process.env.TEST_ACCOUNTS_DATABASE_URL;
const A = "DE000AAR0504", B = "XS2463990775", C = "FR001401AQN6";
const facts = (isin: string): ResearchFacts => ({
  isin, issuerType: "bank", seniority: "senior_non_preferred", guaranteed: null,
  agencyRatings: [{ agency: "Fitch", rating: "A-", scope: "issuer", date: null }], metrics: { cet1Pct: 16 },
  risks: RISK_KEYS.map((key) => ({ key, color: "GREEN" as const, explanation: "ok", evidence: ["https://a.example/x"], verifiedOn: null })),
  conflicts: [], evidence: [{ url: "https://a.example/x", title: "t", publisher: "p", publishedAt: null, period: null, retrievedAt: "2026-11-01T00:00:00Z", location: null, method: "t", verification: "verified", primary: true }, { url: "https://b.example/y", title: "t", publisher: "p", publishedAt: null, period: null, retrievedAt: "2026-11-01T00:00:00Z", location: null, method: "t", verification: "verified", primary: true }],
});

describe.skipIf(!url)("credit research queue (real Postgres)", () => {
  it("queues a Top 10 once, claims by priority, publishes IR/BR atomically, and recovers", async () => {
    const { default: postgres } = await import("postgres");
    const admin = postgres(url!, { onnotice: () => {} });
    await admin`create schema if not exists app`;
    await admin.end();
    process.env.ACCOUNTS_DATABASE_URL = url;
    const db = await import("./creditResearchDb");
    const { accountsSql } = await import("./accounts");
    const s = await accountsSql();

    // A: a fresh stored assessment (never queued); B, C: nothing stored.
    await db.enqueueIsins([A], false, 0); // forces the tables (and bond_credit_analysis) into existence
    await s`delete from app.credit_research_jobs`;
    await s`delete from app.bond_credit_analysis where isin in (${B}, ${C})`;
    await s`insert into app.bond_credit_analysis (isin, issuer_rating_min, issuer_rating_max, bond_rating_min, bond_rating_max, rating_assessment_date, rating_verification_status) values (${A}, 66, 79, 60, 70, current_date, 'provisional') on conflict (isin) do nothing`;

    await db.enqueueIsins([A, B, C], false);
    await db.enqueueIsins([B, C], true); // the same bonds again, now from an account: no duplicates, priority/exposure updated
    const jobs = await s<{ isin: string; priority: number; account_exposed: boolean; exposure_count: number }[]>`select isin, priority, account_exposed, exposure_count from app.credit_research_jobs order by isin`;
    expect(jobs.map((j) => j.isin)).toEqual([C, B]);           // A has a current assessment: not queued
    expect(jobs.every((j) => j.priority === 0 && j.account_exposed)).toBe(true);
    expect(jobs.every((j) => j.exposure_count === 1)).toBe(true); // no refresh spam: one exposure per 10 minutes

    const token = await db.createWorkerToken("test");
    expect(await db.tokenValid(`Bearer ${token}`)).toBe(true);
    expect(await db.tokenValid("Bearer crw_" + "0".repeat(64))).toBe(false);

    const j1 = await db.claimJob("w1");
    const j2 = await db.claimJob("w2");
    expect(new Set([j1?.isin, j2?.isin])).toEqual(new Set([B, C])); // two workers never get the same job
    expect(await db.claimJob("w3")).toBeNull();

    // completion by a worker that does not hold the lease is refused
    expect((await db.completeJob("w2", facts(j1!.isin), { model: "m", ms: 1, tokensIn: 1, tokensOut: 1 })).ok).toBe(false);
    const done = await db.completeJob("w1", facts(j1!.isin), { model: "m", ms: 1000, tokensIn: 10, tokensOut: 5 });
    expect(done.ok).toBe(true);
    const again = await db.completeJob("w1", facts(j1!.isin), { model: "m", ms: 1000, tokensIn: 10, tokensOut: 5 });
    expect(again.ok && again.duplicate).toBe(true);               // a retry of the same result writes nothing twice
    const pub = await db.publicRatings([j1!.isin, j2!.isin]);
    // the job is done and the numbers are stored, but they do not pass the publication gate, so the public function returns nothing
    expect(pub.ratings[j1!.isin]).toBeUndefined();
    const [stored] = await s<{ issuer_rating_min: string | null }[]>`select issuer_rating_min from app.bond_credit_analysis where isin = ${j1!.isin}`;
    expect(stored.issuer_rating_min).not.toBeNull();
    expect(pub.pending).toEqual([j2!.isin]);

    // an expired lease (worker died) hands the job out again
    await s`update app.credit_research_jobs set lease_until = now() - interval '1 minute' where isin = ${j2!.isin}`;
    expect((await db.claimJob("w3"))?.isin).toBe(j2!.isin);
    // a failure waits before the next try, then the job is available again
    expect(await db.failJob("w3", j2!.isin, "timeout")).toBe(true);
    expect(await db.claimJob("w3")).toBeNull();
    await s`update app.credit_research_jobs set next_attempt_at = now() where isin = ${j2!.isin}`;
    expect((await db.claimJob("w3"))?.isin).toBe(j2!.isin);

    // re-publishing keeps the earlier version in the history and the ranking columns untouched
    await s`update app.bond_credit_analysis set effective_grade = 'BBB' where isin = ${j1!.isin}`;
    await db.enqueueIsins([j1!.isin], true, 0);
    const j3 = await db.claimJob("w1");
    expect(j3?.isin).toBe(j1!.isin);
    await db.completeJob("w1", { ...facts(j1!.isin), seniority: "tier2" }, { model: "m", ms: 1, tokensIn: 1, tokensOut: 1 });
    const [{ n }] = await s<{ n: string }[]>`select count(*) n from app.bond_credit_analysis_history where isin = ${j1!.isin}`;
    expect(Number(n)).toBeGreaterThanOrEqual(1);
    const [row] = await s<{ effective_grade: string }[]>`select effective_grade from app.bond_credit_analysis where isin = ${j1!.isin}`;
    expect(row.effective_grade).toBe("BBB");
    const ov = await db.overview();
    const orow = ov.recent.find((r) => r.isin === j1!.isin) as unknown as { sources: number | null; coverage: string | null } | undefined;
    expect(orow?.sources).toBe(2);
    expect(Number(orow?.coverage)).toBeGreaterThan(0);
  }, 60_000);

  it("flags two different bonds that end up with identical IR/BR ranges", async () => {
    process.env.ACCOUNTS_DATABASE_URL = url;
    const db = await import("./creditResearchDb");
    const { scoreResearch } = await import("./creditScoring");
    const { accountsSql } = await import("./accounts");
    const s = await accountsSql();
    const X = "XS0000000001", Y = "XS0000000002";
    const sc = scoreResearch(facts(X));
    await s`delete from app.bond_credit_analysis where isin in (${X}, ${Y})`;
    await s`delete from app.credit_research_jobs where isin in (${X}, ${Y})`;
    await s`insert into app.bond_credit_analysis (isin, issuer_rating_min, issuer_rating_max, bond_rating_min, bond_rating_max, rating_assessment_date, rating_verification_status) values (${Y}, ${sc.irMin}, ${sc.irMax}, ${sc.brMin}, ${sc.brMax}, current_date, 'provisional')`;
    await db.enqueueIsins([X], true, 0);
    const j = await db.claimJob("wx");
    expect(j?.isin).toBe(X);
    const r = await db.completeJob("wx", facts(X), { model: "m", ms: 1, tokensIn: 1, tokensOut: 1 });
    expect(r.ok && r.status).toBe("review_required");
    const [other] = await s<{ rating_verification_status: string }[]>`select rating_verification_status from app.bond_credit_analysis where isin = ${Y}`;
    expect(other.rating_verification_status).toBe("review_required");
    const ov = await db.overview();
    const row = ov.recent.find((x) => x.isin === X) as unknown as { same_as: string[]; parameters: { found: number; max: number } };
    expect(row.same_as).toContain(Y);
    expect(row.parameters.max).toBeGreaterThan(5);
    await s`delete from app.bond_credit_analysis where isin in (${X}, ${Y})`;
  }, 60_000);

  it("the database and the public API never show an unpublished rating; a validated one survives a failed refresh", async () => {
    process.env.ACCOUNTS_DATABASE_URL = url;
    const db = await import("./creditResearchDb");
    const { accountsSql } = await import("./accounts");
    const s = await accountsSql();
    const P = "XS0000000010";
    await s`delete from app.bond_credit_analysis where isin = ${P}`;
    await s`delete from app.credit_research_jobs where isin = ${P}`;
    // 15. even a row written with the publish flags on is forced off by the database, and the public function returns nothing
    await s`insert into app.bond_credit_analysis (isin, issuer_rating_min, issuer_rating_max, bond_rating_min, bond_rating_max, rating_assessment_date, rating_verification_status, publish_ir, publish_br) values (${P}, 70, 80, 70, 80, current_date, 'provisional', true, true)`;
    const [flags] = await s<{ publish_ir: boolean; publish_br: boolean }[]>`select publish_ir, publish_br from app.bond_credit_analysis where isin = ${P}`;
    expect(flags).toEqual({ publish_ir: false, publish_br: false });
    expect((await db.publicRatings([P])).ratings[P]).toBeUndefined();
    // a worker result that fails the gate is stored (admin can inspect) but stays unpublished, whatever the job status says
    await db.enqueueIsins([P], true, 0);
    const j = await db.claimJob("wp");
    expect(j?.isin).toBe(P);
    const r = await db.completeJob("wp", facts(P), { model: "m", ms: 1, tokensIn: 1, tokensOut: 1 });
    expect(r.ok).toBe(true);
    const [jb] = await s<{ status: string }[]>`select status from app.credit_research_jobs where isin = ${P}`;
    expect(jb.status).toBe("done");
    const [row] = await s<{ publish_ir: boolean; publish_br: boolean; publication_status: string; gate: { ir: { allowed: boolean; reasons: string[] } } }[]>`select publish_ir, publish_br, publication_status, gate from app.bond_credit_analysis where isin = ${P}`;
    expect(row.publish_ir).toBe(false);
    expect(row.gate.ir.allowed).toBe(false);
    expect(row.gate.ir.reasons.length).toBeGreaterThan(0);
    expect((await db.publicRatings([P])).ratings[P]).toBeUndefined();
    // the public HTTP routes say the same
    const { GET: irBr } = await import("../app/api/ir-br/route");
    const { GET: credit } = await import("../app/api/credit-ratings/route");
    const hidden = await (await irBr(new Request(`http://x/api/ir-br?isins=${P}`))).json();
    expect(hidden.ratings[P]).toBeUndefined();
    const hidden2 = await (await credit(new Request(`http://x/api/credit-ratings?isins=${P}`))).json();
    expect(hidden2.ratings[P]).toBeUndefined();
    // a person validates it: now it is public
    expect(await db.validateRating(P, "test")).toBe(true);
    const shown = await (await irBr(new Request(`http://x/api/ir-br?isins=${P}`))).json();
    expect(shown.ratings[P].ir).toBeTruthy();
    expect((await db.publicRatings([P])).ratings[P]?.ir).toBeTruthy();
    // 16. a later (failing) refresh does not touch the validated numbers; the attempt is recorded
    const before = await s`select issuer_rating_min, issuer_rating_max from app.bond_credit_analysis where isin = ${P}`;
    await db.enqueueIsins([P], true, 0);
    const j2 = await db.claimJob("wp");
    expect(j2?.isin).toBe(P);
    await db.completeJob("wp", { ...facts(P), agencyRatings: [], seniority: "unknown" }, { model: "m", ms: 1, tokensIn: 1, tokensOut: 1 });
    const after = await s<{ issuer_rating_min: string; issuer_rating_max: string; rating_verification_status: string; last_attempt: { blocked: boolean } }[]>`select issuer_rating_min, issuer_rating_max, rating_verification_status, last_attempt from app.bond_credit_analysis where isin = ${P}`;
    expect([{ issuer_rating_min: after[0].issuer_rating_min, issuer_rating_max: after[0].issuer_rating_max }]).toEqual(before.map((b) => ({ issuer_rating_min: b.issuer_rating_min, issuer_rating_max: b.issuer_rating_max })));
    expect(after[0].rating_verification_status).toBe("validated");
    expect(after[0].last_attempt.blocked).toBe(true);
    // 6. different issuers with identical financial inputs and no separate primary sources are flagged
    const T1 = "XS0000000021", T2 = "XS0000000022";
    await s`delete from app.bond_credit_analysis where isin in (${T1}, ${T2})`;
    await s`delete from app.credit_research_jobs where isin in (${T1}, ${T2})`;
    const ev1 = [{ url: "https://same.example.com/r.pdf", title: "t", publisher: "S", publishedAt: null, period: null, retrievedAt: "2026-11-01T00:00:00Z", location: null, method: "t", verification: "verified" as const, primary: true }];
    const mk = (isin: string, lei: string): ResearchFacts => ({ ...facts(isin), metrics: { cet1Pct: 14.2, nplPct: 1.1 }, evidence: ev1, issuer: { canonicalId: lei, legalName: lei, lei, identityVerified: false, typeVerified: true } });
    for (const [isin, lei] of [[T1, "AAAAAAAAAAAAAAAAAA11"], [T2, "BBBBBBBBBBBBBBBBBB22"]] as const) {
      await db.enqueueIsins([isin], true, 0);
      const jj = await db.claimJob("wt");
      expect(jj?.isin).toBe(isin);
      await db.completeJob("wt", mk(isin, lei), { model: "m", ms: 1, tokensIn: 1, tokensOut: 1 });
    }
    const [t2] = await s<{ detail: { research: { twins: string[] } } }[]>`select detail from app.bond_credit_analysis where isin = ${T2}`;
    expect(t2.detail.research.twins).toContain(T1);
    await s`delete from app.bond_credit_analysis where isin in (${T1}, ${T2})`;
    // the labelled LBBW reference case is stored for the admin, and it never reaches the public API
    const refs = await db.referenceCases();
    const lbbw = refs.find((r) => r.isin === "DE000LB2CW16");
    expect(lbbw?.status).toBe("internal_provisional");
    expect(lbbw?.lei).toBe("B81CK4ESI35472RHJ606");
    expect((await db.publicRatings(["DE000LB2CW16"])).ratings["DE000LB2CW16"]).toBeUndefined();
    await s`delete from app.bond_credit_analysis where isin = ${P}`;
    await s.end();
  }, 60_000);
});
