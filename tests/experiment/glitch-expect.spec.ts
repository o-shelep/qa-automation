import { test, expect } from '@playwright/test';
import { USERS } from '../data';

// Правильний підхід: твердження очікування замість паузи
test('performance_glitch_user: перевірка входу через твердження очікування', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Username').fill(USERS.slow.username);
  await page.getByPlaceholder('Password').fill(USERS.slow.password);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL(/inventory/);
  await expect(page.locator('[data-test="title"]')).toHaveText('Products');
});
