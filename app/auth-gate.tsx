"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { authClient } from "../lib/auth-client";
import { AirportCarousel } from "./airport-carousel";
import { LegalFooter } from "./legal-footer";

type AuthMode = "sign-in" | "sign-up";

function readableAuthError(message?: string) {
  if (!message) return "We could not complete that request. Please try again.";
  if (/invalid email or password/i.test(message)) {
    return "The email or password is incorrect.";
  }
  if (/already exists|already registered/i.test(message)) {
    return "An account already exists for that email.";
  }
  if (/email.*not.*verified|not.*verified/i.test(message)) {
    return "Verify your email before signing in. We sent a fresh verification link.";
  }
  if (/too many requests|rate limit/i.test(message)) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  return message;
}

type AuthGateProps = {
  initialNotice?: string | null;
};

export function AuthGate({ initialNotice = null }: AuthGateProps) {
  const { data: session, isPending } = authClient.useSession();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(initialNotice);

  if (!isPending && session?.user) {
    return <AirportCarousel displayName={session.user.name || session.user.email} />;
  }

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setNotice(null);
    setPassword("");
    setConfirmPassword("");
  };

  const handleResend = async () => {
    if (!email || resending) return;
    setResending(true);
    setError(null);
    try {
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/?verified=true",
      });
      if (result.error) {
        setError(readableAuthError(result.error.message));
        return;
      }
      setNotice(
        "If that address has an unverified account, a fresh link is on the way.",
      );
    } catch {
      setError("The email service is unavailable. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    if (mode === "sign-up" && password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result =
        mode === "sign-in"
          ? await authClient.signIn.email({ email, password, rememberMe })
          : await authClient.signUp.email({
              name: name.trim(),
              email,
              password,
              callbackURL: "/?verified=true",
              termsAccepted,
            });

      if (result.error) {
        setError(readableAuthError(result.error.message));
        return;
      }

      if (mode === "sign-up") {
        setPassword("");
        setConfirmPassword("");
        setNotice(
          "Account created. Check your inbox and verify your email before signing in.",
        );
        return;
      }

      window.location.reload();
    } catch {
      setError("The authentication service is unavailable. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-home">
      <div className="login-home-background" aria-hidden="true" />
      <header className="login-home-header">
        <div className="login-brand">
          <span aria-hidden="true">PR</span>
          <strong>PACIFIC RADAR</strong>
        </div>
        <button
          onClick={() => {
            switchMode("sign-in");
            document.querySelector<HTMLInputElement>("#email")?.focus();
          }}
          type="button"
        >
          Log in
        </button>
      </header>

      <section className="login-home-content">
        <div className="login-title">
          <div className="login-radar-mark" aria-hidden="true">
            <span />
            <i />
          </div>
          <h1>PACIFIC RADAR</h1>
          <p>Air Traffic Control Simulator</p>
        </div>

        <div className="login-card" id="account-access">
          <p>WELCOME, CONTROLLER</p>
          <h2>{mode === "sign-in" ? "Sign in to play" : "Create your account"}</h2>

          <div className="auth-mode-tabs" role="tablist" aria-label="Account access">
            <button
              aria-selected={mode === "sign-in"}
              className={mode === "sign-in" ? "is-active" : ""}
              onClick={() => switchMode("sign-in")}
              role="tab"
              type="button"
            >
              Log in
            </button>
            <button
              aria-selected={mode === "sign-up"}
              className={mode === "sign-up" ? "is-active" : ""}
              onClick={() => switchMode("sign-up")}
              role="tab"
              type="button"
            >
              Sign up
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "sign-up" ? (
              <label>
                Controller name
                <input
                  autoComplete="name"
                  disabled={submitting || isPending}
                  maxLength={80}
                  minLength={2}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="How you will appear in game"
                  required
                  type="text"
                  value={name}
                />
              </label>
            ) : null}

            <label>
              Email
              <input
                autoCapitalize="none"
                autoComplete="email"
                disabled={submitting || isPending}
                id="email"
                inputMode="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="controller@example.com"
                required
                spellCheck={false}
                type="email"
                value={email}
              />
            </label>

            <label>
              Password
              <input
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                disabled={submitting || isPending}
                maxLength={128}
                minLength={10}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === "sign-up" ? "At least 10 characters" : "Enter your password"}
                required
                type="password"
                value={password}
              />
            </label>

            {mode === "sign-up" ? (
              <>
                <label>
                  Confirm password
                  <input
                    autoComplete="new-password"
                    disabled={submitting || isPending}
                    maxLength={128}
                    minLength={10}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    type="password"
                    value={confirmPassword}
                  />
                </label>
                <label className="auth-consent">
                  <input
                    checked={termsAccepted}
                    disabled={submitting || isPending}
                    onChange={(event) => setTermsAccepted(event.target.checked)}
                    required
                    type="checkbox"
                  />
                  <span>
                    I agree to the <Link href="/terms">Terms of Service</Link> and
                    acknowledge the <Link href="/privacy">Privacy Policy</Link>.
                  </span>
                </label>
              </>
            ) : (
              <div className="auth-form-options">
                <label className="auth-remember">
                  <input
                    checked={rememberMe}
                    disabled={submitting || isPending}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    type="checkbox"
                  />
                  Keep me signed in
                </label>
                <Link href="/forgot-password">Forgot password?</Link>
              </div>
            )}

            {notice ? (
              <div className="auth-success" role="status">
                <p>{notice}</p>
                {mode === "sign-up" ? (
                  <button disabled={resending} onClick={handleResend} type="button">
                    {resending ? "Sending…" : "Resend verification email"}
                  </button>
                ) : null}
              </div>
            ) : null}

            {error ? (
              <p className="auth-error" role="alert">
                {error}
              </p>
            ) : null}

            <button className="login-button" disabled={submitting || isPending} type="submit">
              <span>
                {submitting
                  ? "Please wait…"
                  : mode === "sign-in"
                    ? "Log in"
                    : "Create account"}
              </span>
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <p className="auth-footnote">
            {mode === "sign-in" ? "New to Pacific Radar? " : "Already have an account? "}
            <button
              onClick={() => switchMode(mode === "sign-in" ? "sign-up" : "sign-in")}
              type="button"
            >
              {mode === "sign-in" ? "Create one" : "Log in"}
            </button>
          </p>
        </div>
      </section>
      <LegalFooter className="login-legal-footer" />
    </main>
  );
}
