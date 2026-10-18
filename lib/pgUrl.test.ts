import { describe, expect, it } from "vitest";
import { accountsUrl, cleanPgUrl } from "./pgUrl";

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

describe("accountsUrl", () => {
  const reader = "postgresql://tenbonds_reader:readpw@ep-x-pooler.eu.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
  it("builds the link from the bond-data link when only a password is saved", () => {
    expect(accountsUrl("npg_abcDEF123456", reader)).toBe("postgresql://tenbonds_app:npg_abcDEF123456@ep-x-pooler.eu.aws.neon.tech/neondb?sslmode=require");
  });
  it("uses a full link as it is", () => {
    expect(accountsUrl("postgresql://a:b@h/db", reader)).toBe("postgresql://a:b@h/db");
  });
});
