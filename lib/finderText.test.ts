import { describe, expect, it } from "vitest";
import { FINDER_TEXT } from "./finderText";

describe("finder translations", () => {
  it("every language has every string, none empty", () => {
    const keys = Object.keys(FINDER_TEXT.en).sort();
    for (const [lang, t] of Object.entries(FINDER_TEXT)) {
      expect(Object.keys(t).sort(), lang).toEqual(keys);
      for (const [k, v] of Object.entries(t)) expect(typeof v === "function" ? v(3) : v, `${lang}.${k}`).toBeTruthy();
    }
  });
});
