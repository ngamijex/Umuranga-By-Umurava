import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

/**
 * The SVG logo file contains two PNG images embedded as base64 data URIs.
 * We extract them so we can use PNG (which all email clients support) instead of SVG.
 *
 * PNG 1 — white silhouette (good on dark/blue backgrounds)
 * PNG 2 — original colour icon (good on light backgrounds)
 */
function loadLogoPngs(): { light: string; dark: string } {
  const fallback = { light: "", dark: "" };
  try {
    const logoPath = path.join(__dirname, "../../../frontend/public/logo.svg");
    const svgText = fs.readFileSync(logoPath, "utf8");
    // Match every  data:image/png;base64,<base64data>  occurrence
    const matches = [...svgText.matchAll(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g)];
    if (matches.length === 0) return fallback;
    // First match is the white/silhouette version (used inside the SVG mask)
    // Second match is the coloured original
    const light = `data:image/png;base64,${matches[0][1]}`;  // white → header
    const dark  = `data:image/png;base64,${matches[matches.length > 1 ? 1 : 0][1]}`; // colour → footer
    return { light, dark };
  } catch {
    return fallback;
  }
}
const { light: LOGO_LIGHT, dark: LOGO_DARK } = loadLogoPngs();

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

/**
 * Convert plain-text email body to a fully branded HTML email.
 * Uses inline CSS only (required for email client compatibility).
 * Brand colors match the Umuranga design system.
 */
export function buildBrandedHtml(bodyText: string): string {
  // Escape HTML entities
  const escaped = bodyText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  // Convert plain text paragraphs / newlines to HTML
  const paragraphs = escaped
    .split(/\n{2,}/)
    .map(para => {
      const line = para.replace(/\n/g, "<br />");
      // Style separator lines (── ... ──)
      if (line.startsWith("──") || line.startsWith("&mdash;")) {
        return `<div style="border-top:1px solid #E5E7EB;margin:16px 0;"></div>`;
      }
      return `<p style="margin:0 0 16px 0;line-height:1.7;color:#374151;">${line}</p>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Umuranga</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F3F4F6;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">

          <!-- ── Header ── -->
          <tr>
            <td style="background-color:#2B72F0;border-radius:12px 12px 0 0;padding:28px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    ${LOGO_LIGHT
                      ? `<img src="${LOGO_LIGHT}" alt="Umuranga" style="height:42px;width:auto;display:block;" />`
                      : `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background-color:#1D4ED8;border-radius:8px;width:36px;height:36px;text-align:center;vertical-align:middle;"><span style="color:#ffffff;font-size:18px;font-weight:800;line-height:36px;font-family:Arial,sans-serif;">U</span></td><td style="padding-left:10px;vertical-align:middle;"><span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.3px;font-family:Arial,sans-serif;">Umuranga</span></td></tr></table>`
                    }
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="color:rgba(255,255,255,0.75);font-size:11px;font-family:Arial,sans-serif;letter-spacing:0.5px;text-transform:uppercase;">AI Talent Screening</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Blue accent bar ── -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#2B72F0,#60A5FA);"></td>
          </tr>

          <!-- ── Body ── -->
          <tr>
            <td style="background-color:#ffffff;padding:40px 40px 32px 40px;">
              <div style="font-size:15px;color:#374151;font-family:Arial,sans-serif;line-height:1.7;">
                ${paragraphs}
              </div>
            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="background-color:#F9FAFB;border-top:1px solid #E5E7EB;border-radius:0 0 12px 12px;padding:24px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <p style="margin:0 0 4px 0;font-size:13px;font-weight:700;color:#111827;font-family:Arial,sans-serif;">The Umuranga Hiring Team</p>
                    <p style="margin:0 0 2px 0;font-size:12px;color:#6B7280;font-family:Arial,sans-serif;">Umuranga &mdash; AI-Powered Talent Screening</p>
                    <p style="margin:0;font-size:12px;color:#2B72F0;font-family:Arial,sans-serif;">
                      <a href="mailto:umuranga.hire@gmail.com" style="color:#2B72F0;text-decoration:none;">umuranga.hire@gmail.com</a>
                    </p>
                  </td>
                  <td align="right" style="vertical-align:bottom;">
                    ${LOGO_DARK
                      ? `<img src="${LOGO_DARK}" alt="Umuranga" style="height:28px;width:auto;display:block;" />`
                      : `<div style="width:32px;height:32px;background-color:#EFF6FF;border-radius:6px;text-align:center;line-height:32px;"><span style="color:#2B72F0;font-size:16px;font-weight:800;font-family:Arial,sans-serif;">U</span></div>`
                    }
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0 0;font-size:11px;color:#9CA3AF;font-family:Arial,sans-serif;">
                This email was sent by Umuranga on behalf of the hiring team. Please do not reply directly to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
      html: buildBrandedHtml(bodyText),
    });
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[email] send failed:", msg);
    return { ok: false, error: msg };
  }
}
