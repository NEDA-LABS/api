/**
 * Resend Email Provider
 * Uses fetch API for REST calls (no SDK dependency)
 */

import {
  BaseEmailData,
  EmailProviderError,
  EmailProviderResponse,
  IEmailProvider,
} from '../types.js';
import { getEmailConfig, isValidEmail } from '../config.js';
import { logger } from '../../../utils/logger.js';

export interface ResendConfig {
  apiKey: string;
  defaultFrom: {
    email: string;
    name: string;
  };
}

export class ResendProvider implements IEmailProvider {
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;

  constructor(config?: ResendConfig) {
    if (config) {
      this.apiKey = config.apiKey;
      this.fromEmail = config.defaultFrom.email;
      this.fromName = config.defaultFrom.name;
    } else {
      const cfg = getEmailConfig();
      this.apiKey = cfg.resendApiKey;
      this.fromEmail = cfg.defaultFromEmail;
      this.fromName = cfg.defaultFromName;
    }
  }

  validateConfig(): boolean {
    if (!this.apiKey || this.apiKey.trim() === '') {
      logger.error('Resend API key is missing');
      return false;
    }
    if (!this.fromEmail || !isValidEmail(this.fromEmail)) {
      logger.error('Default from email is missing or invalid');
      return false;
    }
    return true;
  }

  async send(emailData: BaseEmailData): Promise<EmailProviderResponse> {
    try {
      if (!this.validateConfig()) {
        throw new EmailProviderError('Invalid Resend provider configuration');
      }

      if (!emailData.to || emailData.to.length === 0) {
        throw new EmailProviderError('Email must have at least one recipient');
      }

      // Log sending attempt
      logger.info('Sending email via Resend', {
        to: emailData.to.map((t) => t.email),
        subject: emailData.subject,
      });

      // Build Resend payload
      const payload: Record<string, unknown> = {
        from: `${this.fromName} <${this.fromEmail}>`,
        to: emailData.to.map((t) => t.email),
        subject: emailData.subject,
      };

      if (emailData.html) payload.html = emailData.html;
      if (emailData.text) payload.text = emailData.text;
      if (emailData.cc?.length) payload.cc = emailData.cc.map((c) => c.email);
      if (emailData.bcc?.length) payload.bcc = emailData.bcc.map((b) => b.email);
      if (emailData.replyTo) payload.reply_to = emailData.replyTo.email;
      if (emailData.attachments?.length) {
        payload.attachments = emailData.attachments.map((att) => ({
          filename: att.filename,
          content: typeof att.content === 'string' ? att.content : att.content.toString('base64'),
        }));
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => ({}))) as { id?: string; message?: string };

      if (!response.ok) {
        logger.error('Resend API error', new Error(data.message || 'Unknown error'), {
          status: response.status,
        });
        return {
          success: false,
          error: new EmailProviderError(
            `Resend API error: ${response.status} - ${data.message || response.statusText}`
          ),
          data,
        };
      }

      logger.info('Email sent successfully via Resend', { messageId: data.id });

      return {
        success: true,
        messageId: data.id,
        data,
      };
    } catch (error) {
      logger.error('Failed to send email via Resend', error as Error);
      return {
        success: false,
        error: new EmailProviderError('Failed to send email', error as Error),
      };
    }
  }
}
