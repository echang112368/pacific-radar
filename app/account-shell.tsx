import Link from "next/link";
import type { ReactNode } from "react";
import { LegalFooter } from "./legal-footer";

type AccountShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  wide?: boolean;
};

export function AccountShell({
  eyebrow,
  title,
  description,
  children,
  wide = false,
}: AccountShellProps) {
  return (
    <main className="account-flow-page">
      <div className="account-flow-background" aria-hidden="true" />
      <header className="account-flow-header">
        <Link className="login-brand" href="/" aria-label="Pacific Radar home">
          <span aria-hidden="true">PR</span>
          <strong>PACIFIC RADAR</strong>
        </Link>
        <Link href="/">← Return to radar</Link>
      </header>

      <section className={`account-flow-content ${wide ? "is-wide" : ""}`.trim()}>
        <div className="account-flow-card">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="account-flow-description">{description}</p>
          {children}
        </div>
      </section>

      <LegalFooter className="account-flow-footer" />
    </main>
  );
}
