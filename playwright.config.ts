import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Експеримент кроку 6 запускається окремо (EXPERIMENT=1), щоб не сповільнювати основний набір
  testIgnore: process.env.EXPERIMENT ? [] : ['**/experiment/**'],
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    // Публічний стенд за замовчуванням; локальний стенд задається через BASE_URL
    baseURL: process.env.BASE_URL ?? 'https://www.saucedemo.com',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    // Атрибут тестових ідентифікаторів у Swag Labs — data-test
    testIdAttribute: 'data-test',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
