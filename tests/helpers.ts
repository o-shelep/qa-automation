import { beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { http, passthrough } from 'msw';
import { server } from './msw/server';

// Supertest надсилає справжні HTTP-запити до застосунку на 127.0.0.1.
// MSW із ЛР4 (onUnhandledRequest: 'error') блокує їх, тому дозволяємо лише локальні запити.
// resetHandlers() після кожного тесту прибирає цей обробник, тож додаємо його перед кожним тестом.
beforeEach(() => {
  server.use(http.all(/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//, () => passthrough()));
});

export async function login(app: Express, email: string): Promise<string> {
  const res = await request(app).post('/auth/login')
    .send({ email, password: 'Secret123' });
  if (res.status !== 200) throw new Error(`login failed: ${res.status}`);
  return res.body.accessToken;
}

export function makeOrderPayload(overrides: Partial<{ items: unknown }> = {}) {
  return { items: [{ sku: 'SKU-A', price: 500, qty: 1 }], ...overrides };
}