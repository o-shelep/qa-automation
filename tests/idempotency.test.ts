import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app';
import { login, makeOrderPayload } from './helpers';
import { expectSchema } from './schema';
import { orderSchema } from './schemas/order.schema';
import { errorSchema } from './schemas/error.schema';

type App = ReturnType<typeof createApp>;

/** POST /orders від імені користувача з необов'язковим ключем ідемпотентності */
function postOrder(app: App, token: string, body: object, key?: string) {
  const req = request(app).post('/orders').set('Authorization', `Bearer ${token}`);
  if (key !== undefined) req.set('Idempotency-Key', key);
  return req.send(body);
}

function listOrders(app: App, token: string) {
  return request(app).get('/orders').set('Authorization', `Bearer ${token}`);
}

describe('POST /orders з Idempotency-Key (варіант 9)', () => {
  let app: App;
  let token: string;
  let key: string;

  beforeEach(async () => {
    app = createApp();                             // власний застосунок і дані
    token = await login(app, 'bob@example.com');
    key = randomUUID();                            // власний ключ для кожного тесту
  });

  it('перший запит з ключем створює замовлення: 201, схема, Location, Idempotent-Replayed: false', async () => {
    const res = await postOrder(app, token, makeOrderPayload(), key);

    expect(res.status).toBe(201);                                    // 1. код
    expectSchema(res.body, orderSchema);                             // 2. структура
    expect(res.body.total).toBeCloseTo(560, 2);                      // 3. значення
    expect(res.headers.location).toBe(`/orders/${res.body.id}`);     // 4. заголовки
    expect(res.headers['idempotent-replayed']).toBe('false');
    const fetched = await request(app)                               // 5. побічний ефект
      .get(res.headers.location).set('Authorization', `Bearer ${token}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body).toEqual(res.body);
  });

  it('повтор з тим самим ключем повертає те саме замовлення й не створює нового', async () => {
    const first = await postOrder(app, token, makeOrderPayload(), key);
    const second = await postOrder(app, token, makeOrderPayload(), key);

    expect(second.status).toBe(201);                                 // 1. код той самий, що й у першої відповіді
    expectSchema(second.body, orderSchema);                          // 2. структура
    expect(second.body).toEqual(first.body);                         // 3. той самий id, сума, createdAt
    expect(second.headers.location).toBe(first.headers.location);    // 4. заголовки
    expect(second.headers['idempotent-replayed']).toBe('true');
    const list = await listOrders(app, token);                       // 5. у сховищі одне замовлення
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(first.body.id);
  });

  it('три однакові послідовні запити — одне замовлення', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const res = await postOrder(app, token, makeOrderPayload(), key);
      expect(res.status).toBe(201);
      ids.push(res.body.id);
    }
    expect(new Set(ids).size).toBe(1);
    expect((await listOrders(app, token)).body).toHaveLength(1);
  });

  it('три одночасні запити з тим самим ключем — одне замовлення', async () => {
    const responses = await Promise.all(
      [1, 2, 3].map(() => postOrder(app, token, makeOrderPayload(), key)),
    );
    expect(responses.map((r) => r.status)).toEqual([201, 201, 201]);
    expect(new Set(responses.map((r) => r.body.id)).size).toBe(1);
    expect(responses.filter((r) => r.headers['idempotent-replayed'] === 'false')).toHaveLength(1);
    expect((await listOrders(app, token)).body).toHaveLength(1);
  });

  it('порядок полів у тілі не робить запит «іншим»', async () => {
    const first = await postOrder(app, token, { items: [{ sku: 'SKU-A', price: 500, qty: 1 }] }, key);
    const second = await postOrder(app, token, { items: [{ qty: 1, price: 500, sku: 'SKU-A' }] }, key);
    expect(second.status).toBe(201);
    expect(second.headers['idempotent-replayed']).toBe('true');
    expect(second.body.id).toBe(first.body.id);
  });

  it('той самий ключ з іншим тілом → 422, наявне замовлення не змінюється', async () => {
    const first = await postOrder(app, token, makeOrderPayload(), key);
    const res = await postOrder(
      app, token, makeOrderPayload({ items: [{ sku: 'SKU-B', price: 900, qty: 2 }] }), key,
    );

    expect(res.status).toBe(422);
    expectSchema(res.body, errorSchema);
    expect(res.body.code).toBe('IDEMPOTENCY_KEY_REUSED');
    expect(res.headers.location).toBeUndefined();
    const list = await listOrders(app, token);
    expect(list.body).toEqual([first.body]);                         // і нового немає, і старе не змінено
  });

  it('різні ключі — різні замовлення', async () => {
    const a = await postOrder(app, token, makeOrderPayload(), randomUUID());
    const b = await postOrder(app, token, makeOrderPayload(), randomUUID());
    expect(a.body.id).not.toBe(b.body.id);
    expect((await listOrders(app, token)).body).toHaveLength(2);
  });

  it('без ключа кожен запит створює нове замовлення (зворотна сумісність)', async () => {
    const a = await postOrder(app, token, makeOrderPayload());
    const b = await postOrder(app, token, makeOrderPayload());
    expect([a.status, b.status]).toEqual([201, 201]);
    expect(a.body.id).not.toBe(b.body.id);
    expect(a.headers['idempotent-replayed']).toBeUndefined();
    expect((await listOrders(app, token)).body).toHaveLength(2);
  });

  it('помилка валідації не запам’ятовується: після виправлення тіла ключ створює замовлення', async () => {
    const bad = await postOrder(app, token, { items: [] }, key);
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('EMPTY_ORDER');

    const good = await postOrder(app, token, makeOrderPayload(), key);
    expect(good.status).toBe(201);
    expect(good.headers['idempotent-replayed']).toBe('false');
    expect((await listOrders(app, token)).body).toHaveLength(1);
  });

  it('після DELETE повтор з тим самим ключем не відновлює замовлення', async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const created = await postOrder(app, token, makeOrderPayload(), key);
    const deleted = await request(app).delete(created.headers.location).set(auth);
    expect(deleted.status).toBe(204);
    expect(deleted.text).toBe('');                                   // тіло 204 не розбираємо

    const replay = await postOrder(app, token, makeOrderPayload(), key);
    expect(replay.status).toBe(201);
    expect(replay.headers['idempotent-replayed']).toBe('true');
    expect(replay.body.id).toBe(created.body.id);
    expect((await listOrders(app, token)).body).toEqual([]);
    expect((await request(app).get(created.headers.location).set(auth)).status).toBe(404);
  });

  it.each([
    { name: 'порожній рядок', key: '' },
    { name: '7 символів (менше мінімуму)', key: 'abc1234' },
    { name: '65 символів (більше максимуму)', key: 'k'.repeat(65) },
    { name: 'пробіл усередині', key: 'order 2026 11' },
    { name: 'недопустимі символи', key: 'order$2026%11' },
    { name: 'крапки й двокрапка', key: 'order.2026:11' },
  ])('некоректний ключ ($name) → 400 INVALID_IDEMPOTENCY_KEY, замовлення не створено', async ({ key }) => {
    const res = await postOrder(app, token, makeOrderPayload(), key);
    expect(res.status).toBe(400);
    expectSchema(res.body, errorSchema);
    expect(res.body.code).toBe('INVALID_IDEMPOTENCY_KEY');
    expect((await listOrders(app, token)).body).toEqual([]);
  });

  it('два заголовки Idempotency-Key в одному запиті → 400', async () => {
    const res = await request(app).post('/orders')
      .set('Authorization', `Bearer ${token}`)
      // масив — два окремі рядки заголовка; типи supertest приймають лише рядок
      .set('Idempotency-Key', ['first-key-0001', 'second-key-0002'] as unknown as string)
      .send(makeOrderPayload());
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_IDEMPOTENCY_KEY');
  });

  it.each([
    { name: 'рівно 8 символів', key: 'abcd1234' },
    { name: 'рівно 64 символи', key: 'k'.repeat(64) },
    { name: 'UUID', key: '3f2c8a90-5b1e-4d7a-9c3e-1a2b3c4d5e6f' },
    { name: 'дефіси й підкреслення', key: 'order_2026-11-01' },
  ])('коректний ключ ($name) → 201', async ({ key }) => {
    const res = await postOrder(app, token, makeOrderPayload(), key);
    expect(res.status).toBe(201);
    expect(res.headers['idempotent-replayed']).toBe('false');
  });
});

describe('Idempotency-Key — доступ', () => {
  let app: App;
  beforeEach(() => { app = createApp(); });

  it.each([
    { name: 'без токена', header: undefined },
    { name: 'підроблений токен', header: 'Bearer invalid-token' },
  ])('POST /orders з ключем $name → 401, нічого не створено', async ({ header }) => {
    const key = randomUUID();
    const req = request(app).post('/orders').set('Idempotency-Key', key);
    if (header) req.set('Authorization', header);
    const res = await req.send(makeOrderPayload());
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ code: 'UNAUTHORIZED' });

    // ключ не «згорів»: справжній користувач з тим самим ключем створює замовлення
    const bob = await login(app, 'bob@example.com');
    const ok = await postOrder(app, bob, makeOrderPayload(), key);
    expect(ok.status).toBe(201);
    expect(ok.headers['idempotent-replayed']).toBe('false');
  });

  it('ключ іншого користувача не повертає чужого замовлення', async () => {
    const alice = await login(app, 'alice@example.com');
    const bob = await login(app, 'bob@example.com');
    const key = randomUUID();
    const aliceOrder = await postOrder(app, alice, makeOrderPayload(), key);

    const bobOrder = await postOrder(app, bob, makeOrderPayload(), key);
    expect(bobOrder.status).toBe(201);
    expect(bobOrder.headers['idempotent-replayed']).toBe('false');
    expect(bobOrder.body.id).not.toBe(aliceOrder.body.id);
    expect(bobOrder.body.tier).toBe('basic');                        // замовлення саме Bob, не Alice (gold)

    const peek = await request(app).get(aliceOrder.headers.location)
      .set('Authorization', `Bearer ${bob}`);
    expect(peek.status).toBe(404);
    expect((await listOrders(app, alice)).body).toEqual([aliceOrder.body]);
    expect((await listOrders(app, bob)).body).toEqual([bobOrder.body]);
  });

  it('ключ іншого користувача з іншим тілом — не 422: існування чужого ключа не розкривається', async () => {
    const alice = await login(app, 'alice@example.com');
    const bob = await login(app, 'bob@example.com');
    const key = randomUUID();
    await postOrder(app, alice, makeOrderPayload(), key);

    const res = await postOrder(
      app, bob, makeOrderPayload({ items: [{ sku: 'SKU-Z', price: 10, qty: 3 }] }), key,
    );
    expect(res.status).toBe(201);
    expect(res.body.total).toBeCloseTo(90, 2);                       // 30 + 60 доставка
  });
});
