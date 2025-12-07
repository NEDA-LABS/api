/**
 * Email Service Module
 * Main entry point for email services
 */

import { EmailService } from './service.js';
import { ResendProvider } from './providers/resend.js';
import { getEmailConfig } from './config.js';
import { PaymentNotificationService } from './services/payment-notification.service.js';
import { PrismaClient } from '@prisma/client';

// Singleton instance
let emailServiceInstance: EmailService | null = null;

/**
 * Get or create email service instance (Singleton)
 */
export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    const config = getEmailConfig();
    const provider = new ResendProvider({
      apiKey: config.resendApiKey,
      defaultFrom: {
        email: config.defaultFromEmail,
        name: config.defaultFromName,
      },
    });

    emailServiceInstance = new EmailService({
      provider,
      defaultFromEmail: config.defaultFromEmail,
      defaultFromName: config.defaultFromName,
      isDevelopment: config.isDevelopment,
    });
  }

  return emailServiceInstance;
}

/**
 * Reset email service instance (for testing)
 */
export function resetEmailService(): void {
  emailServiceInstance = null;
}

/**
 * Create Email Service instance
 */
export function createEmailService(): EmailService {
  return getEmailService();
}

/**
 * Create Payment Notification Service instance
 */
export function createPaymentNotificationService(prisma: PrismaClient): PaymentNotificationService {
  const emailService = getEmailService();
  return new PaymentNotificationService(emailService, prisma);
}

// Re-export classes and types
export { EmailService } from './service.js';
export { ResendProvider } from './providers/resend.js';
export { PaymentNotificationService } from './services/payment-notification.service.js';
export { EmailTemplateFactory } from './templates/factory.js';
export { getEmailConfig, isValidEmail, buildEmailAddress } from './config.js';

// Re-export types
export type {
  EmailAddress,
  EmailAttachment,
  BaseEmailData,
  EmailProviderResponse,
  IEmailProvider,
  EmailServiceConfig,
  SendEmailOptions,
  PaymentSettledEmailData,
  PaymentRefundedEmailData,
  IDRXMintCompletedEmailData,
  IDRXRedeemCompletedEmailData,
  EmailTemplateData,
  IEmailTemplate,
} from './types.js';

export {
  EmailTemplateType,
  EmailServiceError,
  EmailProviderError,
  EmailTemplateError,
  EmailValidationError,
} from './types.js';
