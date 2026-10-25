# Compliance review: BUY / WATCH / AVOID and issuer assessments

Status 25 Oct 2026. For counsel and the owner. Not legal advice.

## What the site does now
- BUY / WATCH / AVOID labels, "Our view" and the analyst conclusion are **hidden from customers** by default. Admin always sees them.
- Switch: `/admin/assessments` (checkbox). Turn it on only after the items below are closed.
- Numeric scores are labelled "10bonds.com score" / "10bonds risk", model-based, dated, with model version `10bonds-research-1.0`. They are never called ratings.
- Each published assessment is stored (source, date, model version, figures) in `app.assessment_evidence`; correction requests in `app.correction_requests` (both on `/admin/assessments`).

## Open items before switching labels on
1. **Is it a "recommendation"?** Counsel to decide if BUY/WATCH/AVOID is investment advice or an investment recommendation under MiFID II / MAR (EU), FCA rules (UK), and the Advisers Act / Exchange Act (US) for the markets we target. Do not assume an exemption.
2. **Wording of the labels.** If kept, consider neutral wording ("Higher / Lower relative risk under our model") instead of BUY / AVOID.
3. **Conflicts of interest.** Fill the facts, then put one short clause in the single footer sentence (not a new line):
   - Does SQUARE ONE OÜ, the owner or staff hold positions in any bond or issuer shown?
   - Any payment, affiliate or other relationship with an issuer, broker, bank or data vendor?
   - Written conflict policy and a restricted list.
4. **Suitability.** Confirm that general commentary and the footer wording ("not advice", "does not take account of circumstances") are enough for each target market.
5. **Approval trail.** Name the person who approves each label before publication; keep the approval date with the evidence record.
6. **Fair presentation.** Each label must be shown with the score date, model version and a link to the methodology and limits (`/disclaimer#assessments`).
7. **Retention.** Agree how long evidence and correction records are kept (suggest at least 5 years).
8. **Credit rating agency rules.** Counsel to confirm the "model-based score, not a credit rating" framing is enough under EU CRA Regulation, UK CRA rules and US NRSRO rules, and that the name "rating" is used only as "10bonds.com rating".

## Correction process (issuers)
1. Issuer submits the form on a report page (name, e-mail, what is wrong, evidence).
2. Admin reviews on `/admin/assessments`, sets Open / Corrected / Rejected.
3. If corrected: update `lib/companiesInFocus.ts`, bump the date (new evidence row is saved automatically).
