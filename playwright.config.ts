import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    // Публічний стенд за замовчуванням; локальний стенд задається через BASE_URL
    baseURL: process.env.BASE_URL ?? 'https://the-internet.herokuapp.com',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
