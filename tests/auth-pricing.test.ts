import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { login } from './helpers';
import { expectSchema } from './schema';
import { errorSchema } from './schemas/error.schema';

describe('POST /auth/login', () => {
  it.each([
    { name: 'хибний пароль', body: { email: 'bob@example.com', password: 'wrong' } },
    { name: 'невідомий користувач', body: { email: 'eve@example.com', password: 'Secret123' } },
    { name: 'порожнє тіло', body: {} },
  ])('$name → 401 INVALID_CREDENTIALS', async ({ body }) => {
    const res = await request(createApp()).post('/auth/login').send(body);
    expect(res.status).toBe(401);
    expectSchema(res.body, errorSchema);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('Розрахунок суми замовлення', () => {
  it.each([
    { user: 'bob@example.com',   price: 500,  total: 560,  note: 'basic, доставка 60' },
    { user: 'bob@example.com',   price: 1000, total: 1000, note: 'basic, безкоштовна доставка від 1000' },
    { user: 'bob@example.com',   price: 2000, total: 1900, note: 'basic, +5 % від 2000' },
    { user: 'alice@example.com', price: 500,  total: 510,  note: 'gold −10 %, доставка 60' },
    { user: 'alice@example.com', price: 2000, total: 1700, note: 'gold −10 % і −5 %' },
  ])('$note → total $total', async ({ user, price, total }) => {
    const app = createApp();
    const token = await login(app, user);
    const res = await request(app).post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ sku: 'SKU-A', price, qty: 1 }] });
    expect(res.status).toBe(201);
    expect(res.body.total).toBeCloseTo(total, 2);
  });
});
