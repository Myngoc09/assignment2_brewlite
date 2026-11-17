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

test('customer signs in again and resumes VNPAY on the same order after a 401', async ({ page, request }) => {
  const email = `browser-${randomUUID()}@brewlite.local`;
  const password = 'BrewLite123!';
  const registration = await request.post('/api/auth/register', {
    data: { email, password, name: 'QR Browser Customer' },
  });
  expect(registration.ok()).toBe(true);
  const { accessToken, user } = await registration.json();
  await page.addInitScript(({ accessToken, user }) => {
    if (localStorage.getItem('token')) return;
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
  }, { accessToken, user });

  const qrRequests: string[] = [];
  await page.route('**/api/orders/*/vnpay', async route => {
    const url = new URL(route.request().url());
    const orderId = url.pathname.split('/')[3];
    qrRequests.push(orderId);
    if (qrRequests.length === 1) {
      await route.fulfill({ status: 401, json: { message: 'Invalid or expired token' } });
    } else {
      await route.fulfill({ json: {
        paymentUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jE2sAAAAASUVORK5CYII=',
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      } });
    }
  });
  await page.goto('/');
  await page.getByRole('heading', { name: 'Cloud Matcha' }).click();
  await page.getByRole('button', { name: /Thêm vào giỏ/ }).click();
  await page.getByRole('button', { name: /Giỏ hàng/ }).click();
  await page.getByRole('button', { name: /^Thanh toán/ }).click();
  await page.getByLabel('Phương thức').selectOption('VNPAY_QR');
  await page.getByLabel('Mã ưu đãi').fill('BREW10');
  await page.getByRole('button', { name: 'Xác nhận thanh toán' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Phiên đăng nhập đã hết hạn' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill(password);
  await page.locator('form').getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page.getByLabel('Phương thức')).toHaveValue('VNPAY_QR');
  await expect(page.getByLabel('Mã ưu đãi')).toHaveValue('BREW10');
  await page.getByRole('button', { name: 'Xác nhận thanh toán' }).click();
  const payment = page.getByRole('dialog', { name: 'Thanh toán VNPAY' });
  await expect(payment.getByRole('img', { name: 'Mã QR mở trang thanh toán VNPAY' })).toBeVisible();
  await expect(payment).toContainText('Đang chờ backend');
  expect(qrRequests).toEqual([qrRequests[0], qrRequests[0]]);
});
