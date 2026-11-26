import { test, expect, type Page } from '@playwright/test';

// Варіант 9. /dynamic_controls: увімкнення та вимкнення поля введення,
// перевірка доступності поля й тексту повідомлення

// Усі елементи блоку Enable/disable шукаються всередині його форми
const inputBlock = (page: Page) => page.locator('#input-example');
const textbox = (page: Page) => inputBlock(page).getByRole('textbox');
const toggleButton = (page: Page) => inputBlock(page).getByRole('button');
const loading = (page: Page) => inputBlock(page).getByText('Wait for it...');
const message = (page: Page) => page.locator('#message');

// Натискає кнопку й чекає завершення асинхронної зміни (≈3 с) без пауз
async function toggleAndWait(page: Page, expectedMessage: string, nextLabel: string) {
  await toggleButton(page).click();
  // Під час завантаження кнопка заблокована, видно індикатор
  await expect(toggleButton(page)).toBeDisabled();
  await expect(loading(page)).toBeVisible();
  // Завершення: повідомлення, нова назва кнопки, індикатор сховано
  await expect(message(page)).toHaveText(expectedMessage);
  await expect(toggleButton(page)).toHaveText(nextLabel);
  await expect(toggleButton(page)).toBeEnabled();
  await expect(loading(page)).toBeHidden();
}

test.describe('Динамічні елементи керування: поле введення', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dynamic_controls');
    // Початковий стан: поле вимкнене, повідомлення немає
    await expect(textbox(page)).toBeDisabled();
    await expect(toggleButton(page)).toHaveText('Enable');
    await expect(message(page)).toHaveCount(0);
  });

  test('після натискання Enable поле стає доступним для введення', async ({ page }) => {
    await toggleAndWait(page, "It's enabled!", 'Disable');

    await expect(textbox(page)).toBeEnabled();
    await expect(textbox(page)).toBeEditable();
    await textbox(page).fill('Текст після увімкнення');
    await expect(textbox(page)).toHaveValue('Текст після увімкнення');
  });

  test('після натискання Disable поле знову недоступне, повідомлення оновлюється', async ({ page }) => {
    await toggleAndWait(page, "It's enabled!", 'Disable');
    await textbox(page).fill('Введене значення');

    await toggleAndWait(page, "It's disabled!", 'Enable');

    await expect(textbox(page)).toBeDisabled();
    await expect(textbox(page)).not.toBeEditable();
    // Попереднє повідомлення замінено, а не додано друге
    await expect(message(page)).toHaveCount(1);
    // Вимкнення не очищає введене значення
    await expect(textbox(page)).toHaveValue('Введене значення');
  });
});
