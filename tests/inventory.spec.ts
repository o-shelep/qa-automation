import { test, expect } from '@playwright/test';
import { USERS } from './data';

test.describe('Каталог товарів', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Username').fill(USERS.standard.username);
    await page.getByPlaceholder('Password').fill(USERS.standard.password);
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/inventory\.html/);
  });

  test('каталог містить шість товарів', async ({ page }) => {
    await expect(page.locator('.inventory_item')).toHaveCount(6);
  });

  test('сортування за зростанням ціни впорядковує список', async ({ page }) => {
    await page.locator('[data-test="product-sort-container"]')
      .selectOption('lohi');
    const prices = await page.locator('.inventory_item_price')
      .allTextContents();
    const numbers = prices.map((t) => Number(t.replace('$', '')));
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
  });

  test('додавання товару оновлює лічильник кошика', async ({ page }) => {
    const badge = page.locator('.shopping_cart_badge');
    await expect(badge).toHaveCount(0);
    await page
      .locator('.inventory_item')
      .filter({ hasText: 'Sauce Labs Backpack' })
      .getByRole('button', { name: 'Add to cart' })
      .click();
    await expect(badge).toHaveText('1');
  });

  test('видалення товару очищає лічильник', async ({ page }) => {
    const item = page.locator('.inventory_item')
      .filter({ hasText: 'Sauce Labs Bike Light' });
    await item.getByRole('button', { name: 'Add to cart' }).click();
    await expect(page.locator('.shopping_cart_badge')).toHaveText('1');
    await item.getByRole('button', { name: 'Remove' }).click();
    await expect(page.locator('.shopping_cart_badge')).toHaveCount(0);
  });
});
