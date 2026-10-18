import { describe, expect, it } from "vitest";
import { cleanPgUrl } from "./pgUrl";

describe("cleanPgUrl", () => {
  it("drops channel_binding and keeps sslmode", () => {
    const out = cleanPgUrl("postgresql://u:p@ep-x-pooler.eu.aws.neon.tech/neondb?sslmode=require&channel_binding=require");
    expect(out).toBe("postgresql://u:p@ep-x-pooler.eu.aws.neon.tech/neondb?sslmode=require");
  });
  it("leaves a plain URL alone", () => {
    expect(cleanPgUrl("postgres://u:p@localhost:5432/db")).toBe("postgres://u:p@localhost:5432/db");
  });
});
