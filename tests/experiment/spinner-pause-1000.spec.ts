import { test, expect } from '@playwright/test';
import { USERS } from '../data';

// Анти-приклад на динамічному вмісті: спінер 0,5–3 с, пауза 1000 мс
test('динамічний каталог: перевірка через паузу 1000 мс', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Username').fill(USERS.standard.username);
  await page.getByPlaceholder('Password').fill(USERS.standard.password);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/inventory/);
  await page.goto('/dynamic-catalog-spinner.html');

  await page.waitForTimeout(1000);

  const count = await page.locator('[data-test^="spinner-item-"][data-test$="-name"]').count();
  expect(count).toBe(6);
});
