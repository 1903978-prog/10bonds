import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Row } from "../components/CreditResearchAdmin";

// The component is written for Next's automatic JSX runtime; the test runner uses the classic one.
(globalThis as unknown as { React: typeof React }).React = React;
const loadDetail = async () => (await import("../components/CreditResearchAdmin")).Detail;
import { parameterReport, blockedMessage, nextMissing } from "./creditParameters";
import type { ResearchFacts } from "./creditScoring";

const facts: ResearchFacts = { isin: "XS0000000001", issuerType: "bank", seniority: "unknown", guaranteed: null, agencyRatings: [], metrics: {}, risks: [], conflicts: [], evidence: [] };
const rep = parameterReport({ ...facts, agencyRatings: [{ agency: "S&P", rating: "A", scope: "issuer", date: null }] });
const row = (over: Partial<Row> = {}): Row => ({
  isin: facts.isin, priority: 0, status: "done", stage: "finished", exposure_count: 1, attempts: 1, last_error: null, updated_at: "2026-11-02T10:00:00Z",
  issuer_rating_min: "60", issuer_rating_max: "80", bond_rating_min: "55", bond_rating_max: "85", rating_verification_status: "review_required", publication_status: "insufficient_evidence",
  publish_ir: false, publish_br: false, gate: { ir: { reasons: ["Only 1 of 12 parameters verified; 10 are required."] }, br: { reasons: ["IR is not eligible for publication."] } }, last_attempt: null,
  parameters: rep, scored: { steps: [{ label: "Bond-level grade A less structure unknown", delta: 64 }], missing: ["financial metrics"], version: "ir-br-v0.1-2026-11-01" },
  facts: facts as never, view: { issuer: null, lei: null, primary: 0, reliable: 0, sources: 0, next: nextMissing(facts, rep), message: blockedMessage("insufficient_evidence", rep, { ir: { reasons: ["Only 1 of 12 parameters verified; 10 are required."] } }) }, ...over,
});

describe("admin detail panel", () => {
  it("shows the explicit 'Rating not published' sentence with counts and what is missing", async () => {
    const Detail = await loadDetail();
    const html = renderToStaticMarkup(createElement(Detail, { r: row() }));
    expect(html).toMatch(/Rating not published: only 1 of 12 parameters verified\. Missing:/);
    expect(html).toMatch(/Why publication is blocked/);
    expect(html).toMatch(/Next parameter the worker will research/);
    expect(html).toMatch(/mandatory for IR/);
    for (const k of ["news mgmt legal", "politics regulation", "health climate cyber"]) expect(html).toContain(k);
    expect(html).toMatch(/Technical details/); // priority, tries and exposure moved into the secondary panel
  });
  it("says nothing is blocked only when every check passed", async () => {
    const Detail = await loadDetail();
    const html = renderToStaticMarkup(createElement(Detail, { r: row({ publication_status: "publishable", gate: { ir: { reasons: [] }, br: { reasons: [] } }, view: { issuer: "X", lei: null, primary: 2, reliable: 3, sources: 3, next: null, message: null } }) }));
    expect(html).toMatch(/All automatic checks passed/);
    expect(html).not.toMatch(/Rating not published/);
  });
});
