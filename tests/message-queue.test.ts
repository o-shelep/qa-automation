import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MessageQueue, MailingError } from '../src/message-queue';
import type { Message, MailingClient, AlertNotifier, DeliveryLog } from '../src/message-queue';
import { InMemoryDeliveryLog } from './fakes/in-memory-delivery-log';

const msg = (id: string): Message => ({
  id,
  to: `${id}@example.com`,
  subject: 'Тема',
  body: 'Текст повідомлення',
});

const TIMEOUT = new MailingError('MAILING_UNAVAILABLE', true);

describe('MessageQueue — повторні спроби (3 спроби, затримка 2 с)', () => {
  let client: MailingClient;
  let log: InMemoryDeliveryLog;
  let notifier: AlertNotifier;
  let queue: MessageQueue;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T10:00:00.000Z'));
    client = { send: vi.fn().mockResolvedValue('srv-1') }; // stub
    log = new InMemoryDeliveryLog(); // fake
    notifier = { alert: vi.fn().mockResolvedValue(undefined) }; // spy
    queue = new MessageQueue(client, log, notifier);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    { name: 'порожній id', message: { ...msg('m'), id: '' } },
    { name: 'адреса без @', message: { ...msg('m'), to: 'user.example.com' } },
    { name: 'адреса без домену', message: { ...msg('m'), to: 'user@' } },
  ])('відхиляє некоректне повідомлення: $name', ({ message }) => {
    expect(() => queue.enqueue(message)).toThrow('INVALID_MESSAGE');
    expect(queue.size).toBe(0);
  });

  it('порожня черга: processNext повертає undefined і не звертається до сервісу', async () => {
    await expect(queue.processNext()).resolves.toBeUndefined();
    expect(client.send).not.toHaveBeenCalled();
  });

  it('успіх з першої спроби: запис sent у журналі, без затримок', async () => {
    queue.enqueue(msg('m1'));
    const record = await queue.processNext();

    expect(record).toEqual({
      messageId: 'm1',
      status: 'sent',
      attempts: 1,
      providerId: 'srv-1',
      finishedAt: '2026-03-15T10:00:00.000Z',
    });
    expect(await log.findByMessageId('m1')).toEqual(record); // перевірка стану
    expect(queue.size).toBe(0);
    expect(notifier.alert).not.toHaveBeenCalled();
  });

  it('після невдачі чекає рівно 2 с: о 1999 мс другої спроби ще немає', async () => {
    client.send = vi.fn().mockRejectedValueOnce(TIMEOUT).mockResolvedValueOnce('srv-2');
    queue.enqueue(msg('m2'));

    const promise = queue.processNext();
    await vi.advanceTimersByTimeAsync(1999);
    expect(client.send).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    const record = await promise;
    expect(client.send).toHaveBeenCalledTimes(2);
    expect(record).toMatchObject({ status: 'sent', attempts: 2, providerId: 'srv-2' });
    expect(record?.finishedAt).toBe('2026-03-15T10:00:02.000Z');
  });

  it('успіх з третьої (останньої) спроби через 4 с', async () => {
    client.send = vi.fn()
      .mockRejectedValueOnce(TIMEOUT)
      .mockRejectedValueOnce(TIMEOUT)
      .mockResolvedValueOnce('srv-3');
    queue.enqueue(msg('m3'));

    const promise = queue.processNext();
    await vi.advanceTimersByTimeAsync(4000);
    const record = await promise;

    expect(record).toMatchObject({ status: 'sent', attempts: 3 });
    expect(record?.finishedAt).toBe('2026-03-15T10:00:04.000Z');
    expect(notifier.alert).not.toHaveBeenCalled();
  });

  it('після 3 невдалих спроб — запис failed, четвертої спроби немає', async () => {
    client.send = vi.fn().mockRejectedValue(TIMEOUT);
    queue.enqueue(msg('m4'));

    const promise = queue.processNext();
    await vi.advanceTimersByTimeAsync(10_000); // свідомо більше за 2 × 2 с
    const record = await promise;

    expect(client.send).toHaveBeenCalledTimes(3);
    expect(record).toEqual({
      messageId: 'm4',
      status: 'failed',
      attempts: 3,
      error: 'MAILING_UNAVAILABLE',
      finishedAt: '2026-03-15T10:00:04.000Z',
    });
    expect((await log.findByMessageId('m4'))?.status).toBe('failed');
  });

  it('після 3 невдалих спроб надсилає адміністратору одне сповіщення', async () => {
    client.send = vi.fn().mockRejectedValue(TIMEOUT);
    queue.enqueue(msg('m5'));

    const promise = queue.processNext();
    await vi.advanceTimersByTimeAsync(4000);
    await promise;

    // перевірка взаємодії: сповіщення не змінює стану системи
    expect(notifier.alert).toHaveBeenCalledTimes(1);
    expect(notifier.alert).toHaveBeenCalledWith(
      expect.stringContaining('m5 не доставлено після 3 спроб: MAILING_UNAVAILABLE'),
    );
  });

  it('помилку без права на повтор (MESSAGE_REJECTED) не повторює', async () => {
    client.send = vi.fn().mockRejectedValue(new MailingError('MESSAGE_REJECTED', false));
    queue.enqueue(msg('m6'));

    const record = await queue.processNext(); // без просування часу: пауз немає

    expect(client.send).toHaveBeenCalledTimes(1);
    expect(record).toMatchObject({ status: 'failed', attempts: 1, error: 'MESSAGE_REJECTED' });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('повторює й після звичайної помилки (обрив з’єднання)', async () => {
    client.send = vi.fn().mockRejectedValueOnce(new Error('ECONNRESET')).mockResolvedValueOnce('srv-7');
    queue.enqueue(msg('m7'));

    const promise = queue.processNext();
    await vi.advanceTimersByTimeAsync(2000);

    await expect(promise).resolves.toMatchObject({ status: 'sent', attempts: 2 });
  });

  it('відмова журналу: помилка передається, повідомлення лишається в черзі', async () => {
    const brokenLog: DeliveryLog = {
      save: vi.fn().mockRejectedValue(new Error('STORAGE_UNAVAILABLE')),
      findByMessageId: vi.fn(),
    };
    const queue = new MessageQueue(client, brokenLog, notifier);
    queue.enqueue(msg('m8'));

    await expect(queue.processNext()).rejects.toThrow('STORAGE_UNAVAILABLE');
    expect(queue.size).toBe(1);
    expect(notifier.alert).not.toHaveBeenCalled();
  });

  it('processAll обробляє чергу в порядку надходження, невдача не зупиняє чергу', async () => {
    client.send = vi.fn(async (m: Message) => {
      if (m.id === 'b') throw TIMEOUT;
      return `srv-${m.id}`;
    });
    ['a', 'b', 'c'].forEach((id) => queue.enqueue(msg(id)));

    const promise = queue.processAll();
    await vi.advanceTimersByTimeAsync(4000);
    const records = await promise;

    expect(records.map((r) => [r.messageId, r.status, r.attempts])).toEqual([
      ['a', 'sent', 1],
      ['b', 'failed', 3],
      ['c', 'sent', 1],
    ]);
    expect(log.size).toBe(3);
    expect(queue.size).toBe(0);
  });
});