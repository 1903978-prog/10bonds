"use client";
import { useEffect, useRef, useState } from "react";
import { goAuth, restoreScroll } from "@/lib/reportReturn";

export const OPEN_EVENT = "tb:report-auth";

/** "Save & track this bond" (or a plain text version): asks a visitor to log in; the dialog opens only when they press it. */
export function ReportAuthButton({ className = "", plain = false, label = "Save & track this bond" }: { className?: string; plain?: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      data-testid="report-save"
      className={`inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-full px-6 text-[15px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${plain ? "border border-line bg-white text-ink hover:bg-canvas" : "bg-accent text-white hover:bg-[#0077ed]"} ${className}`}
    >
      {label}
    </button>
  );
}

/** The sign-in prompt. Native <dialog>: Esc closes it and focus stays inside. Also restores the scroll position after coming back from login. */
export function ReportAuthDialog({ isin, title }: { isin: string; title: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    restoreScroll();
    const open = () => ref.current?.showModal();
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);
  if (!mounted) return null;
  return (
    <dialog
      ref={ref}
      aria-labelledby="report-auth-h"
      data-testid="report-auth"
      onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
      className="m-auto w-[calc(100vw-32px)] max-w-[440px] rounded-[24px] border border-line bg-white p-0 text-ink shadow-[0_8px_40px_rgba(0,0,0,0.18)] backdrop:bg-black/40 print:hidden"
    >
      <div className="p-6 sm:p-8">
        <h2 id="report-auth-h" className="text-[24px] font-semibold leading-tight tracking-tight">Keep {title} under watch</h2>
        <ul className="mt-4 space-y-3 text-[15px] leading-snug text-mute">
          <li>Log in and come straight back to this same report ({isin}).</li>
          <li>The complete credit, protection and stress analysis is part of the Premium plan.</li>
          <li>Compare this bond with safer alternatives in the bond finder.</li>
        </ul>
        <div className="mt-6 flex flex-col gap-3">
          <button type="button" onClick={() => goAuth("login")} data-testid="report-auth-login" className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-accent px-6 text-[15px] font-medium text-white hover:bg-[#0077ed]">Log in and continue</button>
          <button type="button" onClick={() => goAuth("signup")} data-testid="report-auth-signup" className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-line bg-white px-6 text-[15px] font-medium text-ink hover:bg-canvas">Create an account</button>
          <button type="button" onClick={() => ref.current?.close()} className="min-h-[44px] text-[15px] text-mute hover:text-ink">Not now</button>
        </div>
      </div>
    </dialog>
  );
}
