// ---------- Варіант 9: черга надсилання повідомлень з повторними спробами ----------

export interface Message {
  id: string;
  to: string;
  subject: string;
  body: string;
}

/** HTTP-сервіс розсилки: повертає ідентифікатор, присвоєний сервісом */
export interface MailingClient {
  send(message: Message): Promise<string>;
}

export interface DeliveryRecord {
  messageId: string;
  status: 'sent' | 'failed';
  /** Скільки разів викликано сервіс розсилки */
  attempts: number;
  /** Ідентифікатор від сервісу розсилки (лише для sent) */
  providerId?: string;
  /** Код останньої помилки (лише для failed) */
  error?: string;
  finishedAt: string;
}

/** Журнал доставки */
export interface DeliveryLog {
  save(record: DeliveryRecord): Promise<void>;
  findByMessageId(messageId: string): Promise<DeliveryRecord | undefined>;
}

/** Сповіщення адміністратора про остаточно недоставлене повідомлення */
export interface AlertNotifier {
  alert(text: string): Promise<void>;
}

/** Помилка сервісу розсилки; retryable = false означає, що повтор не допоможе */
export class MailingError extends Error {
  constructor(
    public readonly code: string,
    public readonly retryable: boolean,
  ) {
    super(code);
    this.name = 'MailingError';
  }
}

export const MAX_ATTEMPTS = 3;
export const RETRY_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const isRetryable = (error: unknown): boolean =>
  !(error instanceof MailingError && !error.retryable);

const errorCode = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

function assertValidMessage(message: Message): void {
  if (!message.id || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.to)) {
    throw new Error('INVALID_MESSAGE');
  }
}

export class MessageQueue {
  private pending: Message[] = [];

  constructor(
    private client: MailingClient,
    private log: DeliveryLog,
    private notifier: AlertNotifier,
    private maxAttempts = MAX_ATTEMPTS,
    private delayMs = RETRY_DELAY_MS,
  ) {}

  get size(): number {
    return this.pending.length;
  }

  enqueue(message: Message): void {
    assertValidMessage(message);
    this.pending.push(message);
  }

  /** Надсилає перше повідомлення з черги (до maxAttempts спроб із паузою delayMs) */
  async processNext(): Promise<DeliveryRecord | undefined> {
    const message = this.pending.shift();
    if (!message) return undefined;

    const record = await this.deliver(message);
    try {
      await this.log.save(record);
    } catch (error) {
      // запис у журнал не вдався — повідомлення не губимо, повертаємо в голову черги
      this.pending.unshift(message);
      throw error;
    }
    if (record.status === 'failed') {
      await this.notifier.alert(
        `Повідомлення ${message.id} не доставлено після ${record.attempts} спроб: ${record.error}`,
      );
    }
    return record;
  }

  /** Обробляє всю чергу по черзі (FIFO) */
  async processAll(): Promise<DeliveryRecord[]> {
    const results: DeliveryRecord[] = [];
    while (this.pending.length > 0) {
      results.push((await this.processNext())!);
    }
    return results;
  }

  private async deliver(message: Message): Promise<DeliveryRecord> {
    let lastError: unknown;
    let attempts = 0;
    while (attempts < this.maxAttempts) {
      attempts++;
      try {
        const providerId = await this.client.send(message);
        return {
          messageId: message.id,
          status: 'sent',
          attempts,
          providerId,
          finishedAt: new Date().toISOString(),
        };
      } catch (error) {
        lastError = error;
        if (!isRetryable(error)) break;
        if (attempts < this.maxAttempts) await sleep(this.delayMs);
      }
    }
    return {
      messageId: message.id,
      status: 'failed',
      attempts,
      error: errorCode(lastError),
      finishedAt: new Date().toISOString(),
    };
  }
}