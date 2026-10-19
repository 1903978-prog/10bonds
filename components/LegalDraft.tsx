import { LEGAL_DRAFT_DATE } from "@/lib/legal";

/** A visible notice that a legal page is a draft to be checked by a lawyer before it is relied on. */
export default function LegalDraft() {
  return (
    <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900" data-testid="legal-draft">
      Draft of {LEGAL_DRAFT_DATE}. This text is being reviewed and will be completed with our company details. Bracketed items are still to be filled in.
    </p>
  );
}
