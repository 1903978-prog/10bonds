import type { Metadata } from "next";
import RedeemForm from "@/components/RedeemForm";

export const metadata: Metadata = { title: "Redeem a code · 10BONDS", robots: { index: false, follow: true } };

export default function Redeem() {
  return <RedeemForm />;
}
