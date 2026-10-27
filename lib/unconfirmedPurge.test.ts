import { describe, expect, it } from "vitest";
import { purgeUnconfirmed, unconfirmedPurgeOn, UNCONFIRMED_MAX_DAYS } from "./unconfirmedPurge";

describe("clean-up of never-confirmed accounts", () => {
  it("is off unless PRIVACY_PURGE_UNCONFIRMED is exactly on", () => {
    expect(unconfirmedPurgeOn({})).toBe(false);
    for (const v of ["", "off", "1", "true", "yes", "onn"]) expect(unconfirmedPurgeOn({ PRIVACY_PURGE_UNCONFIRMED: v })).toBe(false);
    for (const v of ["on", "ON", " on "]) expect(unconfirmedPurgeOn({ PRIVACY_PURGE_UNCONFIRMED: v })).toBe(true);
  });

  it("does not touch the database while off", async () => {
    const sql = new Proxy({}, { get: () => { throw new Error("database used"); } }) as never;
    expect(await purgeUnconfirmed(sql, ["a@b.c"], {})).toBe(0);
  });

  it("waits 30 days", () => expect(UNCONFIRMED_MAX_DAYS).toBe(30));
});
