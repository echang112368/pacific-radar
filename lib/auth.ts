import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { getDb } from "../db";
import * as schema from "../db/schema";

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
      revokeSessionsOnPasswordReset: true,
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 8 },
        "/sign-up/email": { window: 60, max: 5 },
      },
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip"],
      },
    },
  });
}
