import { test, expect } from '@playwright/test';

test.describe('Елементи форм', () => {
  test('вибір значення у випадному списку', async ({ page }) => {
    await page.goto('/dropdown');
    const dropdown = page.locator('#dropdown');
    await dropdown.selectOption('2');
    await expect(dropdown).toHaveValue('2');
    await expect(dropdown.locator('option:checked')).toHaveText('Option 2');
  });

  test('керування станом прапорців', async ({ page }) => {
    await page.goto('/checkboxes');
    const boxes = page.locator('#checkboxes input[type="checkbox"]');
    await expect(boxes).toHaveCount(2);
    // check() і uncheck() встановлюють потрібний стан незалежно
    // від поточного — на відміну від click(), який його перемикає
    await boxes.nth(0).check();
    await boxes.nth(1).uncheck();
    await expect(boxes.nth(0)).toBeChecked();
    await expect(boxes.nth(1)).not.toBeChecked();
  });

  test('переміщення повзунка клавіатурою', async ({ page }) => {
    await page.goto('/horizontal_slider');
    const slider = page.locator('input[type="range"]');
    // focus(), а не click(): натискання ставить повзунок у точку кліку (середину, 2.5)
    await slider.focus();
    await expect(page.locator('#range')).toHaveText('0');
    for (let i = 0; i < 3; i++) {
      await slider.press('ArrowRight');
    }
    await expect(page.locator('#range')).toHaveText('1.5');
  });
});
