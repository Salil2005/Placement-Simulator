const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM } = require("../config/env");

let transporter = null;

/** Lazily builds the SMTP transporter. Returns null if SMTP isn't configured. */
function getTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  if (transporter) return transporter;

  // Lazy require so the app still boots if nodemailer isn't installed yet.
  const nodemailer = require("nodemailer");
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

/**
 * Sends an email if SMTP is configured; otherwise logs it to the console so
 * the verification flow is still fully testable in local/dev setups.
 */
async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();

  if (!t) {
    console.log("\n[email:dev-fallback] SMTP not configured - printing email instead of sending it.");
    console.log(`[email:dev-fallback] To: ${to}`);
    console.log(`[email:dev-fallback] Subject: ${subject}`);
    console.log(`[email:dev-fallback] Body:\n${text || html}\n`);
    return { delivered: false, mode: "console" };
  }

  await t.sendMail({ from: SMTP_FROM, to, subject, html, text });
  return { delivered: true, mode: "smtp" };
}

async function sendVerificationEmail({ to, name, verifyUrl }) {
  return sendMail({
    to,
    subject: "Verify your Placement Simulator account",
    text: `Hi ${name},\n\nPlease verify your email by opening this link:\n${verifyUrl}\n\nThis link expires soon, so please use it promptly.\n\nIf you didn't create this account, you can ignore this email.`,
    html: `<p>Hi ${name},</p><p>Please verify your email by clicking the link below:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires soon, so please use it promptly.</p><p>If you didn't create this account, you can ignore this email.</p>`,
  });
}

module.exports = { sendMail, sendVerificationEmail };
