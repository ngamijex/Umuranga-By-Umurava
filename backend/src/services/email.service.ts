import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  if (!host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === "true" || port === 465,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
  }
  return transporter;
}

export function isEmailConfigured(): boolean {
  return !!process.env.SMTP_HOST;
}

/** Plain text → simple HTML (newlines preserved). */
export function textToHtml(text: string): string {
  const esc = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a;"><p style="white-space:pre-wrap;">${esc.replace(/\n/g, "<br/>")}</p></body></html>`;
}

export async function sendApplicantEmail(
  to: string,
  subject: string,
  bodyText: string
): Promise<{ ok: boolean; simulated?: boolean; messageId?: string; error?: string }> {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || "noreply@localhost";
  const t = getTransporter();
  if (!t) {
    console.warn(
      `[email] SMTP not configured (set SMTP_HOST). Would send to ${to}: ${subject.slice(0, 60)}…`
    );
    return { ok: true, simulated: true };
  }
  try {
    const info = await t.sendMail({
      from,
      to,
      subject,
      text: bodyText,
      html: textToHtml(bodyText),
    });
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[email] send failed:", msg);
    return { ok: false, error: msg };
  }
}
