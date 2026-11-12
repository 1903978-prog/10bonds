import { describe, expect, it } from "vitest";
import { directDbUrl } from "./accounts";

describe("directDbUrl", () => {
  it("drops Neon's -pooler suffix from the host only", () => {
    expect(directDbUrl("postgres://u:p@ep-x-pooler.eu.aws.neon.tech/db?sslmode=require")).toBe("postgres://u:p@ep-x.eu.aws.neon.tech/db?sslmode=require");
  });
  it("leaves other addresses unchanged", () => {
    expect(directDbUrl("postgres://u:p@localhost:5432/db")).toBe("postgres://u:p@localhost:5432/db");
    expect(directDbUrl("not a url")).toBe("not a url");
  });
});
