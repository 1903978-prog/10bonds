"use client";
import { useState } from "react";

const btn = "inline-flex min-h-[40px] items-center rounded-full border border-line bg-white px-4 text-[13px] font-medium text-ink hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent";

/** Copy the ISIN and print / save as PDF (the browser's print dialog). Hidden when printing. */
export default function ReportActions({ isin }: { isin: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(isin);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: nothing to do */
    }
  }
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button type="button" onClick={copy} className={`${btn} w-[112px] justify-center`} data-testid="copy-isin" aria-live="polite">
        {copied ? "Copied" : "Copy ISIN"}
      </button>
      <button type="button" onClick={() => window.print()} className={btn} data-testid="print-report">Print / PDF</button>
    </div>
  );
}
