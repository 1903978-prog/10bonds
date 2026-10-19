import type { Metadata } from "next";
import { ForgotForm } from "@/components/PasswordReset";

export const metadata: Metadata = { title: "Forgot password · 10BONDS", robots: { index: false, follow: false } };

export default function ForgotPassword() {
  return <ForgotForm />;
}
