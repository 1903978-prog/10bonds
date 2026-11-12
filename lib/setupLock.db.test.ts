import { describe, expect, it } from "vitest";

// Defect 10B-0001: a setup lock that is already held (for example leaked on a pooled connection) must never stop the app
// from starting. Setup waits a bounded time, then runs anyway.
const url = process.env.TEST_ACCOUNTS_DATABASE_URL;

describe.skipIf(!url)("account setup lock", () => {
  it("runs setup even when another session holds the lock", async () => {
    const { default: postgres } = await import("postgres");
    const admin = postgres(url!, { onnotice: () => {} });
    await admin`create schema if not exists app`;
    process.env.ACCOUNTS_DATABASE_URL = url;
    const holder = postgres(url!, { max: 1, onnotice: () => {} });
    await holder`select pg_advisory_lock(7240001)`;
    try {
      const { setupLockedForTest } = await import("./accounts");
      const t0 = Date.now();
      await setupLockedForTest(500);
      expect(Date.now() - t0).toBeLessThan(15_000);
    } finally {
      await holder.end();
      await admin.end();
    }
  }, 30_000);

  it("releases the lock after setup", async () => {
    const { default: postgres } = await import("postgres");
    const { setupLockedForTest } = await import("./accounts");
    await setupLockedForTest(5_000);
    const other = postgres(url!, { max: 1, onnotice: () => {} });
    const [r] = await other<{ ok: boolean }[]>`select pg_try_advisory_lock(7240001) as ok`;
    await other`select pg_advisory_unlock(7240001)`;
    await other.end();
    expect(r.ok).toBe(true);
  }, 30_000);
});
