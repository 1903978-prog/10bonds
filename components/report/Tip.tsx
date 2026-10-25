/** A small "i" that explains a financial term on hover, focus or tap. Plain CSS, no script. */
export default function Tip({ term, children, right }: { term: string; children: React.ReactNode; right?: boolean }) {
  return (
    <span className="group relative ml-1.5 inline-flex align-middle print:hidden">
      <button
        type="button"
        aria-label={`What is ${term}?`}
        className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border border-line bg-white text-[12px] font-semibold leading-none text-mute hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        i
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute hidden top-full z-30 mt-2 w-[260px] max-w-[calc(100vw-4rem)] rounded-2xl bg-ink px-4 py-3 text-left text-[14px] font-normal normal-case leading-snug tracking-normal text-white shadow-[0_8px_30px_rgba(0,0,0,0.18)] group-hover:block group-focus-within:block ${right ? "right-0" : "left-0"}`}
      >
        {children}
      </span>
    </span>
  );
}
