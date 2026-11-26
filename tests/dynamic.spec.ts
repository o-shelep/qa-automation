import { test, expect } from '@playwright/test';

test('елемент з\'являється після динамічного завантаження', async ({ page }) => {
  await page.goto('/dynamic_loading/2');
  await page.getByRole('button', { name: 'Start' }).click();
  // Жодних пауз: очікувальне твердження саме дочекається появи
  await expect(page.locator('#finish')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('#finish')).toHaveText('Hello World!');
  // Індикатор завантаження має зникнути
  await expect(page.locator('#loading')).toBeHidden();
});
