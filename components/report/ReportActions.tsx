"use client";
import { useState } from "react";

const btn = "inline-flex min-h-[44px] items-center justify-center rounded-full border border-line bg-white px-5 text-[15px] font-medium text-ink hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent";

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
    <>
      <button type="button" onClick={copy} className={`${btn} w-[132px] max-sm:flex-1`} data-testid="copy-isin" aria-live="polite">
        {copied ? "Copied" : "Copy ISIN"}
      </button>
      <button type="button" onClick={() => window.print()} className={`${btn} max-sm:flex-1`} data-testid="print-report">Print / PDF</button>
    </>
  );
}
