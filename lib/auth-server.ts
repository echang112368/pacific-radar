import { getSessionCookie } from "better-auth/cookies";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAuth } from "./auth";

export async function getSession() {
  const requestHeaders = await headers();
  if (!getSessionCookie(requestHeaders)) return null;

  return createAuth().api.getSession({
    headers: requestHeaders,
  });
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/");
  return session;
}
