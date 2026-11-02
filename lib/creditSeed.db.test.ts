import { describe, expect, it, vi } from "vitest";

// Runs only with TEST_ACCOUNTS_DATABASE_URL (an empty Postgres). Seeding the whole bond database into the research queue.
const url = process.env.TEST_ACCOUNTS_DATABASE_URL;
vi.mock("./bonds", () => ({
  allBondIsinsForResearch: async () => [
    { isin: "XS0000000001", issuer: "Big Bank" }, { isin: "XS0000000019", issuer: "Big Bank" }, { isin: "XS0000000027", issuer: "Big Bank" },
    { isin: "XS0000000035", issuer: "Small Co" }, { isin: "XS0000000043", issuer: "Mid AG" }, { isin: "XS0000000050", issuer: "Mid AG" }, { isin: "bad", issuer: "x" },
  ],
}));

describe.skipIf(!url)("seedAllBondJobs", () => {
  it("queues every bond once, first bond of each issuer first, and re-runs finished jobs once", async () => {
    const { default: postgres } = await import("postgres");
    const admin = postgres(url!, { onnotice: () => {} });
    await admin`create schema if not exists app`;
    process.env.ACCOUNTS_DATABASE_URL = url;
    const db = await import("./creditResearchDb");
    expect(await db.seedAllBondJobs(true)).toBe(6);
    expect(await db.seedAllBondJobs(true)).toBe(0); // repeatable
    const order: string[] = [];
    for (;;) { const j = await db.claimJob("w1"); if (!j) break; order.push(j.isin); }
    expect(order).toEqual(["XS0000000001", "XS0000000043", "XS0000000035", "XS0000000019", "XS0000000027", "XS0000000050"]);
    expect((await db.overview()).progress.total).toBe(6);
    // an old finished job goes back once
    await admin`update app.credit_research_jobs set status = 'done', rerun_epoch = 0, completed_at = now() where isin = 'XS0000000001'`;
    await db.seedAllBondJobs(true);
    expect((await db.claimJob("w1"))?.isin).toBe("XS0000000001");
    await admin`update app.credit_research_jobs set status = 'done', completed_at = now() where isin = 'XS0000000001'`;
    await db.seedAllBondJobs(true);
    expect(await db.claimJob("w1")).toBeNull(); // not again
    expect((await db.overview()).progress.rerun).toEqual({ total: 1, done: 1 });
    await admin.end();
  });
});
