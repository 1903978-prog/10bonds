import type { Metadata } from "next";
import { COMPANY } from "@/lib/legal";
import { OG_IMAGES } from "@/lib/ogImage";

const DESC = "Who runs 10BONDS: SQUARE ONE OÜ, a company registered in Estonia. Company details and how to reach us.";

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
      <h2 className="mt-6 font-semibold">Who runs it</h2>
      <p className="mt-2">{COMPANY.legalName}, a company registered in Estonia ({COMPANY.registration}).</p>
      <p className="mt-2" data-testid="about-address">{COMPANY.address}</p>
      <h2 className="mt-6 font-semibold">Contact</h2>
      <p className="mt-2"><a className="text-accent" href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a> for any question, including privacy and data requests.</p>
      <h2 className="mt-6 font-semibold">Editorial team</h2>
      <p className="mt-2">Articles and guides are published under the byline “10bonds Analyst”, the editorial team of 10BONDS. The method behind the lists is described in the <a className="text-accent" href="/selection-methodology">selection methodology</a> and the <a className="text-accent" href="/methodology/10bonds-quant-methodology.pdf">scientific methodology (PDF)</a>.</p>
    </article>
  );
}
