/**
 * Email Service
 * Main service class for sending emails
 */

import {
  IEmailProvider,
  SendEmailOptions,
  EmailProviderResponse,
  EmailServiceConfig,
  BaseEmailData,
  EmailServiceError,
} from './types.js';
import { EmailTemplateFactory } from './templates/factory.js';
import { logger } from '../../utils/logger.js';

export class EmailService {
  private provider: IEmailProvider;
  private defaultFromEmail: string;
  private defaultFromName: string;
  private isDevelopment: boolean;

  constructor(config: EmailServiceConfig) {
    this.provider = config.provider;
    this.defaultFromEmail = config.defaultFromEmail;
    this.defaultFromName = config.defaultFromName;
    this.isDevelopment = config.isDevelopment || false;

    if (!this.provider.validateConfig()) {
      throw new EmailServiceError('Email provider configuration is invalid', 'INVALID_CONFIG');
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<EmailProviderResponse> {
    try {
      const { templateType, data, overrides } = options;

      if (this.isDevelopment) {
        logger.debug(`[EmailService] Preparing to send ${templateType} email`);
      }

      const template = EmailTemplateFactory.createTemplate(templateType);
      const baseEmailData = template.generate(data);

      const emailData: BaseEmailData = {
        ...baseEmailData,
        ...overrides,
      };

      const result = await this.provider.send(emailData);

      if (result.success) {
        logger.info(`[EmailService] Email sent successfully`, { 
          templateType, 
          messageId: result.messageId 
        });
      } else {
        logger.error(`[EmailService] Failed to send email`, result.error);
      }

      return result;
    } catch (error) {
      logger.error('[EmailService] Unexpected error', error as Error);
      return {
        success: false,
        error: new EmailServiceError('Failed to send email', 'SEND_ERROR', error as Error),
      };
    }
  }

  async sendRawEmail(emailData: BaseEmailData): Promise<EmailProviderResponse> {
    try {
      return await this.provider.send(emailData);
    } catch (error) {
      return {
        success: false,
        error: new EmailServiceError('Failed to send raw email', 'SEND_RAW_ERROR', error as Error),
      };
    }
  }

  getConfig() {
    return {
      defaultFromEmail: this.defaultFromEmail,
      defaultFromName: this.defaultFromName,
      isDevelopment: this.isDevelopment,
    };
  }

  validateConfiguration(): boolean {
    try {
      return this.provider.validateConfig();
    } catch {
      return false;
    }
  }
}
