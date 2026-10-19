/**
 * Company details shown in the privacy and cookie policies. Placeholders until Livio supplies them:
 * replace each bracketed value here and the pages update everywhere.
 */
export const COMPANY = {
  legalName: "[Company legal name]",
  address: "[Registered address]",
  registration: "[Company registration number and VAT number]",
  privacyEmail: "[Privacy contact email]",
  dpo: "[Data protection officer, if appointed, or remove this line]",
  authority: "Garante per la protezione dei dati personali (www.garanteprivacy.it)",
};
export const LEGAL_DRAFT_DATE = "19 October 2026";
export const isPlaceholder = (v: string) => v.startsWith("[");
