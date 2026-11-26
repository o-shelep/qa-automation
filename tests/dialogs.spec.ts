import { test, expect } from '@playwright/test';

test.describe('Діалоги JavaScript', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/javascript_alerts');
  });

  test('просте повідомлення', async ({ page }) => {
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toBe('I am a JS Alert');
      await dialog.accept();
    });
    await page.getByRole('button', { name: 'Click for JS Alert' }).click();
    await expect(page.locator('#result')).toHaveText('You successfully clicked an alert');
  });

  test('скасування підтвердження', async ({ page }) => {
    page.once('dialog', (dialog) => dialog.dismiss());
    await page.getByRole('button', { name: 'Click for JS Confirm' }).click();
    await expect(page.locator('#result')).toHaveText('You clicked: Cancel');
  });

  test('введення значення у запиті', async ({ page }) => {
    page.once('dialog', (dialog) => dialog.accept('Тестове значення'));
    await page.getByRole('button', { name: 'Click for JS Prompt' }).click();
    await expect(page.locator('#result')).toHaveText('You entered: Тестове значення');
  });
});
