import type { Metadata } from "next";
import { AccountShell } from "../account-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password — Pacific Radar",
  description: "Request a secure Pacific Radar password reset link.",
};

export default function ForgotPasswordPage() {
  return (
    <AccountShell
      eyebrow="ACCOUNT RECOVERY"
      title="Reset your password"
      description="Enter your account email. For your privacy, the response is the same whether or not the address is registered."
    >
      <ForgotPasswordForm />
    </AccountShell>
  );
}
