import type { Metadata } from "next";
import TermsText from "@/components/TermsText";

export const metadata: Metadata = { title: "Terms of Use and Risk Disclosure · 10BONDS", alternates: { canonical: "/terms" } };

export default function Terms() {
  return (
    <article className="mx-auto max-w-6xl rounded-[28px] bg-white p-7 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-10">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Terms of Use and Risk Disclosure</h1>
      <TermsText />
    </article>
  );
}
