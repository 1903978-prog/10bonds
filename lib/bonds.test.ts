import { describe, it, expect } from "vitest";
import { cleanIssuer } from "./bonds";
describe("cleanIssuer", () => {
  it("drops bond terms", () => expect(cleanIssuer("DekaBank Deutsche Girozentrale 3.625% 26/29")).toBe("DekaBank Deutsche Girozentrale"));
  it("drops a seat after a comma", () => expect(cleanIssuer("Terega S.A., Pau")).toBe("Terega S.A."));
  it("keeps plain names", () => expect(cleanIssuer("Belgium")).toBe("Belgium"));
  it("keeps legal form after comma", () => expect(cleanIssuer("SAGAX EURO MTN NL B.V.")).toBe("SAGAX EURO MTN NL B.V."));
});
