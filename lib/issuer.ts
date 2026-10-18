// Some issuer names in the copy still carry bond terms ("DekaBank ... 3.625% 26/29"); show the issuer only.
export function cleanIssuer(name: string | null): string | null {
  if (!name) return name;
  const cleaned = name
    .replace(/\s+\d+(?:[.,]\d+)?\s*%.*$/, "")
    .replace(/,\s*[A-ZÀ-Ü][\p{L} .-]*$/u, (m) => (/\b(S\.?A|AG|SE|N\.?V|B\.?V|plc|S\.p\.A)\b/i.test(m) ? m : ""))
    .trim();
  return cleaned || name;
}
