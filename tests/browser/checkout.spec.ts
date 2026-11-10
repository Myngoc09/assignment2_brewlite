import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

test('customer orders a customized drink and tracks the confirmation', async ({ page }) => {
  await page.addInitScript(() => {
    // Browsers expose randomUUID only in secure contexts.
    Object.defineProperty(Crypto.prototype, 'randomUUID', { value: undefined });
  });
  await page.goto('/');
  await page.getByRole('heading', { name: 'Cloud Matcha' }).click();
  const product = page.locator('.product-modal');
  await expect(product.getByRole('heading', { name: 'Cloud Matcha' })).toBeVisible();
  await product.getByRole('button', { name: /^L/ }).click();
  await product.getByRole('checkbox', { name: /Trân châu/ }).check();
  await product.getByRole('button', { name: /Thêm vào giỏ/ }).click();
  await page.getByRole('button', { name: /Giỏ hàng/ }).click();
  await page.getByRole('button', { name: /Đặt hàng/ }).click();
  await page.getByRole('button', { name: /Chưa có tài khoản/ }).click();
  await page.getByLabel('Họ tên').fill('Browser Customer');
  await page.getByLabel('Email').fill(`browser-${randomUUID()}@brewlite.local`);
  await page.getByLabel('Mật khẩu').fill('BrewLite123!');
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click();

  await page.getByRole('button', { name: /Giỏ hàng/ }).click();
  await expect(page.locator('.cart-line')).toContainText('L · Trân châu');
  await page.getByRole('button', { name: /Đặt hàng/ }).click();

  await expect(page.getByText('CONFIRMED', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Theo dõi đơn' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'CONFIRMED' })).toBeVisible();
});
