import type { Metadata } from "next";
import Link from "next/link";
import {
  getLegalContactEmail,
  getLegalOperatorName,
  LEGAL_EFFECTIVE_DATE,
} from "../../lib/legal";
import { AccountShell } from "../account-shell";

export const metadata: Metadata = {
  title: "Terms of Service — Pacific Radar",
  description: "The terms that govern use of the Pacific Radar simulator and account service.",
};

export default function TermsPage() {
  const contactEmail = getLegalContactEmail();
  const operatorName = getLegalOperatorName();

  return (
    <AccountShell
      eyebrow="LEGAL · TERMS"
      title="Terms of Service"
      description={`Effective ${LEGAL_EFFECTIVE_DATE}. These Terms form an agreement between you and ${operatorName} when you create an account or use Pacific Radar.`}
      wide
    >
      <article className="legal-document">
        <aside>
          <strong>Important simulation notice</strong>
          <p>
            Pacific Radar is an entertainment product. It is not FAA-approved training,
            navigation software, operational guidance, or a substitute for certified
            aviation instruction.
          </p>
        </aside>

        <section>
          <h2>1. Acceptance of these Terms</h2>
          <p>
            By accessing the website, creating an account, or using the simulator (the
            “Service”), you agree to these Terms and acknowledge the{" "}
            <Link href="/privacy">Privacy Policy</Link>. If you do not agree, do not use
            the Service. If you use Pacific Radar for an organization, you represent that
            you have authority to bind that organization.
          </p>
        </section>

        <section>
          <h2>2. Eligibility</h2>
          <p>
            You must be at least 13 years old and legally able to enter this agreement.
            If local law requires parental consent at an older age, you may use the
            Service only with permission from a parent or guardian. The Service is not
            available to anyone prohibited from receiving it under applicable law.
          </p>
        </section>

        <section>
          <h2>3. Accounts and security</h2>
          <p>
            You must provide accurate account information, maintain a valid email address,
            keep your password confidential, and promptly notify us of suspected
            unauthorized access. You are responsible for activity performed through your
            account unless caused by our breach of these Terms or applicable law. You may
            not share, sell, transfer, or automate access to an account.
          </p>
          <p>
            We may require email verification, password re-entry, or another reasonable
            security step. You can permanently delete your account through the{" "}
            <Link href="/account">Account page</Link>.
          </p>
        </section>

        <section>
          <h2>4. License and permitted use</h2>
          <p>
            Subject to these Terms, {operatorName} grants you a limited, personal,
            non-exclusive, non-transferable, revocable license to access and use the
            Service for lawful entertainment and evaluation. No ownership interest is
            transferred to you.
          </p>
          <p>You may not:</p>
          <ul>
            <li>Break laws, infringe rights, harass others, or facilitate harmful conduct.</li>
            <li>
              Probe, disrupt, overload, bypass, or defeat security, access controls, rate
              limits, or technical restrictions.
            </li>
            <li>
              Use bots, scraping, or automated requests that burden the Service without
              written permission.
            </li>
            <li>
              Reverse engineer or copy the Service except where applicable law expressly
              allows it.
            </li>
            <li>
              Misrepresent simulator output as real-world air traffic control, safety,
              training, or navigation advice.
            </li>
            <li>Introduce malware or attempt to access another user’s account or data.</li>
          </ul>
        </section>

        <section>
          <h2>5. Entertainment-only aviation simulation</h2>
          <p>
            Airport layouts, aircraft performance, procedures, clearances, traffic, maps,
            and other simulation elements are simplified, incomplete, and may be outdated
            or inaccurate. Do not use any part of the Service to plan, control, navigate,
            dispatch, or operate an aircraft, vehicle, or real-world facility. Always rely
            on authorized publications, certified equipment, qualified instructors, and
            applicable regulations for real aviation activity.
          </p>
        </section>

        <section>
          <h2>6. Service changes and availability</h2>
          <p>
            We may add, change, suspend, or discontinue features, airports, accounts, or
            the Service. We do not promise uninterrupted availability, preservation of
            scores, or compatibility with every device. We will use reasonable care when
            a change materially affects paid or legally protected rights; Pacific Radar
            currently offers no paid account plan.
          </p>
        </section>

        <section>
          <h2>7. Intellectual property and third-party materials</h2>
          <p>
            The Service, including its software, visual design, text, simulation logic,
            and branding, is owned by {operatorName} or its licensors and is protected by
            intellectual-property laws. “Pacific Radar” and associated presentation may
            not be used to imply endorsement.
          </p>
          <p>
            Airport and aviation facts may be derived from public sources such as FAA
            materials. Maps, imagery, fonts, platform software, and other materials may be
            provided by third parties and remain subject to their own rights and terms.
            References to airports, airlines, aircraft, agencies, or trademarks are
            descriptive and do not imply affiliation or endorsement.
          </p>
        </section>

        <section>
          <h2>8. Suspension and termination</h2>
          <p>
            You may stop using the Service at any time. We may restrict or terminate
            access when we reasonably believe you violated these Terms, created security
            or legal risk, or used the Service abusively. Where practical, we will provide
            notice and an opportunity to appeal unless doing so would increase risk or
            violate law. Provisions that by their nature should survive termination will
            survive, including ownership, disclaimers, liability limits, and dispute terms.
          </p>
        </section>

        <section>
          <h2>9. Disclaimers</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED “AS IS” AND
            “AS AVAILABLE.” WE DISCLAIM IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS
            FOR A PARTICULAR PURPOSE, QUIET ENJOYMENT, NON-INFRINGEMENT, ACCURACY, AND
            SAFETY. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE,
            ERROR-FREE, OR SUITABLE FOR OPERATIONAL AVIATION OR FORMAL TRAINING.
          </p>
          <p>
            Some jurisdictions do not allow certain warranty exclusions, so some of this
            section may not apply to you. Nothing in these Terms excludes a warranty or
            right that cannot lawfully be excluded.
          </p>
        </section>

        <section>
          <h2>10. Limitation of liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, {operatorName.toUpperCase()} AND ITS
            CONTRIBUTORS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL,
            CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOST DATA, PROFITS,
            GOODWILL, OR OPPORTUNITY, ARISING FROM THE SERVICE. OUR TOTAL LIABILITY FOR
            ALL CLAIMS RELATING TO THE SERVICE WILL NOT EXCEED THE GREATER OF US$100 OR
            THE AMOUNT YOU PAID US FOR THE SERVICE DURING THE 12 MONTHS BEFORE THE EVENT
            GIVING RISE TO THE CLAIM.
          </p>
          <p>
            These limits do not apply to liability that cannot be limited by law,
            including where applicable fraud, willful misconduct, or death or personal
            injury caused by negligence. The limits apply only to the extent permitted in
            your jurisdiction.
          </p>
        </section>

        <section>
          <h2>11. Governing law and disputes</h2>
          <p>
            These Terms are governed by the laws of California, excluding conflict-of-law
            rules. Before filing a claim, you and {operatorName} agree to make a good-faith
            effort for 30 days to resolve it informally by emailing{" "}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. If it is not resolved,
            claims may be brought in a court with lawful jurisdiction. Mandatory consumer
            protections and your right to use eligible small-claims or local consumer
            forums are not restricted by this section.
          </p>
        </section>

        <section>
          <h2>12. Changes to these Terms</h2>
          <p>
            We may update these Terms to reflect changes in the Service, law, security, or
            business practices. If a change materially reduces your rights, we will give
            reasonable advance notice through the Service or by email when appropriate.
            The effective date above identifies the current version. Continued use after
            the revised Terms take effect means you accept them; if you do not agree, you
            must stop using the Service and may delete your account.
          </p>
        </section>

        <section>
          <h2>13. General terms and contact</h2>
          <p>
            These Terms and the Privacy Policy are the entire agreement about the Service.
            If one provision is unenforceable, it will be limited to the minimum necessary
            and the rest will remain effective. A failure to enforce a provision is not a
            waiver. You may not assign these Terms without our consent; we may assign them
            in connection with a reorganization or transfer of the Service, subject to
            applicable law.
          </p>
          <p>
            Questions about these Terms can be sent to{" "}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          </p>
        </section>

        <div className="legal-document-links">
          <Link href="/privacy">Read the Privacy Policy →</Link>
          <Link href="/">Return to Pacific Radar</Link>
        </div>
      </article>
    </AccountShell>
  );
}
