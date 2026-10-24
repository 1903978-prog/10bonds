"use client";

const COOKIE = "tb_as_user";

/** Admin only (yellow): "Admin no" shows the whole site as an ordinary signed-in customer sees it (the server drops every admin extra and admin pages 404); "Admin yes" switches back. Remembered in this browser for a year. */
export default function AdminToggle({ on }: { on: boolean }) {
  const flip = () => {
    document.cookie = on ? `${COOKIE}=1; path=/; max-age=31536000; samesite=lax` : `${COOKIE}=; path=/; max-age=0; samesite=lax`;
    // Admin pages do not exist for a customer: leave them for the home page.
    if (on && location.pathname.startsWith("/admin")) location.href = "/";
    else location.reload();
  };
  return (
    <button type="button" onClick={flip} aria-pressed={on} data-testid="admin-toggle" title={on ? "See the site as a normal user" : "Switch admin view back on"}
      className="inline-flex w-[76px] items-center justify-center whitespace-nowrap rounded-full bg-yellow-200 px-2 py-0.5 text-xs">
      Admin {on ? "yes" : "no"}
    </button>
  );
}
