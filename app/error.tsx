"use client";

import Link from "next/link";
import { useEffect } from "react";

// Shown instead of a blank page when something on a page fails. The error itself is logged, never shown.
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[page]", error.digest ?? "", error.message);
  }, [error]);
  return (
    <div className="mx-auto max-w-xl rounded-[28px] bg-white p-8 text-center shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-3 text-mute">This page could not load. Please try again in a moment.</p>
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={reset} className="rounded-full bg-accent px-5 py-2.5 text-[15px] font-medium text-white">
          Try again
        </button>
        <Link href="/" className="rounded-full bg-canvas px-5 py-2.5 text-[15px] font-medium">
          Home
        </Link>
      </div>
    </div>
  );
}
