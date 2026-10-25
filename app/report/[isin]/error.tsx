"use client";

export default function ReportError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="mx-auto mt-8 max-w-md rounded-2xl border border-line bg-white p-6 text-center" role="alert" data-testid="report-error">
      <p className="text-[15px] font-medium">The report could not be loaded</p>
      <button type="button" onClick={reset} className="mt-3 min-h-[40px] rounded-full bg-accent px-5 text-[13px] font-medium text-white">Try again</button>
    </section>
  );
}
