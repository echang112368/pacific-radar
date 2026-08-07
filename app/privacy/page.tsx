import type { Metadata } from "next";
import Link from "next/link";
import {
  getLegalContactEmail,
  getLegalOperatorName,
  LEGAL_EFFECTIVE_DATE,
} from "../../lib/legal";
import { AccountShell } from "../account-shell";

export const metadata: Metadata = {
  title: "Privacy Policy — Pacific Radar",
  description: "How Pacific Radar collects, uses, protects, and deletes personal data.",
};

export default function PrivacyPage() {
  const contactEmail = getLegalContactEmail();
  const operatorName = getLegalOperatorName();

  return (
    <AccountShell
      eyebrow="LEGAL · PRIVACY"
      title="Privacy Policy"
      description={`Effective ${LEGAL_EFFECTIVE_DATE}. This policy explains how ${operatorName} handles information when you use Pacific Radar.`}
      wide
    >
      <article className="legal-document">
        <aside>
          <strong>Plain-language summary</strong>
          <p>
            We collect the minimum information needed to run secure accounts. We do
            not sell personal information, run advertising profiles, or use ad-tracking
            cookies. You can permanently delete your account from the Account page.
          </p>
        </aside>

        <section>
          <h2>1. Scope and controller</h2>
          <p>
            This policy applies to the Pacific Radar website, simulator, account
            system, and transactional emails (the “Service”). {operatorName} is the
            controller of personal information collected directly through the Service.
            It does not cover third-party websites or services linked from Pacific Radar.
          </p>
        </section>

        <section>
          <h2>2. Information we collect</h2>
          <h3>Information you provide</h3>
          <ul>
            <li>Controller display name and email address.</li>
            <li>
              A one-way password hash. We do not store or have access to your readable
              password.
            </li>
            <li>
              The date and version of the Terms and Privacy Policy you accepted when
              creating an account.
            </li>
            <li>Messages you send if you contact us for support or a privacy request.</li>
          </ul>
          <h3>Information collected automatically</h3>
          <ul>
            <li>
              Authentication and security data such as session identifiers, sign-in
              timestamps, IP address, browser user agent, and rate-limit records.
            </li>
            <li>
              When you create or reset a password, the first five characters of its
              SHA-1 hash are sent to the Have I Been Pwned password service. The
              password and complete hash are never sent; the partial-hash lookup lets
              us reject passwords found in known breach data.
            </li>
            <li>
              Essential cookie data needed to keep you signed in and protect account
              requests.
            </li>
            <li>
              High scores saved locally in your browser. These scores stay on your
              device and are not associated with your server account.
            </li>
          </ul>
          <p>We do not intentionally collect precise location, contacts, payment data, or biometric data.</p>
        </section>

        <section>
          <h2>3. How and why we use information</h2>
          <ul>
            <li>Provide accounts, sessions, the simulator, and requested support.</li>
            <li>Verify email ownership and deliver password-reset or deletion links.</li>
            <li>Protect the Service against abuse, credential attacks, and fraud.</li>
            <li>Comply with legal obligations and enforce the Terms.</li>
            <li>Maintain and improve reliability using aggregated or de-identified information.</li>
          </ul>
          <p>
            Where applicable, our legal bases are performance of our contract with you,
            our legitimate interests in operating and securing the Service, compliance
            with law, and consent where the law requires it.
          </p>
        </section>

        <section>
          <h2>4. Cookies and local storage</h2>
          <p>
            Pacific Radar uses strictly necessary authentication cookies. These cookies
            support sign-in, session continuity, and request security and cannot be
            replaced by a less intrusive method. The simulator also uses browser local
            storage for device-local high scores. We currently do not use advertising
            cookies or cross-site behavioral tracking. You can remove cookies and local
            scores with your browser controls, but removing authentication cookies signs
            you out.
          </p>
        </section>

        <section>
          <h2>5. When we share information</h2>
          <p>We disclose information only as needed to:</p>
          <ul>
            <li>
              Infrastructure providers that host the Service and database, including
              OpenAI Sites and Cloudflare.
            </li>
            <li>
              Resend, which processes the recipient address and delivery information for
              transactional account emails.
            </li>
            <li>
              Have I Been Pwned, which receives a five-character password-hash prefix
              for privacy-preserving compromised-password screening.
            </li>
            <li>
              Professional advisers, authorities, or other parties when reasonably
              necessary to comply with law, protect rights and safety, investigate abuse,
              or complete a business reorganization.
            </li>
          </ul>
          <p>
            Service providers may use information only to perform services for us under
            their own contractual and legal safeguards. We do not sell personal
            information or share it for cross-context behavioral advertising.
          </p>
        </section>

        <section>
          <h2>6. Retention and deletion</h2>
          <p>
            Account records are retained while your account is active. Verification,
            password-reset, and deletion tokens expire automatically and are removed or
            replaced as the account system processes them. When you confirm deletion,
            Pacific Radar deletes your user profile, credential, sessions, and related
            authentication records from the active database. Limited security logs or
            encrypted backups may persist temporarily under infrastructure providers’
            retention schedules and are isolated from ordinary use until overwritten.
          </p>
          <p>
            Local high scores are controlled by your browser and are not removed by
            server-side account deletion. Clear site data in your browser to remove them.
          </p>
        </section>

        <section>
          <h2>7. Your privacy rights</h2>
          <p>
            Depending on where you live, you may have rights to access, correct, delete,
            restrict, object to, or receive a portable copy of personal information, and
            to appeal a denied request. You may also complain to your local data
            protection authority. We will not discriminate against you for exercising a
            privacy right.
          </p>
          <p>
            Use <Link href="/account">Account</Link> for permanent deletion. For access,
            correction, portability, or other requests, email{" "}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. We may need to verify
            your identity before fulfilling a request. Authorized agents should provide
            proof of authority and may be subject to direct identity confirmation.
          </p>
          <p>
            California residents: Pacific Radar does not sell or share personal
            information as those terms are defined by California privacy law, and has no
            actual knowledge that it sells or shares information of anyone under 16.
          </p>
        </section>

        <section>
          <h2>8. Security</h2>
          <p>
            We use reasonable administrative and technical safeguards, including hashed
            passwords, verified-email access, short-lived single-use links, session
            revocation after password reset, compromised-password screening, rate
            limiting, strict input and request-size validation, browser security headers,
            and encrypted HTTPS transport.
            No online service can guarantee absolute security. Use a unique password and
            contact us promptly if you believe your account was compromised.
          </p>
        </section>

        <section>
          <h2>9. Children</h2>
          <p>
            Pacific Radar is not directed to children under 13, and we do not knowingly
            collect personal information from them. If you believe a child under 13
            created an account, contact us so we can investigate and delete it. Users
            below the age of digital consent in their country should use the Service only
            with permission from a parent or guardian.
          </p>
        </section>

        <section>
          <h2>10. International use</h2>
          <p>
            Pacific Radar and its providers may process information in the United States
            and other countries. Where required, providers use recognized safeguards for
            international transfers. Local privacy rights remain available to you.
          </p>
        </section>

        <section>
          <h2>11. Changes and contact</h2>
          <p>
            We may update this policy as the Service or law changes. Material changes will
            be presented through the Service or by email when appropriate, and the
            effective date above will be updated. Questions or requests can be sent to{" "}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          </p>
        </section>

        <div className="legal-document-links">
          <Link href="/terms">Read the Terms of Service →</Link>
          <Link href="/">Return to Pacific Radar</Link>
        </div>
      </article>
    </AccountShell>
  );
}
