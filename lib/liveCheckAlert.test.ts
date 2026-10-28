import { describe, expect, it } from "vitest";
import { liveCheckMail, liveCheckRecipient, liveCheckToken, liveCheckTokenOk } from "./liveCheckAlert";

describe("live check alert", () => {
  it("accepts only the right token", () => {
    const t = liveCheckToken("k");
    expect(liveCheckTokenOk("k", t)).toBe(true);
    expect(liveCheckTokenOk("k", "x".repeat(t.length))).toBe(false);
    expect(liveCheckTokenOk(undefined, t)).toBe(false);
    expect(liveCheckTokenOk("k", "")).toBe(false);
  });
  it("sends to the first admin address", () => {
    expect(liveCheckRecipient(undefined)).toBe("1903978@gmail.com");
    expect(liveCheckRecipient(" A@x.com , b@x.com")).toBe("a@x.com");
  });
  it("escapes the summary in the html body", () => {
    expect(liveCheckMail("<b>x</b>", "https://github.com/a").html).not.toContain("<b>x</b>");
  });
});
