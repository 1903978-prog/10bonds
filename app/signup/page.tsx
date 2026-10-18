import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = { title: "Create a free account · 10BONDS" };

export default function Signup() {
  return <AuthForm mode="signup" />;
}
