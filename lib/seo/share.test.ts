import { describe, expect, it } from "vitest";
import { littleText, oauth1Header, xText } from "./share";

describe("automatic sharing", () => {
  it("signs X requests exactly like the OAuth 1.0a reference example", () => {
    // X's documented example ("Creating a signature"): the expected signature is hCtSmYh+iHYCEqBWrE7C7hYmtUk=.
    const keys = { apiKey: "xvz1evFS4wEEPTGEFPHBog", apiSecret: "kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw", token: "370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb", tokenSecret: "LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE" };
    const h = oauth1Header("POST", "https://api.twitter.com/1.1/statuses/update.json", keys, "kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg", 1318622958, { include_entities: "true", status: "Hello Ladies + Gentlemen, a signed OAuth request!" });
    expect(h).toContain(`oauth_signature="${encodeURIComponent("hCtSmYh+iHYCEqBWrE7C7hYmtUk=")}"`);
    expect(h).not.toContain("status=");
  });
  it("keeps X posts short and ends them with the link", () => {
    const t = xText("A".repeat(400) + " · 10BONDS", "https://10bonds.com/it/guide/x");
    expect(t.endsWith("\n\nhttps://10bonds.com/it/guide/x")).toBe(true);
    expect(t.split("\n\n")[0].length).toBe(250);
    expect(xText("BTP Valore · 10BONDS", "u")).toBe("BTP Valore\n\nu");
  });
  it("escapes LinkedIn's reserved characters", () => {
    expect(littleText("BTP (2030) #bonds @x")).toBe("BTP \\(2030\\) \\#bonds \\@x");
  });
});
