import Link from "next/link";

type LegalFooterProps = {
  className?: string;
};

export function LegalFooter({ className = "" }: LegalFooterProps) {
  return (
    <footer className={`legal-footer ${className}`.trim()}>
      <span>© 2026 Pacific Radar</span>
      <nav aria-label="Legal">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </nav>
    </footer>
  );
}
