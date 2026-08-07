"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { authClient } from "../../lib/auth-client";

type ResetPasswordFormProps = {
  token: string | null;
  tokenError: boolean;
};

export function ResetPasswordForm({ token, tokenError }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || submitting) return;
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (result.error) {
        setError(
          /token|expired/i.test(result.error.message ?? "")
            ? "This reset link is invalid or has expired. Request a new one."
            : result.error.message ?? "We could not reset your password.",
        );
        return;
      }
      setComplete(true);
    } catch {
      setError("The authentication service is unavailable. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (complete) {
    return (
      <div className="account-flow-result" role="status">
        <span aria-hidden="true">✓</span>
        <h2>Password updated</h2>
        <p>Your other sessions were signed out to protect your account.</p>
        <Link className="login-button account-flow-result-primary" href="/">
          Log in with your new password <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="account-flow-result is-error" role="alert">
        <span aria-hidden="true">!</span>
        <h2>Reset link unavailable</h2>
        <p>This link is invalid, expired, or has already been used.</p>
        <Link className="login-button account-flow-result-primary" href="/forgot-password">
          Request a new link <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  return (
    <form className="auth-form account-flow-form" onSubmit={handleSubmit}>
      <label>
        New password
        <input
          autoComplete="new-password"
          disabled={submitting}
          maxLength={128}
          minLength={10}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 10 characters"
          required
          type="password"
          value={password}
        />
      </label>
      <label>
        Confirm new password
        <input
          autoComplete="new-password"
          disabled={submitting}
          maxLength={128}
          minLength={10}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          type="password"
          value={confirmPassword}
        />
      </label>
      <p className="password-guidance">10–128 characters. A unique passphrase is recommended.</p>
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      <button className="login-button" disabled={submitting} type="submit">
        <span>{submitting ? "Updating…" : "Update password"}</span>
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
