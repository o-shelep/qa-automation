import { MailingError } from './message-queue';
import type { MailingClient, Message } from './message-queue';

/** Клієнт HTTP-сервісу розсилки: POST {baseUrl}/messages */
export class HttpMailingClient implements MailingClient {
  constructor(
    private baseUrl: string,
    private apiKey: string,
  ) {}

  async send(message: Message): Promise<string> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'Idempotency-Key': message.id,
        },
        body: JSON.stringify(message),
      });
    } catch {
      throw new MailingError('NETWORK_ERROR', true);
    }

    if (response.status >= 500 || response.status === 429) {
      throw new MailingError('MAILING_UNAVAILABLE', true);
    }
    if (!response.ok) {
      throw new MailingError('MESSAGE_REJECTED', false);
    }

    const data = await response.json().catch(() => undefined);
    if (typeof data?.messageId !== 'string' || data.messageId === '') {
      throw new MailingError('INVALID_RESPONSE_FORMAT', false);
    }
    return data.messageId;
  }
}