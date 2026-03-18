import { Injectable, Logger } from '@nestjs/common';
import type { SendEmailInput, SendEmailResult } from '@spexs/types';
import { Resend } from 'resend';
import { EnvService } from '../../lib/env/env.service';

// Re-export so consumers can import from here or from @spexs/types
export type { SendEmailInput, SendEmailResult } from '@spexs/types';

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly sendEnabled: boolean;
  private readonly fromEmail: string;

  constructor(private readonly env: EnvService) {
    this.sendEnabled = this.env.get('SEND_EMAILS');
    this.fromEmail = this.env.get('FROM_EMAIL');

    const apiKey = this.env.get('RESEND_API_KEY');

    if (this.sendEnabled && !apiKey) {
      throw new Error(
        'SEND_EMAILS is enabled but RESEND_API_KEY is not set. ' +
          'Either set RESEND_API_KEY or disable SEND_EMAILS.',
      );
    }

    this.resend = apiKey ? new Resend(apiKey) : null;

    this.logger.log(
      this.sendEnabled
        ? `Email sending ENABLED via Resend (from: ${this.fromEmail})`
        : 'Email sending DISABLED — emails will be logged to console',
    );
  }

  /**
   * Sends an email to the given recipients.
   * When `SEND_EMAILS` is false, logs the email to console instead.
   */
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    if (!this.sendEnabled || !this.resend) {
      this.logger.log(
        `[DRY RUN] Email to ${input.to.join(', ')}\n` +
          `  Subject: ${input.subject}\n` +
          `  Body: ${input.html}`,
      );
      return { sent: false, messageId: null };
    }

    const { data, error } = await this.resend.emails.send({
      from: this.fromEmail,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });

    if (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      throw new Error(`Resend error: ${error.message}`);
    }

    this.logger.log(
      `Email sent to ${input.to.join(', ')} (id: ${data?.id ?? 'unknown'})`,
    );

    return { sent: true, messageId: data?.id ?? null };
  }
}
