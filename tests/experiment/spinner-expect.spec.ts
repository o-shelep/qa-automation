import { test, expect } from '@playwright/test';
import { USERS } from '../data';

// Твердження очікування: тест завершується одразу після появи товарів
test('динамічний каталог: перевірка через твердження очікування', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Username').fill(USERS.standard.username);
  await page.getByPlaceholder('Password').fill(USERS.standard.password);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/inventory/);
  await page.goto('/dynamic-catalog-spinner.html');

  await expect(page.locator('[data-test^="spinner-item-"][data-test$="-name"]')).toHaveCount(6);
  await expect(page.getByRole('status', { name: 'Loading' })).toHaveCount(0);
});
