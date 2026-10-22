import nodemailer from "nodemailer";

// Wesh Star IA's own outgoing mail (password reset / moderator invites).
// Configure SMTP_* to any provider or a self-hosted mail server — this
// replaces the emails Supabase Auth used to send.
let transport: ReturnType<typeof nodemailer.createTransport> | null | undefined;

function getTransport() {
  if (transport !== undefined) return transport;
  const host = process.env.SMTP_HOST;
  if (!host) { transport = null; return transport; }
  transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
  return transport;
}

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  const t = getTransport();
  if (!t) {
    // No SMTP configured: don't crash signup/reset flows in dev — log instead.
    console.warn("[mailer] SMTP_HOST not set — email NOT sent. To:", to, "Subject:", subject);
    return;
  }
  await t.sendMail({ from: process.env.SMTP_FROM || "Wesh Star IA <no-reply@wesh-ia-star.local>", to, subject, html });
}
