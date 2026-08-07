"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { authClient } from "../../lib/auth-client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });
      if (result.error) {
        setError(
          /too many|rate limit/i.test(result.error.message ?? "")
            ? "Too many attempts. Please wait a few minutes and try again."
            : "We could not send the reset email. Please try again.",
        );
        return;
      }
      setSent(true);
    } catch {
      setError("The email service is unavailable. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="account-flow-result" role="status">
        <span aria-hidden="true">✓</span>
        <h2>Check your inbox</h2>
        <p>
          If an account exists for <strong>{email}</strong>, we sent a reset link.
          It expires in 30 minutes and can only be used once.
        </p>
        <button onClick={() => setSent(false)} type="button">
          Try another email
        </button>
        <Link href="/">Return to log in</Link>
      </div>
    );
  }

  return (
    <form className="auth-form account-flow-form" onSubmit={handleSubmit}>
      <label>
        Account email
        <input
          autoCapitalize="none"
          autoComplete="email"
          disabled={submitting}
          inputMode="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="controller@example.com"
          required
          spellCheck={false}
          type="email"
          value={email}
        />
      </label>
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      <button className="login-button" disabled={submitting} type="submit">
        <span>{submitting ? "Sending…" : "Send reset link"}</span>
        <span aria-hidden="true">→</span>
      </button>
      <Link className="account-flow-back-link" href="/">I remember my password</Link>
    </form>
  );
}
