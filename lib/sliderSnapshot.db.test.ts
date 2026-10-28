import { beforeAll, describe, expect, it, vi } from "vitest";
import type { PublicBond } from "./types";

// End to end against a real Postgres (TEST_ACCOUNTS_DATABASE_URL): build, publish, idempotence, overlap, a failed rebuild keeps the old snapshot.
const url = process.env.TEST_ACCOUNTS_DATABASE_URL;
const state = vi.hoisted(() => ({ bonds: [] as unknown[], asOf: "2026-10-28T00:00:00.000Z" }));
vi.mock("./bonds", async (orig) => ({ ...(await orig<typeof import("./bonds")>()), loadBondsFor: async () => ({ bonds: state.bonds, source: "live", asOf: state.asOf }), loadBondIdentities: async () => (state.bonds as PublicBond[]).map((b) => ({ isin: b.isin, name: b.name, issuer: b.issuer, currency: b.currency, maturity: b.maturity })) }));
vi.mock("./sliderSnapshotBuild", async (orig) => ({ ...(await orig<typeof import("./sliderSnapshotBuild")>()), EMPTY_POLICY: "share" }));

const bond = (isin: string, issuer: string, ytm: number, rating: string, dur: number): PublicBond => ({
  isin, name: isin, issuer, country: "France", currency: "EUR", coupon: null, maturity: null,
  ratingSp: rating, ratingMoodys: null, ratingFitch: null, ratingResolved: null, grossYtm: ytm, modifiedDuration: dur, ytmAsOf: null,
});
const NAMES = ["Axa", "Allianz", "Deutsche Zeta", "Engie", "Enel", "Snam", "Sanofi", "Roche", "Danone", "Heineken", "Eni", "Neste", "Stryker", "Orange", "Verizon", "Gecina", "Vonovia", "Iberdrola", "Telefonica", "Carrefour", "Michelin", "Siemens"];
const GRADES = ["AAA", "AA", "A", "BBB", "BBB", "BB", "B"];
function universe(): PublicBond[] {
  let seed = 23;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return [2, 4, 10].flatMap((d) => NAMES.map((n, i) => { const g = Math.floor(rnd() * GRADES.length); return bond(`D${d}-${i}`, n, Math.round((2.5 + g * 0.8 + rnd() * 1.2) * 100) / 100, GRADES[g], d * (0.97 + rnd() * 0.06)); }));
}

describe.skipIf(!url)("slider snapshot database", () => {
  beforeAll(async () => {
    const { default: postgres } = await import("postgres");
    const admin = postgres(url!, { onnotice: () => {} });
    await admin`create schema if not exists app`;
    await admin.end();
    process.env.ACCOUNTS_DATABASE_URL = url;
    state.bonds = universe();
  });

  it("waits for stored lists, publishes 90/90, never duplicates a batch, and a failed new batch keeps the old snapshot", { timeout: 300000 }, async () => {
    const snap = await import("./sliderSnapshot");
    const { buildBands } = await import("./riskBandsBuild");
    const { bandsKey } = await import("./riskBandsServe");
    const { saveStoredBands, loadBandConfig } = await import("./riskBandsStore");
    const { loadBondsFor } = await import("./bonds");
    const { TERMS } = await import("./limits");
    const f = { currency: "EUR", size: "100k" } as const;

    // No stored lists yet: the automatic run waits, a forced run records the blockers and publishes nothing.
    expect((await snap.buildSnapshot("auto")).status).toBe("skipped");
    const inc = await snap.buildSnapshot("script", f, true);
    expect(inc.status).toBe("incomplete");
    expect(await snap.activeSnapshot(f)).toBeNull();

    // Store the lists of this exact batch, then build: all 90 rows pass and the snapshot is published.
    const cfg = await loadBandConfig();
    const src = await loadBondsFor(f as never);
    for (const t of TERMS) await saveStoredBands(bandsKey(src as never, f as never, t.duration, cfg), await buildBands(src.bonds as PublicBond[], t.duration, cfg, "t"));
    const ok = await snap.buildSnapshot("script", f, true);
    expect(ok.status).toBe("published");
    expect(ok.filled).toBe(90);
    const a = await snap.activeSnapshot(f);
    expect(a!.horizons.short).toHaveLength(30);
    expect(a!.horizons.mid).toHaveLength(30);
    expect(a!.horizons.long).toHaveLength(30);
    expect(a!.horizons.long.every((p) => !p.unavailable && p.ytm !== null && p.avgRisk !== null)).toBe(true);
    const rows = await snap.snapshotRows(ok.snapshotId!);
    expect(rows).toHaveLength(90);
    const d = await snap.rowDetail(ok.snapshotId!, 45);
    expect(d!.bonds).toHaveLength(10);
    // Ten bond-code columns per row, each a real code, all 900 references present and valid.
    expect(rows.every((r) => Array.from({ length: 10 }, (_, i) => r[`bond_${i + 1}`]).every((c) => /^EUR\d{5}$/.test(String(c))))).toBe(true);
    const before = Object.fromEntries((await (await import("./accounts")).accountsSql().then((q) => q`select isin, bond_code from app.bond_codes`)).map((r) => [r.isin, r.bond_code]));

    // Same batch again, also two at once: nothing new is saved.
    const twice = await Promise.all([snap.buildSnapshot("auto"), snap.buildSnapshot("admin")]);
    expect(twice.every((r) => r.status === "skipped")).toBe(true);
    expect((await snap.snapshotList()).filter((s) => s.status === "published")).toHaveLength(1);

    // A new price batch whose lists are not ready: not published, the old snapshot stays active.
    state.bonds = (state.bonds as PublicBond[]).map((b, i) => (i === 0 ? { ...b, grossYtm: b.grossYtm! + 0.07 } : b));
    expect((await snap.buildSnapshot("auto")).status).toBe("skipped");
    const bad = await snap.buildSnapshot("admin", f, true);
    expect(bad.status).toBe("incomplete");
    expect((await snap.activeSnapshot(f))!.id).toBe(ok.snapshotId);

    // Lists ready for the new batch: the active snapshot switches to the new one and the old one is kept as history.
    const src2 = await loadBondsFor(f as never);
    for (const t of TERMS) await saveStoredBands(bandsKey(src2 as never, f as never, t.duration, cfg), await buildBands(src2.bonds as PublicBond[], t.duration, cfg, "t"));
    const next = await snap.buildSnapshot("script", f, true);
    expect(next.status).toBe("published");
    const list = await snap.snapshotList();
    expect(list.filter((s) => s.status === "published").map((s) => Number(s.id))).toEqual([next.snapshotId]);
    expect(list.find((s) => Number(s.id) === ok.snapshotId)!.status).toBe("superseded");
    expect((await snap.jobHistory()).length).toBeGreaterThan(5);
    // Codes never change after later imports; a new bond gets the next number.
    state.bonds = [...(state.bonds as PublicBond[]), bond("NEW-1", "Aaa First Issuer", 3, "A", 4)];
    const { assignBondCodes } = await import("./bondCodes");
    await Promise.all([assignBondCodes(), assignBondCodes()]);
    const q = await (await import("./accounts")).accountsSql();
    const after = Object.fromEntries((await q`select isin, bond_code from app.bond_codes`).map((r) => [r.isin, r.bond_code]));
    for (const [k, v] of Object.entries(before)) expect(after[k]).toBe(v);
    expect(after["NEW-1"]).toBe(`EUR${String(Object.keys(before).length + 1).padStart(5, "0")}`);
  });
});
