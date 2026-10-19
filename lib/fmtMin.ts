/** "1,000" style minimum investment; "—" when the data does not say. */
export const fmtMin = (n: number | null | undefined) => (n === null || n === undefined ? "—" : n.toLocaleString("en-US"));
