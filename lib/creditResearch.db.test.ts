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
    expect(pub.ratings[j1!.isin].ir).toMatch(/^\d+(–\d+)?$/);
    expect(pub.ratings[j1!.isin].br).toBeTruthy();
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
    await s.end();
  }, 60_000);
});
