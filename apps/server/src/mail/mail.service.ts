import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SendStaffCredentialsOptions {
  to: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
  specialization?: string;
  temporaryPassword: string;
  loginUrl: string;
  hospitalName?: string;
}

export interface MailDispatchResult {
  success: boolean;
  messageId?: string;
  previewUrl?: string;
  error?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter;
  private readonly isConfigured: boolean;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });
      this.isConfigured = true;
      this.logger.log(`MailService initialized with SMTP host: ${host}:${port}`);
    } else {
      // In dev/test environments without SMTP credentials, use JSON/Stream transporter
      // to safely simulate sending without network dependency
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      this.isConfigured = false;
      this.logger.log('MailService initialized in simulation mode (credentials will be logged locally).');
    }
  }

  async sendStaffCredentials(options: SendStaffCredentialsOptions): Promise<MailDispatchResult> {
    const fromAddress = process.env.SMTP_FROM || 'MedCore HMS <noreply@medcore.local>';
    const hospitalName = options.hospitalName || 'MedCore General Hospital';
    const roleFormatted = options.role.replace(/_/g, ' ');

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your MedCore Staff Account Credentials</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
    .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0 0 8px; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 0; font-size: 13px; color: #94a3b8; font-weight: 500; }
    .body-content { padding: 32px 24px; }
    .greeting { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #0f172a; }
    .intro { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .creds-box { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .creds-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 8px; }
    .creds-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .creds-label { color: #64748b; font-weight: 500; }
    .creds-value { font-weight: 700; color: #0f172a; font-family: monospace; }
    .password-highlight { font-size: 16px; color: #0284c7; background: #e0f2fe; padding: 4px 8px; border-radius: 6px; }
    .cta-btn { display: inline-block; background: #0284c7; color: #ffffff !important; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 28px; border-radius: 10px; text-align: center; margin: 12px 0 24px; }
    .notice { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; font-size: 13px; color: #92400e; border-radius: 0 8px 8px 0; margin-bottom: 24px; line-height: 1.5; }
    .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${hospitalName}</h1>
      <p>HMS MedCore SaaS Platform</p>
    </div>
    <div class="body-content">
      <div class="greeting">Hello ${options.firstName} ${options.lastName},</div>
      <p class="intro">
        A staff account has been provisioned for you at <strong>${hospitalName}</strong>. 
        You have been granted access to your clinical and operational workstation.
      </p>

      <div class="creds-box">
        <div class="creds-row">
          <span class="creds-label">Role:</span>
          <span class="creds-value" style="font-family: inherit;">${roleFormatted}</span>
        </div>
        ${options.department ? `
        <div class="creds-row">
          <span class="creds-label">Department:</span>
          <span class="creds-value" style="font-family: inherit;">${options.department}</span>
        </div>` : ''}
        <div class="creds-row">
          <span class="creds-label">Login Email:</span>
          <span class="creds-value">${options.to}</span>
        </div>
        <div class="creds-row">
          <span class="creds-label">Temporary Password:</span>
          <span class="creds-value password-highlight">${options.temporaryPassword}</span>
        </div>
      </div>

      <div style="text-align: center;">
        <a href="${options.loginUrl}" class="cta-btn" target="_blank">
          Access Your Hospital Workstation
        </a>
      </div>

      <div class="notice">
        <strong>Security Policy:</strong> This is a temporary generated password. 
        For patient data privacy and compliance, please change your password immediately upon your first login.
      </div>
    </div>
    <div class="footer">
      This is an automated notification from ${hospitalName} powered by MedCore HMS.<br>
      Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>
    `;

    try {
      const info = await this.transporter.sendMail({
        from: fromAddress,
        to: options.to,
        subject: `Welcome to ${hospitalName} — Your Staff Login Credentials`,
        text: `Welcome to ${hospitalName}!\n\nYour account has been created.\nRole: ${roleFormatted}\nEmail: ${options.to}\nTemporary Password: ${options.temporaryPassword}\nLogin Portal: ${options.loginUrl}\n\nPlease change your password upon your first login.`,
        html: htmlContent,
      });

      this.logger.log(
        `Staff invitation email dispatched to ${options.to} (Role: ${options.role}, MessageId: ${info.messageId || 'simulated'})`,
      );

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to dispatch invitation email to ${options.to}: ${(error as Error).message}`,
      );
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}
