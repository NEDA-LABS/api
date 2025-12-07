/**
 * Payment Notification Email Service
 * Handles sending payment-related email notifications
 */

import { PrismaClient, EmailNotificationType, EmailNotificationStatus } from '@prisma/client';
import { EmailService } from '../service.js';
import {
  EmailTemplateType,
  PaymentSettledEmailData,
  PaymentRefundedEmailData,
  EmailProviderResponse,
} from '../types.js';
import { logger } from '../../../utils/logger.js';

export class PaymentNotificationService {
  private emailService: EmailService;
  private prisma: PrismaClient;

  constructor(emailService: EmailService, prisma: PrismaClient) {
    this.emailService = emailService;
    this.prisma = prisma;
  }

  /**
   * Send payment settled notification
   */
  async sendPaymentSettledEmail(params: {
    transactionId: string;
    walletAddress: string;
    amount: string;
    currency: string;
    accountName: string;
    accountNumber: string;
    institution: string;
    rate: string;
  }): Promise<EmailProviderResponse> {
    try {
      // Find user by wallet address
      const user = await this.prisma.user.findUnique({
        where: { wallet: params.walletAddress },
      });

      if (!user) {
        logger.warn(`[PaymentNotificationService] User not found for wallet: ${params.walletAddress}`);
        return { success: false, error: new Error('User not found') };
      }

      if (!user.email) {
        logger.warn(`[PaymentNotificationService] User ${user.id} has no email address`);
        return { success: false, error: new Error('User has no email address') };
      }

      const emailData: PaymentSettledEmailData = {
        recipientEmail: user.email,
        firstName: user.name || 'Valued Customer',
        transactionId: params.transactionId,
        amount: params.amount,
        currency: params.currency,
        accountName: params.accountName,
        accountNumber: params.accountNumber,
        institution: params.institution,
        rate: params.rate,
        settledAt: new Date(),
        dashboardUrl: 'https://nedapay.xyz/dashboard',
      };

      const result = await this.emailService.sendEmail({
        templateType: EmailTemplateType.PAYMENT_SETTLED,
        data: emailData,
      });

      // Track email notification in database
      if (result.success) {
        await this.trackEmailNotification({
          recipientEmail: user.email,
          type: EmailNotificationType.PAYMENT_SETTLED,
          subject: `✅ Payment Settled - ${params.amount} ${params.currency}`,
          status: EmailNotificationStatus.SENT,
          providerMessageId: result.messageId,
          metadata: {
            transactionId: params.transactionId,
            amount: params.amount,
            currency: params.currency,
          },
        });
      }

      return result;
    } catch (error) {
      logger.error('[PaymentNotificationService] Error sending payment settled email:', error as Error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Send payment refunded notification
   */
  async sendPaymentRefundedEmail(params: {
    transactionId: string;
    walletAddress: string;
    amount: string;
    currency: string;
    accountName: string;
    accountNumber: string;
    refundReason?: string;
  }): Promise<EmailProviderResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { wallet: params.walletAddress },
      });

      if (!user) {
        logger.warn(`[PaymentNotificationService] User not found for wallet: ${params.walletAddress}`);
        return { success: false, error: new Error('User not found') };
      }

      if (!user.email) {
        logger.warn(`[PaymentNotificationService] User ${user.id} has no email address`);
        return { success: false, error: new Error('User has no email address') };
      }

      const emailData: PaymentRefundedEmailData = {
        recipientEmail: user.email,
        firstName: user.name || 'Valued Customer',
        transactionId: params.transactionId,
        amount: params.amount,
        currency: params.currency,
        accountName: params.accountName,
        accountNumber: params.accountNumber,
        refundReason: params.refundReason,
        refundedAt: new Date(),
        dashboardUrl: 'https://nedapay.xyz/dashboard',
      };

      const result = await this.emailService.sendEmail({
        templateType: EmailTemplateType.PAYMENT_REFUNDED,
        data: emailData,
      });

      if (result.success) {
        await this.trackEmailNotification({
          recipientEmail: user.email,
          type: EmailNotificationType.PAYMENT_REFUNDED,
          subject: `🔄 Payment Refunded - ${params.amount} ${params.currency}`,
          status: EmailNotificationStatus.SENT,
          providerMessageId: result.messageId,
          metadata: {
            transactionId: params.transactionId,
            amount: params.amount,
            currency: params.currency,
            refundReason: params.refundReason,
          },
        });
      }

      return result;
    } catch (error) {
      logger.error('[PaymentNotificationService] Error sending payment refunded email:', error as Error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Track email notification in database
   */
  private async trackEmailNotification(params: {
    recipientEmail: string;
    type: EmailNotificationType;
    subject: string;
    status: EmailNotificationStatus;
    providerMessageId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.prisma.emailNotification.create({
        data: {
          recipientEmail: params.recipientEmail,
          type: params.type,
          subject: params.subject,
          status: params.status,
          providerMessageId: params.providerMessageId,
          metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
          sentAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('[PaymentNotificationService] Failed to track email notification:', error as Error);
      // Don't throw - tracking failure shouldn't break email sending
    }
  }
}
