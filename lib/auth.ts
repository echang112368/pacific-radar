import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { haveIBeenPwned } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import * as schema from "../db/schema";
import { sendAccountEmail } from "./email";
import { LEGAL_VERSION } from "./legal";

const LOCAL_DEVELOPMENT_SECRET =
  "pacific-radar-local-development-secret-change-before-deploying";
const MINIMUM_PASSWORD_LENGTH = 15;

function normalizeDisplayName(value: unknown) {
  if (typeof value !== "string") return null;
  const name = value.normalize("NFKC").trim().replace(/\s+/gu, " ");

  if (name.length < 2 || name.length > 80) return null;
  if (!/[\p{L}\p{N}]/u.test(name)) return null;
  if (!/^[\p{L}\p{M}\p{N} .,'’_-]+$/u.test(name)) return null;

  return name;
}

export function createAuth() {
  const isProduction = process.env.NODE_ENV === "production";
  const secret =
    process.env.BETTER_AUTH_SECRET ??
    (isProduction ? undefined : LOCAL_DEVELOPMENT_SECRET);

  if (!secret || secret.length < 32) {
    throw new Error(
      "BETTER_AUTH_SECRET is required in production. Configure a random secret of at least 32 characters in the hosting environment.",
    );
  }

  if (
    isProduction &&
    (!process.env.BETTER_AUTH_URL ||
      new URL(process.env.BETTER_AUTH_URL).protocol !== "https:")
  ) {
    throw new Error("BETTER_AUTH_URL must be an HTTPS URL in production.");
  }

  return betterAuth({
    appName: "Pacific Radar",
    baseURL: process.env.BETTER_AUTH_URL ?? {
      allowedHosts: ["localhost", "127.0.0.1"],
      fallback: "http://localhost:3000",
      protocol: "http",
    },
    secret,
    database: drizzleAdapter(getDb(), {
      provider: "sqlite",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      minPasswordLength: MINIMUM_PASSWORD_LENGTH,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      resetPasswordTokenExpiresIn: 30 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await sendAccountEmail({
          to: user.email,
          name: user.name,
          subject: "Reset your Pacific Radar password",
          preheader: "Use this secure link to choose a new password.",
          heading: "Reset your password",
          message:
            "We received a request to reset the password for your Pacific Radar account. Use the secure link below to choose a new one.",
          actionLabel: "Reset password",
          url,
          expires: "in 30 minutes",
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 24 * 60 * 60,
      sendVerificationEmail: async ({ user, url }) => {
        await sendAccountEmail({
          to: user.email,
          name: user.name,
          subject: "Verify your Pacific Radar email",
          preheader: "Confirm your email address to activate your account.",
          heading: "Confirm your frequency",
          message:
            "Verify this email address to activate your Pacific Radar account and enter the control room.",
          actionLabel: "Verify email",
          url,
          expires: "in 24 hours",
        });
      },
    },
    user: {
      additionalFields: {
        termsAccepted: {
          type: "boolean",
          required: true,
          returned: false,
        },
        termsAcceptedAt: {
          type: "date",
          input: false,
          returned: false,
          defaultValue: () => new Date(),
        },
        termsVersion: {
          type: "string",
          input: false,
          returned: false,
          defaultValue: LEGAL_VERSION,
        },
      },
      deleteUser: {
        enabled: true,
        deleteTokenExpiresIn: 60 * 60,
        beforeDelete: async (user) => {
          await getDb()
            .delete(schema.verification)
            .where(eq(schema.verification.value, user.id));
        },
        sendDeleteAccountVerification: async ({ user, url }) => {
          await sendAccountEmail({
            to: user.email,
            name: user.name,
            subject: "Confirm deletion of your Pacific Radar account",
            preheader: "Your account will be permanently deleted after confirmation.",
            heading: "Confirm account deletion",
            message:
              "You asked us to permanently delete your Pacific Radar account. This removes your profile, sign-in credentials, and active sessions. This action cannot be undone.",
            actionLabel: "Delete my account",
            url,
            expires: "in 1 hour",
          });
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (user.termsAccepted !== true) return false;
            const name = normalizeDisplayName(user.name);
            if (!name) return false;

            return {
              data: {
                ...user,
                name,
                termsAcceptedAt: new Date(),
                termsVersion: LEGAL_VERSION,
              },
            };
          },
        },
      },
    },
    session: {
      expiresIn: 7 * 24 * 60 * 60,
      updateAge: 12 * 60 * 60,
      cookieCache: {
        enabled: false,
      },
    },
    plugins: [
      haveIBeenPwned({
        customPasswordCompromisedMessage:
          "That password appears in known breach data. Choose a unique passphrase.",
      }),
    ],
    verification: {
      storeIdentifier: "hashed",
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 300, max: 3 },
        "/send-verification-email": { window: 300, max: 3 },
        "/request-password-reset": { window: 900, max: 3 },
        "/reset-password": { window: 900, max: 3 },
        "/delete-user": { window: 900, max: 3 },
      },
    },
    advanced: {
      useSecureCookies: isProduction,
      disableCSRFCheck: false,
      disableOriginCheck: false,
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
        path: "/",
      },
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip"],
      },
    },
  });
}
