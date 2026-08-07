import type { Metadata } from "next";
import { requireSession } from "../../lib/auth-server";
import { AccountShell } from "../account-shell";
import { AccountSettings } from "./account-settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account — Pacific Radar",
  description: "Review security and privacy controls for your Pacific Radar account.",
};

export default async function AccountPage() {
  const session = await requireSession();

  return (
    <AccountShell
      eyebrow="ACCOUNT & PRIVACY"
      title="Controller account"
      description="Review your account identity, security protections, and permanent deletion controls."
      wide
    >
      <AccountSettings
        email={session.user.email}
        emailVerified={session.user.emailVerified}
        name={session.user.name}
      />
    </AccountShell>
  );
}
