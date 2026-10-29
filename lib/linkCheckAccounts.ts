/** Test accounts of the link check (scripts/link-accounts.ts makes them, scripts/link-crawl.mjs signs in with them).
 *  Their passwords exist only as GitHub Actions values; nothing about them is stored in the code. */
export const READONLY_ADMIN_EMAIL = "link-check-admin@10bonds.com";
export const FREE_USER_EMAIL = "link-check-free@10bonds.com";
/** Paid-plan test accounts (29/10/2026): they let the link check use charts, Excel, ISIN search and the exact-year slider as a paying user. */
export const PAID_TEST_EMAILS = {
  plus: "link-check-plus@10bonds.com",
  premium: "link-check-premium@10bonds.com",
  pro: "link-check-pro@10bonds.com",
} as const;
