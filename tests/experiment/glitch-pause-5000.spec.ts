import { test, expect } from '@playwright/test';
import { USERS } from '../data';

// Анти-приклад: явна пауза 5000 мс + одноразові (неочікувальні) твердження
test('performance_glitch_user: перевірка входу через паузу 5000 мс', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Username').fill(USERS.slow.username);
  await page.getByPlaceholder('Password').fill(USERS.slow.password);
  await page.getByRole('button', { name: 'Login' }).click();

  await page.waitForTimeout(5000);

  // Твердження виконуються один раз і не чекають
  expect(page.url()).toContain('inventory.html');
  const titleVisible = await page.locator('[data-test="title"]').isVisible();
  expect(titleVisible).toBe(true);
});
