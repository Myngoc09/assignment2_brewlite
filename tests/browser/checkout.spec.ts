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
  await expect(product.getByRole('button', { name: /^L/ })).toContainText(/\d+ ly/);
  await product.getByRole('button', { name: /^L/ }).click();
  await product.getByRole('checkbox', { name: /Trân châu/ }).check();
  await product.getByRole('button', { name: /Thêm vào giỏ/ }).click();
  await page.getByRole('button', { name: /Giỏ hàng/ }).click();
  await page.getByRole('button', { name: /^Thanh toán/ }).click();
  await page.getByRole('button', { name: /Chưa có tài khoản/ }).click();
  await page.getByLabel('Họ tên').fill('Browser Customer');
  await page.getByLabel('Email').fill(`browser-${randomUUID()}@brewlite.local`);
  await page.getByLabel('Mật khẩu').fill('BrewLite123!');
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click();

  await page.getByRole('button', { name: /Giỏ hàng/ }).click();
  await expect(page.locator('.cart-line')).toContainText('L · Trân châu');
  await page.getByRole('button', { name: /^Thanh toán/ }).click();

  await page.getByLabel('Phương thức').selectOption('MOCK_CARD');
  await page.getByLabel('Mã ưu đãi').fill('BREW10');
  await page.getByLabel('Mô phỏng thất bại').check();
  await page.getByRole('button', { name: 'Xác nhận thanh toán' }).click();
  await expect(page.getByRole('dialog', { name: 'Thanh toán' }).getByRole('alert'))
    .toContainText('Thanh toán thất bại');
  await page.getByRole('button', { name: /Về giỏ hàng/ }).click();
  await expect(page.locator('.cart-line')).toContainText('L · Trân châu');
  await page.getByRole('button', { name: /^Thanh toán/ }).click();
  await page.getByLabel('Mô phỏng thất bại').uncheck();
  await page.getByRole('button', { name: 'Xác nhận thanh toán' }).click();

  const confirmation = page.getByRole('dialog', { name: 'Đặt hàng thành công' });
  await expect(confirmation).toContainText('PAID');
  await expect(confirmation).toContainText('BL-');
  await expect(confirmation).toContainText('Ưu đãi');
  await confirmation.getByRole('button', { name: 'Xem lịch sử đơn hàng' }).click();
  await expect(page.locator('.cart-line')).toHaveCount(1);
  await page.getByRole('button', { name: 'Theo dõi đơn' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'PAYMENT_FAILED' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'PAID' })).toBeVisible();
});
