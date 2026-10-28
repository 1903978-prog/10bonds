import { beforeEach, describe, expect, it, vi } from "vitest";
import { SAMPLE_BONDS } from "@/lib/sample-bonds";

const mocks = vi.hoisted(() => ({ admin: true, raw: [] as unknown[], shown: null as unknown, rawDelay: 0 }));
vi.mock("@/lib/currentUser", () => ({ currentUser: async () => (mocks.admin ? { isAdmin: true } : null) }));
vi.mock("@/lib/bonds", () => ({ loadBondsByIsin: async () => { if (mocks.rawDelay) await new Promise((r) => setTimeout(r, mocks.rawDelay)); return mocks.raw; } }));
vi.mock("@/components/seo/BondIsinPage", () => ({ bondByIsin: async () => { if (mocks.rawDelay) await new Promise((r) => setTimeout(r, mocks.rawDelay)); return mocks.shown; } }));
vi.mock("@/lib/bundCurve/store", () => ({ getBundBenchmarkPoints: async () => null }));
vi.mock("@/lib/usTreasury/store", () => ({ getUsBenchmarkPoints: async () => null }));
vi.mock("@/lib/bes/store", () => ({ besPublic: async () => null }));

import { GET } from "../app/api/bonds/card/route";
const call = (isin: string) => GET(new Request(`http://x/api/bonds/card?isin=${isin}`)).then(async (r) => ({ status: r.status, body: await r.json() }));

describe("bond card route", () => {
  beforeEach(() => { mocks.admin = true; mocks.raw = []; mocks.shown = null; mocks.rawDelay = 0; });
  it("is a 404 for everyone but the admin", async () => {
    mocks.admin = false;
    expect((await call("FR0000186413")).status).toBe(404);
  });
  it("rejects an invalid ISIN", async () => {
    expect((await call("FR0000186414")).body.status).toBe("invalid");
  });
  it("says not in our database, with the date checked, for an unknown valid ISIN", async () => {
    const r = await call("US0378331005");
    expect(r.body).toMatchObject({ status: "not_found", reason: "not_listed" });
    expect(r.body.checkedAt).toMatch(/^\d{4}-\d\d-\d\d/);
  });
  it("gives the full card plus the reason for a bond in the data that the site keeps out (FR0000186413)", async () => {
    const bond = { ...SAMPLE_BONDS[0], isin: "FR0000186413", modifiedDuration: null, grossYtm: 5.03 };
    mocks.raw = [{ bond, why: "structure not modelled (floating, step-up, inflation-linked or similar)" }];
    const r = await call("FR0000186413");
    expect(r.body.status).toBe("found");
    expect(r.body.excluded).toBe("structure");
    expect(r.body.card.isin).toBe("FR0000186413");
  });
  it("answers within the time budget when the database is slow", async () => {
    mocks.rawDelay = 6000;
    const t = Date.now();
    const r = await call("FR0000186413");
    expect(r.body.status).toBe("timeout");
    expect(Date.now() - t).toBeLessThan(3500);
  }, 10000);
});
