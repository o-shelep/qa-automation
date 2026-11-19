import { test, expect } from '@playwright/test';
import { USERS } from './data';

test.describe('Вхід до системи', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('користувач із коректними даними потрапляє до каталогу', async ({ page }) => {
    await page.getByPlaceholder('Username').fill(USERS.standard.username);
    await page.getByPlaceholder('Password').fill(USERS.standard.password);
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page).toHaveURL(/inventory\.html/);
    await expect(page.getByText('Products')).toBeVisible();
  });

  test('заблокований користувач отримує повідомлення про помилку', async ({ page }) => {
    await page.getByPlaceholder('Username').fill(USERS.locked.username);
    await page.getByPlaceholder('Password').fill(USERS.locked.password);
    await page.getByRole('button', { name: 'Login' }).click();

    const error = page.locator('[data-test="error"]');
    await expect(error).toBeVisible();
    await expect(error).toContainText(/locked out/i);
    await expect(page).not.toHaveURL(/inventory/);
  });

  test('порожні поля не пропускають до системи', async ({ page }) => {
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.locator('[data-test="error"]'))
      .toContainText(/Username is required/i);
  });
});
