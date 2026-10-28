import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const RATE_URL = 'https://api.example.com/rate';
export const MAILING_BASE = 'https://mail.example.com';
export const MAILING_URL = `${MAILING_BASE}/messages`;

export const handlers = [
  http.get(RATE_URL, () => HttpResponse.json({ rate: 41.25 })),
  http.post(MAILING_URL, () => HttpResponse.json({ messageId: 'srv-1' }, { status: 202 })),
];

export const server = setupServer(...handlers);