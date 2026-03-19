import { Injectable, Logger } from '@nestjs/common';
import type { SendEmailInput, SendEmailResult } from '@spexs/types';
import { MailtrapClient } from 'mailtrap';
import { EnvService } from '../../lib/env/env.service';

// Re-export so consumers can import from here or from @spexs/types
export type { SendEmailInput, SendEmailResult } from '@spexs/types';

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly client: MailtrapClient | null;
  private readonly sendEnabled: boolean;
  private readonly fromEmail: string;
  private readonly inboxId: number | undefined;

  constructor(private readonly env: EnvService) {
    this.sendEnabled = this.env.get('SEND_EMAILS');
    this.fromEmail = this.env.get('FROM_EMAIL');
    this.inboxId = this.env.get('MAILTRAP_INBOX_ID');

    const apiKey = this.env.get('MAILTRAP_API_KEY');

    if (this.sendEnabled && !apiKey) {
      throw new Error(
        'SEND_EMAILS is enabled but MAILTRAP_API_KEY is not set. ' +
          'Either set MAILTRAP_API_KEY or disable SEND_EMAILS.',
      );
    }

    if (this.sendEnabled && !this.inboxId) {
      throw new Error(
        'SEND_EMAILS is enabled but MAILTRAP_INBOX_ID is not set. ' +
          'Set MAILTRAP_INBOX_ID to your Mailtrap sandbox inbox ID.',
      );
    }

    this.client = apiKey
      ? new MailtrapClient({
          token: apiKey,
          testInboxId: this.inboxId,
          sandbox: true,
        })
      : null;

    this.logger.log(
      this.sendEnabled
        ? `Email sending ENABLED via Mailtrap sandbox inbox ${this.inboxId} (from: ${this.fromEmail})`
        : 'Email sending DISABLED — emails will be logged to console',
    );
  }

  /**
   * Sends an email via the Mailtrap sandbox inbox.
   * When `SEND_EMAILS` is false, logs the email to console instead.
   */
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    if (!this.sendEnabled || !this.client) {
      this.logger.log(
        `[DRY RUN] Email to ${input.to.join(', ')}\n` +
          `  Subject: ${input.subject}\n` +
          `  Body: ${input.html}`,
      );
      return { sent: false, messageId: null };
    }

    const response = await this.client.send({
      from: { email: this.fromEmail },
      to: input.to.map((email) => ({ email })),
      subject: input.subject,
      html: input.html,
    });

    const messageId = response.message_ids?.[0] ?? null;

    this.logger.log(
      `Email sent to ${input.to.join(', ')} (id: ${messageId ?? 'unknown'})`,
    );

    return { sent: true, messageId };
  }
}
