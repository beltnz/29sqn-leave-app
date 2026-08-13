import nodemailer from "nodemailer";
import { getSystemSetting } from "@/app/actions";

export interface SendEmailOptions {
  to: string;
  bcc?: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
}

function cleanEnvVal(val: string | undefined): string | undefined {
  if (!val) return undefined;
  let cleaned = val.trim();
  if (cleaned.includes("#")) {
    cleaned = cleaned.split("#")[0].trim();
  }
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.substring(1, cleaned.length - 1).trim();
  }
  return cleaned || undefined;
}

/**
 * Sends an email using Nodemailer over Port 587 / 465 (bypassing ISP Port 25 blocks).
 * If SMTP credentials are missing from process.env, logs to console in simulated mode.
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; simulated?: boolean; error?: string }> {
  const host = cleanEnvVal(process.env.SMTP_HOST);
  const portStr = cleanEnvVal(process.env.SMTP_PORT);
  const port = parseInt(portStr || "587", 10);
  const user = cleanEnvVal(process.env.SMTP_USER);
  const pass = cleanEnvVal(process.env.SMTP_PASS);
  const fromAddress = options.from || cleanEnvVal(process.env.SMTP_FROM) || "donotreply@29squadron.org.nz";

  // If no SMTP host is configured in .env, run in simulation mode
  if (!host || !user || !pass) {
    console.log(`\n============================================================`);
    console.log(`[SIMULATED EMAIL DISPATCH - NO SMTP CONFIGURED]`);
    console.log(`From: ${fromAddress}`);
    console.log(`To: ${options.to}`);
    if (options.bcc) console.log(`BCC: ${options.bcc}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Body:\n${options.text}`);
    console.log(`============================================================\n`);

    return {
      success: true,
      simulated: true,
      messageId: `simulated-${Date.now()}`,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for 587
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
    });

    const unitName = (await getSystemSetting("unit_name")) || "29 Squadron";
    const info = await transporter.sendMail({
      from: `"${unitName} Leave Portal" <${fromAddress}>`,
      to: options.to,
      ...(options.bcc ? { bcc: options.bcc } : {}),
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log(`[REAL EMAIL DISPATCH SUCCESS] MessageId: ${info.messageId} | To: ${options.to}`);

    return {
      success: true,
      simulated: false,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error(`[SMTP ERROR] Failed to send email to ${options.to}:`, error);
    return {
      success: false,
      simulated: false,
      error: error.message || "Failed to transmit email via SMTP server",
    };
  }
}
