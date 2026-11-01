/** IR (issuer) and BR (bond) assessments as small neutral pills, text exactly as stored, "—" when none is saved. Not an agency rating, not the 1-10 risk class. */
export const IRBR_NOTE = "IR and BR: independent provisional assessments of the issuer and of this bond, not agency ratings";

export function IrBrPills({ value }: { value: { ir: string | null; br: string | null } | null | undefined }) {
  const pill = (label: string, v: string | null | undefined, id: string) => (
    <span className="inline-flex items-center gap-0.5 whitespace-nowrap" data-testid={id} title={IRBR_NOTE}>
      <span className="text-[10px] text-mute">{label}</span>
      <span className={`rounded bg-line/50 px-1 text-[11px] font-medium tabular-nums ${v ? "text-ink" : "text-mute"}`}>{v || "—"}</span>
    </span>
  );
  return <>{pill("IR", value?.ir, "ir-pill")}{pill("BR", value?.br, "br-pill")}</>;
}

/** One table cell: the stored IR or BR text, "—" when none is saved. */
export function IrBrCell({ v, k }: { v: { ir: string | null; br: string | null } | null | undefined; k: "ir" | "br" }) {
  const x = k === "ir" ? v?.ir : v?.br;
  return <span className={`inline-block rounded bg-line/50 px-1 text-[11px] font-medium tabular-nums ${x ? "text-ink" : "text-mute"}`} title={IRBR_NOTE} data-testid={k === "ir" ? "ir-cell" : "br-cell"}>{x || "—"}</span>;
}
