import Link from "next/link";
import type { Metadata } from "next";
import { COMPANY } from "@/lib/legal";
import { OG_IMAGES } from "@/lib/ogImage";

const DESC = "About 10BONDS and how to reach us.";

export const metadata: Metadata = {
  title: "About · 10BONDS",
  description: DESC,
  alternates: { canonical: "/about" },
  openGraph: { images: OG_IMAGES, title: "About · 10BONDS", description: DESC, url: "/about" },
};

export default function About() {
  return (
    <article className="mx-auto max-w-3xl rounded-lg border border-line bg-white p-7 text-[15px] leading-relaxed sm:p-10" data-testid="about">
      <h1 className="text-3xl font-semibold tracking-tight">About 10BONDS</h1>
      <p className="mt-5">10BONDS is a bond discovery and ranking tool. It builds lists of 10 bonds from public market data with a fixed, published method, so that return and risk are looked at together. It is information only, not investment advice.</p>
      <h2 className="mt-6 font-semibold">Contact</h2>
      <p className="mt-2"><a className="text-accent" href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a> for any question, including privacy and data requests.</p>
      <h2 className="mt-6 font-semibold">How we work</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>The same published method is applied to every bond.</li>
        <li>Prices and bond terms are public market data, refreshed every day; a price that is too old or fails a quality check is left out.</li>
        <li>Risk levels 1 to 10 are our own assessment and are not credit ratings. Return figures are before taxes and costs.</li>
        <li>If you find a mistake, write to us: we check it and correct the page.</li>
      </ul>
      <p className="mt-2">See also <Link className="text-accent" href="/how-we-calculate">how we calculate</Link>, the <Link className="text-accent" href="/terms">terms</Link>, the <Link className="text-accent" href="/privacy">privacy notice</Link> and the <Link className="text-accent" href="/disclaimer">disclaimer</Link>.</p>
      <h2 className="mt-6 font-semibold">Editorial team</h2>
      <p className="mt-2">Articles and guides are published under the byline “10bonds Analyst”, the editorial team of 10BONDS. The method behind the lists is described in the <Link className="text-accent" href="/selection-methodology">selection methodology</Link> and the <a className="text-accent" href="/methodology/10bonds-quant-methodology.pdf">scientific methodology (PDF)</a>.</p>
    </article>
  );
}
