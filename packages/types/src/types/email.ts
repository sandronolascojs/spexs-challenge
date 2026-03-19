export interface SendEmailInput {
  to: string[];
  subject: string;
  html: string;
}

export interface SendEmailResult {
  sent: boolean;
  /** Resend message ID when actually sent, null when logged only. */
  messageId: string | null;
}
