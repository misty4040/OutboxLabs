import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl: string | false;
  accepted: string[];
}

export class EmailSenderService {
  private transporter: Transporter | null = null;
  private isInitializing = false;

  private async getTransporter(): Promise<Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    if (this.isInitializing) {
      // Wait briefly if another call is initializing
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (this.transporter) return this.transporter;
    }

    this.isInitializing = true;

    try {
      if (env.SMTP_USER && env.SMTP_PASSWORD) {
        // Use configured SMTP credentials
        this.transporter = nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_PORT === 465,
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASSWORD,
          },
        });
        console.log(`📧 Configured SMTP transporter with host: ${env.SMTP_HOST}`);
      } else {
        // Automatically create real Ethereal test account in development
        console.log('📬 No SMTP credentials specified. Auto-generating Ethereal test account...');
        const testAccount = await nodemailer.createTestAccount();

        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });

        console.log('✅ Generated Ethereal Test Account:');
        console.log(`   User: ${testAccount.user}`);
        console.log(`   Web Interface: https://ethereal.email/messages`);
      }

      return this.transporter;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Sends an email via Ethereal SMTP and returns preview URL
   */
  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const transporter = await this.getTransporter();

    const info = await transporter.sendMail({
      from: env.SMTP_FROM,
      to: options.to,
      subject: options.subject,
      text: options.body,
      html: options.html || options.body.replace(/\n/g, '<br />'),
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);

    if (previewUrl) {
      console.log(`✉️ Email delivered to ${options.to}`);
      console.log(`🔗 Ethereal Preview URL: ${previewUrl}`);
    }

    return {
      messageId: info.messageId,
      previewUrl,
      accepted: (info.accepted as string[]) || [options.to],
    };
  }
}

export const emailSenderService = new EmailSenderService();
