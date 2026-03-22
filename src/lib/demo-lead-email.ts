import { emailService } from "@/lib/services/email.service";

/** Inbox for demo gate submissions; override with DEMO_LEAD_NOTIFY_EMAIL. */
export const DEMO_LEAD_NOTIFY_EMAIL =
  process.env.DEMO_LEAD_NOTIFY_EMAIL || "hi@smartstart.us";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendDemoLeadNotification(params: {
  fullName: string;
  phone: string;
  email: string;
}): Promise<void> {
  const { fullName, phone, email } = params;
  const subject = `Demo signup: ${fullName}`;
  const text = `Name: ${fullName}\nPhone: ${phone}\nEmail: ${email}`;
  const safeName = escapeHtml(fullName);
  const safePhone = escapeHtml(phone);
  const safeEmail = escapeHtml(email);
  const mailtoHref = `mailto:${encodeURIComponent(email)}`;
  const html = `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0; padding: 0;">
        <h2 style="margin: 0 0 12px; font-size: 18px;">New demo gate submission</h2>
        <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
          <tr><td style="padding: 6px 0; color:#64748b; width: 88px;">Name</td><td>${safeName}</td></tr>
          <tr><td style="padding: 6px 0; color:#64748b;">Phone</td><td>${safePhone}</td></tr>
          <tr><td style="padding: 6px 0; color:#64748b;">Email</td><td><a href="${mailtoHref}">${safeEmail}</a></td></tr>
        </table>
        <p style="margin: 16px 0 0; font-size: 12px; color:#94a3b8;">SmartStartPM · demo sign-in form</p>
      </div>
    `;

  const primary = await emailService.sendEmail({
    to: DEMO_LEAD_NOTIFY_EMAIL,
    subject,
    text,
    html,
    replyTo: email,
  });
  if (primary.success) return;

  try {
    const user = process.env.EMAIL_SERVER_USER;
    const pass = process.env.EMAIL_SERVER_PASSWORD;
    const host = process.env.EMAIL_SERVER_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.EMAIL_SERVER_PORT || "587", 10);
    if (!user || !pass) {
      console.warn("[DemoLead] Email not configured; notification skipped");
      return;
    }
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: user,
      to: DEMO_LEAD_NOTIFY_EMAIL,
      subject,
      text,
      html,
      replyTo: email,
    });
  } catch (err) {
    console.warn("[DemoLead] Fallback email failed:", err);
  }
}
