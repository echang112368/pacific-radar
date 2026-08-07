import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import * as schema from "../db/schema";
import { sendAccountEmail } from "./email";
import { LEGAL_VERSION } from "./legal";

const LOCAL_DEVELOPMENT_SECRET =
  "pacific-radar-local-development-secret-change-before-deploying";

export function createAuth() {
  const secret =
    process.env.BETTER_AUTH_SECRET ??
    (process.env.NODE_ENV === "production"
      ? undefined
      : LOCAL_DEVELOPMENT_SECRET);

  if (!secret) {
    throw new Error(
      "BETTER_AUTH_SECRET is required in production. Configure a random secret of at least 32 characters in the hosting environment.",
    );
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
      minPasswordLength: 10,
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
          },
        },
      },
    },
    verification: {
      storeIdentifier: "hashed",
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 8 },
        "/sign-up/email": { window: 60, max: 5 },
        "/send-verification-email": { window: 300, max: 3 },
        "/request-password-reset": { window: 300, max: 3 },
        "/reset-password": { window: 300, max: 5 },
        "/delete-user": { window: 300, max: 3 },
      },
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip"],
      },
    },
  });
}
