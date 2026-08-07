import type { Metadata } from "next";
import { AccountShell } from "../account-shell";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Choose a new password — Pacific Radar",
  description: "Securely update your Pacific Radar password.",
};

type ResetPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const query = await searchParams;
  const token =
    typeof query.token === "string" && query.token.length <= 512
      ? query.token
      : null;
  const tokenError = !token || typeof query.error === "string";

  return (
    <AccountShell
      eyebrow="SECURE RESET"
      title="Choose a new password"
      description="Use a unique password you do not use for another service. Completing the reset signs out every existing session."
    >
      <ResetPasswordForm token={token} tokenError={tokenError} />
    </AccountShell>
  );
}
