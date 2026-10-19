import type { Metadata } from "next";
import { ResetForm } from "@/components/PasswordReset";

export const metadata: Metadata = { title: "New password · 10BONDS", robots: { index: false, follow: false } };

export default function ResetPassword() {
  return <ResetForm />;
}
