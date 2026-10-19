import { describe, expect, it } from "vitest";
import { accountsUrl } from "./pgUrl";
// @ts-expect-error plain .mjs script without types
import { accountsUrl as scriptUrl } from "../scripts/accounts-url.mjs";

// The nightly backup builds the accounts link with scripts/accounts-url.mjs; it must match the site's own rule.
describe("backup script finds the same accounts database as the site", () => {
  const bond = "psql 'postgresql://tenbonds_reader:pw@ep-x.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'";
  for (const [label, acc] of [
    ["full link", "postgresql://tenbonds_app:s3cret@ep-x.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"],
    ["password only", "s3cret"],
    ["quoted password", "'s3cret'"],
  ]) {
    it(label, () => expect(scriptUrl(acc, bond)).toBe(accountsUrl(acc, bond)));
  }
});
