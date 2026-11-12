import { describe, expect, it } from "vitest";

// 10B-0002: pruning old bond runs must keep any run a published portfolio result still points at.
const url = process.env.TEST_ACCOUNTS_DATABASE_URL;

describe.skipIf(!url)("bond run pruning", () => {
  it("keeps the 5 newest runs and runs used by published portfolio results", async () => {
    const { default: postgres } = await import("postgres");
    const admin = postgres(url!, { onnotice: () => {} });
    await admin`create schema if not exists app`;
    await admin.end();
    process.env.ACCOUNTS_DATABASE_URL = url;
    const { accountsSql } = await import("./accounts");
    const { peTablesReady } = await import("./netSpread/store");
    const { sliderTablesReady } = await import("./sliderSnapshot");
    const { pruneBesRuns } = await import("./bes/store");
    await peTablesReady();
    await sliderTablesReady();
    const s = await accountsSql();
    const ids: number[] = [];
    for (let i = 0; i < 9; i++) {
      const [r] = await s<{ id: number }[]>`insert into app.bes_runs (batch_id, status, trigger) values ('t-prune', 'superseded', 'test') returning id`;
      ids.push(Number(r.id));
    }
    const [usedByPe, usedBySnap, unused] = ids;
    const [pe] = await s<{ id: number }[]>`insert into app.pe_runs (batch_id, bes_run_id, status, trigger) values ('t-prune', ${usedByPe}, 'published', 'test') returning id`;
    await s`update app.efficient_portfolio_snapshots set status = 'superseded' where status = 'published' and filter_key = 't-prune'`;
    const [snap] = await s<{ id: number }[]>`insert into app.efficient_portfolio_snapshots (batch_id, input_fingerprint, filter_key, methodology, empty_policy, status) values ('t-prune', ${"fp-" + Date.now()}, 't-prune', 'm', 'p', 'published') returning id`;
    await s`insert into app.efficient_portfolio_holdings (snapshot_id, portfolio_id, horizon, ord, isin, bes_run_id) values (${snap.id}, 'P1', 'SHORT', 1, 'XS0000000001', ${usedBySnap})`;
    try {
      await s.begin((tx) => pruneBesRuns(tx));
      const left = (await s<{ id: number }[]>`select id from app.bes_runs where batch_id = 't-prune'`).map((r) => Number(r.id));
      expect(left).toContain(usedByPe);
      expect(left).toContain(usedBySnap);
      expect(left).not.toContain(unused);
      for (const id of ids.slice(-5)) expect(left).toContain(id);
      const [p] = await s`select bes_run_id from app.pe_runs where id = ${pe.id}`;
      expect(Number(p.bes_run_id)).toBe(usedByPe);
    } finally {
      await s`delete from app.efficient_portfolio_snapshots where id = ${snap.id}`;
      await s`delete from app.pe_runs where id = ${pe.id}`;
      await s`delete from app.bes_runs where batch_id = 't-prune'`;
    }
  }, 60_000);
});
