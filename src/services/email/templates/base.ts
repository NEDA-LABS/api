/**
 * Base Email Template
 * Abstract class for email template implementations
 */

import {
  IEmailTemplate,
  BaseEmailData,
  EmailTemplateData,
  EmailTemplateType,
  EmailAddress,
} from '../types.js';
import { buildEmailAddress } from '../config.js';

export abstract class BaseEmailTemplate<T extends EmailTemplateData>
  implements IEmailTemplate<T>
{
  protected abstract generateHtml(data: T): string;
  protected abstract getSubject(data: T): string;
  abstract getType(): EmailTemplateType;

  generate(data: T): BaseEmailData {
    const html = this.generateHtml(data);
    const subject = this.getSubject(data);
    const to = this.getRecipients(data);
    return { to, subject, html, text: this.generatePlainText(data) };
  }

  protected getRecipients(data: T): EmailAddress[] {
    const d = data as unknown as { recipientEmail?: string; firstName?: string };
    if (!d.recipientEmail) throw new Error('No recipient email found');
    return [buildEmailAddress(d.recipientEmail, d.firstName)];
  }

  protected generatePlainText(data: T): string {
    return this.generateHtml(data)
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  protected escapeHtml(str: string): string {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  protected formatDate(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  }

  protected wrapInLayout(content: string, logoUrl: string, headerBg = '#10b981'): string {
    const darkColor: Record<string, string> = {
      '#10b981': '#059669',
      '#f59e0b': '#d97706',
      '#3b82f6': '#2563eb',
    };
    const dark = darkColor[headerBg] || headerBg;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NedaPay</title>
  <style>
    body { margin:0; padding:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; background:#f3f4f6; }
    .container { max-width:600px; margin:0 auto; background:#fff; }
    .header { background:linear-gradient(135deg,${headerBg} 0%,${dark} 100%); padding:40px 32px; text-align:center; }
    .header h1 { color:#fff; font-size:28px; font-weight:700; margin:0; }
    .content { padding:40px 32px; }
    @media only screen and (max-width:600px) { .content { padding:24px 20px; } .header { padding:32px 20px; } }
  </style>
</head>
<body>
  <div class="container">
    <div style="text-align:center;padding:24px 0;">
      <img src="${logoUrl}" alt="NedaPay" style="height:40px;width:auto;">
    </div>
    ${content}
  </div>
</body>
</html>`;
  }
}
