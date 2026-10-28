import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const RATE_URL = 'https://api.example.com/rate';

export const handlers = [
  http.get(RATE_URL, () => HttpResponse.json({ rate: 41.25 })),
];

export const server = setupServer(...handlers);