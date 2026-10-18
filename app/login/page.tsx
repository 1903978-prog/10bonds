import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = { title: "Sign in · 10BONDS" };

export default function Login() {
  return <AuthForm mode="login" />;
}
