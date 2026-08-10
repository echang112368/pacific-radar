type AccountEmail = {
  to: string;
  name: string;
  subject: string;
  preheader: string;
  heading: string;
  message: string;
  actionLabel: string;
  url: string;
  expires: string;
};

function validateAccountEmail(email: AccountEmail) {
  if (
    email.to.length > 254 ||
    /[\r\n]/u.test(email.to) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email.to)
  ) {
    throw new Error("Refusing to send account email to an invalid address.");
  }

  const actionUrl = new URL(email.url);
  const configuredBaseUrl = process.env.BETTER_AUTH_URL;
  const configuredOrigin = configuredBaseUrl
    ? new URL(configuredBaseUrl).origin
    : null;
  const isLocalDevelopment =
    process.env.NODE_ENV !== "production" &&
    ["localhost", "127.0.0.1"].includes(actionUrl.hostname);

  if (
    actionUrl.username ||
    actionUrl.password ||
    actionUrl.href.length > 2048 ||
    !actionUrl.pathname.startsWith("/api/auth/") ||
    (configuredOrigin
      ? actionUrl.origin !== configuredOrigin
      : !isLocalDevelopment) ||
    (process.env.NODE_ENV === "production" && actionUrl.protocol !== "https:")
  ) {
    throw new Error("Refusing to send an untrusted account action URL.");
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function emailHtml(email: AccountEmail) {
  const safe = Object.fromEntries(
    Object.entries(email).map(([key, value]) => [key, escapeHtml(value)]),
  ) as Record<keyof AccountEmail, string>;

  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
  <body style="margin:0;background:#06110e;color:#edf7f2;font-family:Arial,Helvetica,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${safe.preheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#06110e;padding:36px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border:1px solid #285848;background:#0b1b16">
          <tr><td style="padding:24px 28px;border-bottom:1px solid #244a3d;color:#60f2bd;font-size:12px;font-weight:700;letter-spacing:2px">PR&nbsp;&nbsp; PACIFIC RADAR</td></tr>
          <tr><td style="padding:34px 28px">
            <p style="margin:0 0 10px;color:#86a59a;font-size:13px">Hello ${safe.name || "Controller"},</p>
            <h1 style="margin:0 0 16px;color:#f0faf5;font-size:28px;line-height:1.2">${safe.heading}</h1>
            <p style="margin:0 0 26px;color:#b5c9c1;font-size:15px;line-height:1.65">${safe.message}</p>
            <a href="${safe.url}" style="display:inline-block;padding:14px 20px;background:#60f2bd;color:#06110e;font-size:14px;font-weight:700;text-decoration:none">${safe.actionLabel} →</a>
            <p style="margin:26px 0 8px;color:#789289;font-size:12px;line-height:1.55">This link expires ${safe.expires}. If you did not request this, you can safely ignore this email.</p>
            <p style="margin:0;color:#587168;font-size:11px;line-height:1.55;word-break:break-all">If the button does not work, copy this address into your browser:<br>${safe.url}</p>
          </td></tr>
          <tr><td style="padding:18px 28px;border-top:1px solid #244a3d;color:#587168;font-size:11px">Pacific Radar · Air Traffic Control Simulator</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function emailText(email: AccountEmail) {
  return `${email.heading}\n\nHello ${email.name || "Controller"},\n\n${email.message}\n\n${email.actionLabel}: ${email.url}\n\nThis link expires ${email.expires}. If you did not request this, you can safely ignore this email.\n\nPacific Radar`;
}

function bytesToBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }

  return btoa(binary);
}

function wrapBase64(value: string) {
  return bytesToBase64(value).match(/.{1,76}/gu)?.join("\r\n") ?? "";
}

function encodeMimeHeader(value: string) {
  if (/^[\x20-\x7e]*$/u.test(value)) return value;
  return `=?UTF-8?B?${bytesToBase64(value)}?=`;
}

function validateHeader(value: string, label: string) {
  if (!value.trim() || /[\r\n]/u.test(value)) {
    throw new Error(`Refusing to send account email with an invalid ${label}.`);
  }
}

function buildMimeMessage(email: AccountEmail, senderEmail: string) {
  const senderName = process.env.GMAIL_SENDER_NAME?.trim() || "Pacific Radar";
  const replyTo = process.env.GMAIL_REPLY_TO_EMAIL?.trim();
  const boundary = `pacific-radar-${crypto.randomUUID()}`;

  validateHeader(senderName, "sender name");
  validateHeader(email.subject, "subject");
  validateHeader(senderEmail, "sender address");
  if (replyTo) validateHeader(replyTo, "reply-to address");

  const headers = [
    `From: ${encodeMimeHeader(senderName)} <${senderEmail}>`,
    `To: ${email.to}`,
    `Subject: ${encodeMimeHeader(email.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary=\"${boundary}\"`,
    ...(replyTo ? [`Reply-To: ${replyTo}`] : []),
  ];
  const parts = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(emailText(email)),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(emailHtml(email)),
    `--${boundary}--`,
    "",
  ];

  return [...headers, "", ...parts].join("\r\n");
}

async function getGmailAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Gmail OAuth token exchange failed with status ${response.status}.`);
  }

  const token = (await response.json()) as { access_token?: unknown };
  if (typeof token.access_token !== "string" || !token.access_token) {
    throw new Error("Gmail OAuth token exchange returned no access token.");
  }

  return token.access_token;
}

export async function sendAccountEmail(email: AccountEmail) {
  validateAccountEmail(email);

  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  const senderEmail = process.env.GMAIL_SENDER_EMAIL?.trim();

  if (!clientId || !clientSecret || !refreshToken || !senderEmail) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[Pacific Radar email preview] ${email.to}: ${email.url}`);
      return;
    }
    throw new Error(
      "Transactional email is not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, and GMAIL_SENDER_EMAIL.",
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(senderEmail)) {
    throw new Error("GMAIL_SENDER_EMAIL must be a valid email address.");
  }

  const accessToken = await getGmailAccessToken(
    clientId,
    clientSecret,
    refreshToken,
  );
  const raw = bytesToBase64(buildMimeMessage(email, senderEmail))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gmail message send failed with status ${response.status}.`);
  }
}
