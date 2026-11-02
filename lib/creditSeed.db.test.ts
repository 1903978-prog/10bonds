import { describe, expect, it, vi } from "vitest";

// Runs only with TEST_ACCOUNTS_DATABASE_URL (an empty Postgres). Seeding the whole bond database into the research queue.
const url = process.env.TEST_ACCOUNTS_DATABASE_URL;
vi.mock("./bonds", () => ({
  allBondIsinsForResearch: async () => [
    { isin: "XS9999990001", issuer: "Big Bank" }, { isin: "XS9999990019", issuer: "Big Bank" }, { isin: "XS9999990027", issuer: "Big Bank" },
    { isin: "XS9999990035", issuer: "Small Co" }, { isin: "XS9999990043", issuer: "Mid AG" }, { isin: "XS9999990050", issuer: "Mid AG" }, { isin: "bad", issuer: "x" },
  ],
}));

describe.skipIf(!url)("seedAllBondJobs", () => {
  it("queues every bond once, first bond of each issuer first, and re-runs finished jobs once", async () => {
    const { default: postgres } = await import("postgres");
    const admin = postgres(url!, { onnotice: () => {} });
    await admin`create schema if not exists app`;
    process.env.ACCOUNTS_DATABASE_URL = url;
    const db = await import("./creditResearchDb");
    await db.creditResearchTablesReady();
    await admin`delete from app.credit_research_jobs where isin like 'XS99999%'`;
    await db.seedAllBondJobs(true);
    expect((await admin`select count(*)::int n from app.credit_research_jobs where isin like 'XS99999%'`)[0].n).toBe(6);
    await db.seedAllBondJobs(true); // repeatable
    expect((await admin`select count(*)::int n from app.credit_research_jobs where isin like 'XS99999%'`)[0].n).toBe(6);
    // other tests in the same database may have queued jobs: park them
    await admin`update app.credit_research_jobs set status = 'failed' where isin not like 'XS99999%'`;
    const order: string[] = [];
    for (;;) { const j = await db.claimJob("w1"); if (!j) break; if (j.isin.startsWith("XS99999")) order.push(j.isin); }
    expect(order).toEqual(["XS9999990001", "XS9999990043", "XS9999990035", "XS9999990019", "XS9999990027", "XS9999990050"]);
    // an old finished job goes back once
    await admin`update app.credit_research_jobs set status = 'done', rerun_epoch = 0, completed_at = now() where isin = 'XS9999990001'`;
    await db.seedAllBondJobs(true);
    expect((await db.claimJob("w1"))?.isin).toBe("XS9999990001");
    await admin`update app.credit_research_jobs set status = 'done', completed_at = now() where isin = 'XS9999990001'`;
    await db.seedAllBondJobs(true);
    expect(await db.claimJob("w1")).toBeNull(); // not again
    expect((await db.overview()).progress.rerun).toMatchObject({ done: expect.any(Number) });
    await admin.end();
  });
});
