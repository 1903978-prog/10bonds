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

describe("cleanPgUrl with pasted extras", () => {
  it("takes the URL out of a psql command", () => {
    expect(cleanPgUrl("psql 'postgresql://u:p@h.neon.tech/db?sslmode=require&channel_binding=require'")).toBe(
      "postgresql://u:p@h.neon.tech/db?sslmode=require",
    );
  });
  it("trims quotes, spaces and a trailing newline", () => {
    expect(cleanPgUrl('  "postgres://u:p@h/db"\n')).toBe("postgres://u:p@h/db");
  });
});
