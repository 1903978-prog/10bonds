// Admin only (the owner, 25/10/2026): short facts about single bonds, shown as a yellow † next to the bond's rating
// cells and as a footnote under the admin tables. Never sent to customers' pages (only admin tables render them).
// To add one, add a line here: ISIN -> note.
export const BOND_NOTES: Record<string, string> = {
  IT0005636797: "IT0005636797 is an equity-linked structured note",
};

export const bondNote = (isin?: string | null): string | undefined => (isin ? BOND_NOTES[isin] : undefined);

/** The notes (deduplicated) for the ISINs shown in a table. */
export const notesFor = (isins: Array<string | null | undefined>): Array<[string, string]> =>
  [...new Set(isins.filter((i): i is string => !!i && i in BOND_NOTES))].map((i) => [i, BOND_NOTES[i]]);
