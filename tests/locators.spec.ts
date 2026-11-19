import { test, expect } from '@playwright/test';

// Крок 2: перевірка, що всі п'ять способів знаходять те саме поле імені користувача
test.describe('Дослідження локаторів поля Username', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('п\'ять локаторів вказують на один і той самий елемент', async ({ page }) => {
    const variants = {
      role: page.getByRole('textbox', { name: 'Username' }),
      placeholder: page.getByPlaceholder('Username'),
      testId: page.locator('[data-test="username"]'),
      css: page.locator('#user-name'),
      xpath: page.locator('//form/div[1]/input'),
    };

    for (const locator of Object.values(variants)) {
      await expect(locator).toHaveCount(1);
      await expect(locator).toBeVisible();
    }

    // Введене через один локатор значення видно через усі інші
    await variants.role.fill('standard_user');
    for (const locator of Object.values(variants)) {
      await expect(locator).toHaveValue('standard_user');
    }
  });
});
