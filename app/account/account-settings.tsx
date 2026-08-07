"use client";

import { FormEvent, useState } from "react";
import { authClient } from "../../lib/auth-client";

type AccountSettingsProps = {
  name: string;
  email: string;
  emailVerified: boolean;
};

export function AccountSettings({ name, email, emailVerified }: AccountSettingsProps) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || confirmation !== "DELETE") return;
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const result = await authClient.deleteUser({
        password,
        callbackURL: "/?deleted=true",
      });
      if (result.error) {
        const detail = result.error.message ?? "";
        setError(
          /password/i.test(detail)
            ? "The current password is incorrect."
            : /too many|rate limit/i.test(detail)
              ? "Too many attempts. Please wait a few minutes and try again."
              : "We could not start account deletion. Please try again.",
        );
        return;
      }
      setPassword("");
      setConfirmation("");
      setMessage(
        "Check your email to finish deletion. The confirmation link expires in 1 hour, and your account remains active until you use it.",
      );
    } catch {
      setError("The authentication service is unavailable. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="account-settings">
      <section className="account-profile-summary" aria-labelledby="profile-heading">
        <div>
          <p className="eyebrow">CONTROLLER PROFILE</p>
          <h2 id="profile-heading">{name}</h2>
          <p>{email}</p>
        </div>
        <span className={emailVerified ? "is-verified" : ""}>
          {emailVerified ? "✓ Email verified" : "Email unverified"}
        </span>
      </section>

      <section className="account-security-note">
        <h2>Account security</h2>
        <p>
          Password-reset links expire after 30 minutes and revoke all sessions.
          Verification links expire after 24 hours. Pacific Radar never stores
          your password in readable form.
        </p>
      </section>

      <section className="account-danger-zone" aria-labelledby="delete-heading">
        <p className="eyebrow">DANGER ZONE</p>
        <h2 id="delete-heading">Permanently delete account</h2>
        <p>
          This deletes your profile, email address, password credential, sessions,
          and verification records. Local high scores stored in this browser must
          be cleared from the browser separately. This action cannot be undone.
        </p>

        <form className="auth-form account-delete-form" onSubmit={handleDelete}>
          <label>
            Current password
            <input
              autoComplete="current-password"
              disabled={submitting}
              maxLength={128}
              minLength={10}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          <label>
            Type DELETE to confirm
            <input
              autoComplete="off"
              disabled={submitting}
              onChange={(event) => setConfirmation(event.target.value)}
              pattern="DELETE"
              required
              type="text"
              value={confirmation}
            />
          </label>
          {message ? <p className="auth-success-message" role="status">{message}</p> : null}
          {error ? <p className="auth-error" role="alert">{error}</p> : null}
          <button
            className="danger-button"
            disabled={submitting || confirmation !== "DELETE"}
            type="submit"
          >
            {submitting ? "Sending confirmation…" : "Email deletion confirmation"}
          </button>
        </form>
      </section>
    </div>
  );
}
