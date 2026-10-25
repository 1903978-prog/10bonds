/** Yellow strip on pages customers cannot see (the owner, 25/10/2026). */
export default function AdminOnlyBanner() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-2" data-testid="admin-only-banner">
      <p className="rounded bg-yellow-200 px-2 py-0.5 text-[11px] text-ink">Admin only: customers do not see this page.</p>
    </div>
  );
}
