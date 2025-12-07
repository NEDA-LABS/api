/**
 * Payment Refunded Email Template
 */

import { BaseEmailTemplate } from './base.js';
import { PaymentRefundedEmailData, EmailTemplateType, EmailAddress } from '../types.js';
import { buildEmailAddress } from '../config.js';

export class PaymentRefundedEmailTemplate extends BaseEmailTemplate<PaymentRefundedEmailData> {
  getType(): EmailTemplateType {
    return EmailTemplateType.PAYMENT_REFUNDED;
  }

  protected override getRecipients(data: PaymentRefundedEmailData): EmailAddress[] {
    return [buildEmailAddress(data.recipientEmail, data.firstName)];
  }

  protected override getSubject(data: PaymentRefundedEmailData): string {
    return `🔄 Payment Refunded - ${data.amount} ${data.currency}`;
  }

  protected override generateHtml(data: PaymentRefundedEmailData): string {
    const logoUrl = 'https://nedapay.xyz/NEDApayLogo.png';
    const dashboardUrl = data.dashboardUrl || 'https://nedapay.xyz/dashboard';
    
    const refundReasonBlock = data.refundReason ? `
      <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;padding:16px;margin-bottom:32px;">
        <h4 style="color:#92400e;font-size:14px;font-weight:600;margin:0 0 8px 0;">Refund Reason</h4>
        <p style="color:#92400e;font-size:14px;line-height:1.6;margin:0;">${this.escapeHtml(data.refundReason)}</p>
      </div>
    ` : '';

    const content = `
      <div class="header">
        <h1>Payment Refunded</h1>
        <p style="color:#fff;margin:8px 0 0 0;font-size:16px;">Your funds have been returned</p>
      </div>
      <div class="content">
        <div style="margin-bottom:32px;">
          <h2 style="color:#1f2937;font-size:20px;font-weight:600;margin:0 0 16px 0;">Hi ${this.escapeHtml(data.firstName)},</h2>
          <p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0;">Your payment order has been refunded and the funds have been returned to your wallet.</p>
        </div>
        <div style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);border-radius:12px;padding:24px;margin-bottom:32px;text-align:center;">
          <div style="background:rgba(255,255,255,0.2);border-radius:50%;width:64px;height:64px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
            <span style="font-size:32px;">🔄</span>
          </div>
          <h3 style="color:#fff;font-size:18px;font-weight:600;margin:0 0 8px 0;">Refund Processed</h3>
          <p style="color:rgba(255,255,255,0.9);font-size:14px;margin:0;">Processed on ${this.formatDate(data.refundedAt)}</p>
        </div>
        <div style="background:#f9fafb;border-radius:12px;padding:24px;margin-bottom:32px;">
          <h3 style="color:#1f2937;font-size:16px;font-weight:600;margin:0 0 20px 0;">Refund Details</h3>
          <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #e5e7eb;">
            <span style="color:#6b7280;font-size:14px;">Transaction ID</span>
            <span style="color:#1f2937;font-size:14px;font-weight:500;font-family:'Courier New',monospace;">${this.escapeHtml(data.transactionId)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #e5e7eb;">
            <span style="color:#6b7280;font-size:14px;">Refunded Amount</span>
            <span style="color:#1f2937;font-size:16px;font-weight:600;">${this.escapeHtml(data.amount)} ${this.escapeHtml(data.currency)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #e5e7eb;">
            <span style="color:#6b7280;font-size:14px;">Account Name</span>
            <span style="color:#1f2937;font-size:14px;font-weight:500;">${this.escapeHtml(data.accountName)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:12px 0;">
            <span style="color:#6b7280;font-size:14px;">Account Number</span>
            <span style="color:#1f2937;font-size:14px;font-weight:500;font-family:'Courier New',monospace;">${this.escapeHtml(data.accountNumber)}</span>
          </div>
        </div>
        ${refundReasonBlock}
        <div style="background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);border-radius:12px;padding:24px;margin-bottom:32px;">
          <h3 style="color:#fff;font-size:16px;font-weight:600;margin:0 0 12px 0;">What Happens Next?</h3>
          <ul style="color:rgba(255,255,255,0.95);font-size:14px;line-height:1.8;margin:0;padding-left:20px;">
            <li>The funds have been returned to your wallet</li>
            <li>You can initiate a new withdrawal if needed</li>
            <li>Check your dashboard for updated balance</li>
          </ul>
        </div>
        <div style="text-align:center;margin-bottom:32px;">
          <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;">View Dashboard</a>
        </div>
        <div style="background:#dbeafe;border-left:4px solid #3b82f6;border-radius:8px;padding:16px;margin-bottom:32px;">
          <p style="color:#1e40af;font-size:14px;line-height:1.6;margin:0;"><strong>Need Help?</strong><br>If you have questions about this refund, please contact our support team.</p>
        </div>
        <div style="text-align:center;padding-top:24px;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">This is an automated notification from NedaPay. Please do not reply.</p>
        </div>
      </div>
    `;
    return this.wrapInLayout(content, logoUrl, '#f59e0b');
  }
}
