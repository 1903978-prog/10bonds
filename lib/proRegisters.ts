// Public registers where the admin checks a professional's registration number. Search pages only; nothing is fetched from them automatically.
export const REGULATORS: { id: string; label: string; country: string; register: string }[] = [
  { id: "consob", label: "CONSOB (Italy)", country: "Italy", register: "https://www.consob.it/web/area-pubblica/albo-sim" },
  { id: "bdi", label: "Banca d'Italia (Italy)", country: "Italy", register: "https://albo.bancaditalia.it/" },
  { id: "bafin", label: "BaFin (Germany)", country: "Germany", register: "https://portal.mvp.bafin.de/database/InstInfo/" },
  { id: "amf", label: "AMF (France)", country: "France", register: "https://geco.amf-france.org/" },
  { id: "orias", label: "ORIAS (France)", country: "France", register: "https://www.orias.fr/search" },
  { id: "fca", label: "FCA (UK)", country: "United Kingdom", register: "https://register.fca.org.uk/" },
  { id: "cssf", label: "CSSF (Luxembourg)", country: "Luxembourg", register: "https://www.cssf.lu/en/supervised-entities/" },
  { id: "finma", label: "FINMA (Switzerland)", country: "Switzerland", register: "https://www.finma.ch/en/finma-public/authorised-institutions-individuals-and-products/" },
  { id: "other", label: "Other regulator", country: "", register: "" },
];

/** The register link to show the admin for what an applicant typed as regulator ("CONSOB", "BaFin", …). */
export function registerFor(regulator: string): string | null {
  const r = regulator.toLowerCase();
  const hit = REGULATORS.find((x) => x.id !== "other" && (r.includes(x.id) || r.includes(x.label.split(" (")[0].toLowerCase())));
  return hit?.register ?? null;
}
