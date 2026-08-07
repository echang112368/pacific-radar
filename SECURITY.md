# Security policy

Pacific Radar treats authentication data, account lifecycle operations, and the
software supply chain as security-sensitive.

## Reporting a vulnerability

Do not include passwords, tokens, personal data, or exploit payloads in a public
issue. Contact the operator through the address published in the live Privacy
Policy and include the affected route, impact, and safe reproduction steps. The
operator should acknowledge a report promptly, investigate privately, rotate any
affected secret, and publish a fix before disclosing exploit details.

## Enforced controls

- Email ownership is verified before account access.
- Passwords must be 15–128 characters for creation or reset, are hashed with
  Better Auth's scrypt implementation, and are checked against known breach data
  using Have I Been Pwned's k-anonymity range service.
- Password reset revokes existing sessions. Deletion requires the current
  password and a short-lived email confirmation.
- Authentication endpoints use database-backed rate limits, origin checks,
  Fetch Metadata checks, a JSON-only body policy, and a 32 KiB body limit.
- Browser responses use a restrictive Content Security Policy, deny framing and
  executable objects, disable unused device permissions, prevent MIME sniffing,
  and prohibit caching of HTML and account responses.
- There is no file-upload or user-authored HTML feature. React text rendering is
  retained for all displayed user input.
- Dependency versions and the pnpm toolchain are pinned. Unreviewed dependency
  lifecycle scripts fail installation, new releases wait at least 24 hours, and
  transitive git/tarball dependencies are blocked.

## Maintenance

Run `pnpm security:scan`, `pnpm lint`, and `pnpm test` before deployment. The OSV
workflow also scans the lockfile on pushes, pull requests, and every Monday when
the repository is mirrored to GitHub. Review every dependency and GitHub Action
update; never merge security automation blindly.

No control can guarantee that malware or compromise is impossible. Keep the
hosting account protected with phishing-resistant MFA, restrict administrator
access, rotate exposed secrets immediately, and keep operating systems and
browsers updated.
