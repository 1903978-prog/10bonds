import { notesFor } from "@/lib/bondNotes";

/** Admin only: the footnote line (yellow) for any noted bond in the table above; nothing when there is none. */
export function BondNoteFoot({ isins, className = "" }: { isins: Array<string | null | undefined>; className?: string }) {
  const notes = notesFor(isins);
  if (!notes.length) return null;
  return <span className={`min-w-0 truncate text-[11px] text-amber-900 ${className}`} data-testid="bond-note-foot">† {notes.map(([, n]) => n).join(" · ")}</span>;
}
