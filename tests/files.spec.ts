import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

test.describe('Файлові операції', () => {
  test('вивантаження файлу на сервер', async ({ page }) => {
    await page.goto('/upload');
   const filePath = path.join(test.info().project.testDir, 'files', 'upload-sample.txt');
    await page.locator('#file-upload').setInputFiles(filePath);
    await page.locator('#file-submit').click();
    await expect(page.locator('#uploaded-files')).toHaveText('upload-sample.txt');
  });

  test('завантаження файлу зі сторінки', async ({ page }) => {
    await page.goto('/download');
    // Очікування події створюється ДО натискання, без await
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#content a').first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBeTruthy();
    // Файл зберігається до каталогу результатів саме цього тесту
    const target = path.join(test.info().outputDir, download.suggestedFilename());
    await download.saveAs(target);
    expect(fs.existsSync(target)).toBe(true);
    expect(fs.statSync(target).size).toBeGreaterThan(0);
  });
});
