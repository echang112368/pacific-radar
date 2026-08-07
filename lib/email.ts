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

export async function sendAccountEmail(email: AccountEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[Pacific Radar email preview] ${email.to}: ${email.url}`);
      return;
    }
    throw new Error(
      "Transactional email is not configured. Set RESEND_API_KEY and EMAIL_FROM.",
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email.to],
      subject: email.subject,
      html: emailHtml(email),
      text: emailText(email),
      ...(process.env.REPLY_TO_EMAIL
        ? { reply_to: process.env.REPLY_TO_EMAIL }
        : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Transactional email failed (${response.status}): ${detail}`);
  }
}
