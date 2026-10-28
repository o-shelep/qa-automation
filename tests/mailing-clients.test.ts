import { describe, it, expect, vi, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server, MAILING_URL, MAILING_BASE } from './msw/server';
import { HttpMailingClient } from '../src/mailing-clients';
import { MessageQueue, MailingError } from '../src/message-queue';
import type { Message } from '../src/message-queue';
import { InMemoryDeliveryLog } from './fakes/in-memory-delivery-log';

const client = new HttpMailingClient(MAILING_BASE, 'test-key');
const message: Message = { id: 'm-1', to: 'olha@example.com', subject: 'Привіт', body: 'Текст' };

describe('HttpMailingClient — MSW', () => {
  it('успіх: повертає messageId з відповіді 202', async () => {
    await expect(client.send(message)).resolves.toBe('srv-1');
  });

  it('формує POST-запит з JSON-тілом, ключем API та ключем ідемпотентності', async () => {
    let captured: Request | undefined;
    server.use(
      http.post(MAILING_URL, ({ request }) => {
        captured = request.clone();
        return HttpResponse.json({ messageId: 'srv-x' }, { status: 202 });
      }),
    );
    await client.send(message);

    expect(captured?.method).toBe('POST');
    expect(captured?.headers.get('authorization')).toBe('Bearer test-key');
    expect(captured?.headers.get('idempotency-key')).toBe('m-1');
    expect(await captured?.json()).toEqual(message);
  });

  it.each([500, 503, 429])('статус %i → MAILING_UNAVAILABLE (можна повторити)', async (status) => {
    server.use(http.post(MAILING_URL, () => new HttpResponse(null, { status })));
    const error = await client.send(message).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(MailingError);
    expect(error).toMatchObject({ code: 'MAILING_UNAVAILABLE', retryable: true });
  });

  it.each([400, 422])('статус %i → MESSAGE_REJECTED (повтор не допоможе)', async (status) => {
    server.use(http.post(MAILING_URL, () => HttpResponse.json({ error: 'bad' }, { status })));
    await expect(client.send(message)).rejects.toMatchObject({
      code: 'MESSAGE_REJECTED',
      retryable: false,
    });
  });

  it.each([
    { name: 'messageId — число', body: () => HttpResponse.json({ messageId: 42 }) },
    { name: 'немає поля messageId', body: () => HttpResponse.json({ id: 'srv-1' }) },
    { name: 'порожній рядок', body: () => HttpResponse.json({ messageId: '' }) },
    { name: 'не JSON', body: () => HttpResponse.text('OK') },
  ])('некоректний формат відповіді ($name) → INVALID_RESPONSE_FORMAT', async ({ body }) => {
    server.use(http.post(MAILING_URL, body));
    await expect(client.send(message)).rejects.toThrow('INVALID_RESPONSE_FORMAT');
  });

  it('мережева помилка → NETWORK_ERROR (можна повторити)', async () => {
    server.use(http.post(MAILING_URL, () => HttpResponse.error()));
    await expect(client.send(message)).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      retryable: true,
    });
  });
});

describe('MessageQueue + HttpMailingClient — інтеграція через MSW', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('два статуси 503, потім 202: доставлено з третьої спроби', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(new Date('2026-03-15T10:00:00.000Z'));
    let calls = 0;
    server.use(
      http.post(MAILING_URL, () => {
        calls++;
        return calls < 3
          ? new HttpResponse(null, { status: 503 })
          : HttpResponse.json({ messageId: 'srv-ok' }, { status: 202 });
      }),
    );
    const log = new InMemoryDeliveryLog();
    const queue = new MessageQueue(client, log, { alert: vi.fn() });
    queue.enqueue(message);

    const promise = queue.processNext();
    await vi.advanceTimersByTimeAsync(4000);
    const record = await promise;

    expect(calls).toBe(3);
    expect(record).toMatchObject({ status: 'sent', attempts: 3, providerId: 'srv-ok' });
    expect((await log.findByMessageId('m-1'))?.finishedAt).toBe('2026-03-15T10:00:04.000Z');
  });

  it('некоректний формат відповіді не повторюється: одна спроба, failed', async () => {
    let calls = 0;
    server.use(
      http.post(MAILING_URL, () => {
        calls++;
        return HttpResponse.json({ messageId: 42 }, { status: 202 });
      }),
    );
    const alert = vi.fn().mockResolvedValue(undefined);
    const queue = new MessageQueue(client, new InMemoryDeliveryLog(), { alert });
    queue.enqueue(message);

    const record = await queue.processNext();

    expect(calls).toBe(1);
    expect(record).toMatchObject({ status: 'failed', attempts: 1, error: 'INVALID_RESPONSE_FORMAT' });
    expect(alert).toHaveBeenCalledTimes(1);
  });
});