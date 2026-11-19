import { test, expect, type Page } from '@playwright/test';
import { USERS } from '../data';

// Варіант 9. Сторінка огляду замовлення: коректність підсумкової суми
const PRODUCTS = ['Sauce Labs Backpack', 'Sauce Labs Bolt T-Shirt', 'Sauce Labs Onesie'];
const TAX_RATE = 0.08;

const money = (text: string): number => Number(text.replace(/[^0-9.]/g, ''));
const usd = (value: number): string => `$${value.toFixed(2)}`;

// Додає товари з каталогу і повертає їхні ціни, прочитані зі списку
async function addProducts(page: Page, names: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  for (const name of names) {
    const card = page.getByTestId('inventory-item').filter({ hasText: name });
    const price = card.getByTestId('inventory-item-price');
    await expect(price).toHaveText(/^\$\d+\.\d{2}$/);
    prices.set(name, money((await price.textContent()) ?? ''));
    await card.getByRole('button', { name: 'Add to cart' }).click();
    await expect(card.getByRole('button', { name: 'Remove' })).toBeVisible();
  }
  await expect(page.getByTestId('shopping-cart-badge')).toHaveText(String(names.length));
  return prices;
}

// Кошик -> форма покупця -> сторінка огляду замовлення
async function openOverview(page: Page): Promise<void> {
  await page.getByTestId('shopping-cart-link').click();
  await expect(page).toHaveURL(/cart\.html/);
  await page.getByRole('button', { name: 'Checkout' }).click();
  await page.getByRole('textbox', { name: 'First Name' }).fill('Olena');
  await page.getByRole('textbox', { name: 'Last Name' }).fill('Test');
  await page.getByRole('textbox', { name: 'Zip/Postal Code' }).fill('88000');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/checkout-step-two\.html/);
}

test.describe('Огляд замовлення: підсумкова сума', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Username').fill(USERS.standard.username);
    await page.getByPlaceholder('Password').fill(USERS.standard.password);
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/inventory\.html/);
  });

  test('Item total дорівнює сумі цін доданих товарів', async ({ page }) => {
    const prices = await addProducts(page, PRODUCTS);
    await openOverview(page);

    const rows = page.getByTestId('inventory-item');
    await expect(rows).toHaveCount(PRODUCTS.length);

    // Кожен товар присутній в огляді з тією самою ціною, що й у каталозі
    for (const [name, price] of prices) {
      const row = rows.filter({ hasText: name });
      await expect(row.getByTestId('inventory-item-price')).toHaveText(usd(price));
      await expect(row.getByTestId('item-quantity')).toHaveText('1');
    }

    const expectedSubtotal = [...prices.values()].reduce((sum, p) => sum + p, 0);
    await expect(page.getByTestId('subtotal-label'))
      .toHaveText(`Item total: ${usd(expectedSubtotal)}`);
  });

  test('Total дорівнює Item total + податок 8 %', async ({ page }) => {
    const prices = await addProducts(page, PRODUCTS);
    await openOverview(page);

    const subtotal = [...prices.values()].reduce((sum, p) => sum + p, 0);
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    await expect(page.getByTestId('subtotal-label')).toHaveText(`Item total: ${usd(subtotal)}`);
    await expect(page.getByTestId('tax-label')).toHaveText(`Tax: ${usd(tax)}`);
    await expect(page.getByTestId('total-label')).toHaveText(`Total: ${usd(total)}`);
  });
});
