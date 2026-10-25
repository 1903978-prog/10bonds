export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse" aria-busy="true" aria-label="Loading report" data-testid="report-loading">
      <div className="h-8 w-64 rounded-lg bg-line/70" />
      <div className="mt-2 h-4 w-48 rounded bg-line/70" />
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-[120px] rounded-2xl bg-line/60" />)}</div>
      <div className="mt-3 h-64 rounded-2xl bg-line/60" />
    </div>
  );
}
