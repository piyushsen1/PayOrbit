import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { ErrorCodes } from '../utils/error-codes';

export function isEmailConfigured(): boolean {
  return !!env.SMTP_HOST;
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!isEmailConfigured()) {
    throw new AppError(
      ErrorCodes.EMAIL_NOT_CONFIGURED,
      'Email sending is not configured (SMTP_HOST is unset) — set SMTP_* env vars to enable bulk payslip emails.',
      422
    );
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    });
  }
  return transporter;
}

export async function sendPayslipEmail(to: string, subject: string, text: string, pdfBuffer: Buffer, filename: string) {
  const client = getTransporter();
  await client.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    text,
    attachments: [{ filename, content: pdfBuffer, contentType: 'application/pdf' }],
  });
}
