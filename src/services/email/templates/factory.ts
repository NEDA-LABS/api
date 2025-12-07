/**
 * Email Template Factory
 * Creates template instances based on type
 */

import {
  EmailTemplateType,
  IEmailTemplate,
  EmailTemplateData,
  EmailTemplateError,
} from '../types.js';
import { PaymentSettledEmailTemplate } from './payment-settled.js';
import { PaymentRefundedEmailTemplate } from './payment-refunded.js';

export class EmailTemplateFactory {
  static createTemplate<T extends EmailTemplateData>(
    type: EmailTemplateType
  ): IEmailTemplate<T> {
    switch (type) {
      case EmailTemplateType.PAYMENT_SETTLED:
        return new PaymentSettledEmailTemplate() as unknown as IEmailTemplate<T>;

      case EmailTemplateType.PAYMENT_REFUNDED:
        return new PaymentRefundedEmailTemplate() as unknown as IEmailTemplate<T>;

      default:
        throw new EmailTemplateError(`Unknown email template type: ${type}`);
    }
  }

  static getAvailableTypes(): EmailTemplateType[] {
    return Object.values(EmailTemplateType);
  }

  static isTemplateSupported(type: string): type is EmailTemplateType {
    return Object.values(EmailTemplateType).includes(type as EmailTemplateType);
  }
}
