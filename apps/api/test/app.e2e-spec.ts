import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

describe('Checkout with PostgreSQL', () => {
  let app: INestApplication;
  const client = () => request(app.getHttpServer());

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.listen(0, '127.0.0.1');
  });

  afterAll(async () => app?.close());

  async function login(email: string) {
    const session = await client().post('/api/auth/login')
      .send({ email, password: 'BrewLite123!' }).expect(201);
    return { Authorization: `Bearer ${session.body.accessToken}` };
  }

  async function firstMenuItem() {
    const menu = await client().get('/api/products').expect(200);
    expect(menu.body.length).toBeGreaterThan(0);
    const product = menu.body[0];
    return { productId: product.id, size: product.sizes[0].name, toppings: [], quantity: 1 };
  }

  it('validates stock and rolls back all item decrements if the order fails', async () => {
    await client().get('/api/health').expect(200);
    const item = await firstMenuItem();
    const detail = await client().get(`/api/products/${item.productId}`).expect(200);
    await client().get('/api/products/unknown-product').expect(404);
    const customer = await login('customer@brewlite.local');

    await client().post('/api/orders').send({ items: [item] }).expect(401);
    await client().post('/api/orders').set(customer)
      .send({ items: [item, { ...item, quantity: detail.body.inventory }] }).expect(400);
    const unchanged = await client().get(`/api/products/${item.productId}`).expect(200);
    expect(unchanged.body.inventory).toBe(detail.body.inventory);
  });

  it('registers, retries a failed payment, replays the same key and tracks the order', async () => {
    const item = await firstMenuItem();
    const session = await client().post('/api/auth/register')
      .send({ email: `e2e-${randomUUID()}@brewlite.local`, name: 'E2E Customer', password: 'BrewLite123!' })
      .expect(201);
    expect(session.body.user).not.toHaveProperty('passwordHash');
    const customer = { Authorization: `Bearer ${session.body.accessToken}` };
    const created = await client().post('/api/orders').set(customer)
      .send({ items: [item], promotionCode: 'BREW10' }).expect(201);
    expect(created.body.status).toBe('PENDING');
    expect(created.body.discountCents).toBe(Math.floor(created.body.subtotalCents / 10));
    const path = `/api/orders/${created.body.id}`;
    const pay = (key: string, simulate: 'success' | 'fail') =>
      client().post('/api/payments').set(customer).set('Idempotency-Key', key)
        .send({ orderId: created.body.id, method: 'MOCK_WALLET', simulate }).expect(201);

    const failed = await pay(randomUUID(), 'fail');
    expect(failed.body.payment.status).toBe('FAILED');
    expect(failed.body.order.status).toBe('PAYMENT_FAILED');
    await client().get('/api/orders/loyalty').set(customer).expect(200, { points: 0 });
    const successKey = randomUUID();
    const paid = await pay(successKey, 'success');
    expect(paid.body.order.status).toBe('PAID');
    const replay = await pay(successKey, 'success');
    expect(replay.body.payment.id).toBe(paid.body.payment.id);
    expect(replay.body.replayed).toBe(true);

    const otherCustomer = await login('customer@brewlite.local');
    await client().get(path).set(otherCustomer).expect(404);
    await client().patch(`${path}/status`).set(customer).send({ status: 'PREPARING' }).expect(403);
    const staff = await login('staff@brewlite.local');
    await client().patch(`${path}/status`).set(staff).send({ status: 'READY' }).expect(409);
    await client().patch(`${path}/status`).set(staff).send({ status: 'PREPARING' }).expect(200);
    const history = await client().get('/api/orders/me').set(customer).expect(200);
    expect(history.body).toHaveLength(1);
    await client().get('/api/orders/loyalty').set(customer)
      .expect(200, { points: Math.floor(paid.body.order.totalCents / 10000) });
    const tracked = history.body.find((order: { id: string }) => order.id === created.body.id);
    expect(tracked.status).toBe('PREPARING');
    expect(tracked.statusHistory.map((entry: { status: string }) => entry.status))
      .toEqual(['PENDING', 'PAYMENT_FAILED', 'PENDING', 'PAID', 'PREPARING']);
    await client().patch(`${path}/status`).set(staff).send({ status: 'READY' }).expect(200);
    await client().patch(`${path}/status`).set(staff).send({ status: 'COMPLETED' }).expect(200);
    await client().patch(`${path}/status`).set(staff).send({ status: 'CANCELLED' }).expect(409);
  });

  it('sells the last unit only once when two customers order concurrently', async () => {
    const db = app.get(PrismaService);
    const slug = `e2e-stock-${randomUUID()}`;
    const product = await db.product.create({
      data: {
        slug, name: 'E2E last unit', description: 'Concurrency fixture', category: 'Test',
        inventory: 1, sizes: { create: { name: 'M', priceCents: 30000 } },
      },
    });
    try {
      const customers = await Promise.all([1, 2].map(async () => {
        const { body } = await client().post('/api/auth/register')
          .send({ email: `e2e-stock-${randomUUID()}@brewlite.local`, name: 'Stock Customer', password: 'BrewLite123!' })
          .expect(201);
        return { Authorization: `Bearer ${body.accessToken}` };
      }));
      const orders = await Promise.all(customers.map(auth =>
        client().post('/api/orders').set(auth)
          .send({ items: [{ productId: product.id, size: 'M', toppings: [], quantity: 1 }] }),
      ));
      expect(orders.map(order => order.status).sort()).toEqual([201, 400]);
      const detail = await client().get(`/api/products/${product.id}`).expect(200);
      expect(detail.body.inventory).toBe(0);
      expect(await db.orderItem.count({ where: { productId: product.id } })).toBe(1);
      const winner = orders.findIndex(order => order.status === 201);
      const path = `/api/orders/${orders[winner].body.id}/status`;
      await client().patch(path).set(customers[1 - winner]).send({ status: 'CANCELLED' }).expect(404);
      await client().patch(path).set(customers[winner]).send({ status: 'CANCELLED' }).expect(200);
      await client().patch(path).set(customers[winner]).send({ status: 'CANCELLED' }).expect(409);
      expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).inventory).toBe(1);
    } finally {
      await db.order.deleteMany({ where: { items: { some: { productId: product.id } } } });
      await db.product.delete({ where: { id: product.id } });
    }
  });

  it('allows only one successful payment when distinct keys arrive concurrently', async () => {
    const customer = await login('customer@brewlite.local');
    const created = await client().post('/api/orders').set(customer)
      .send({ items: [await firstMenuItem()] }).expect(201);
    const path = `/api/orders/${created.body.id}`;
    const attempts = await Promise.all([randomUUID(), randomUUID()].map(key =>
      client().post(`${path}/pay`).set(customer).set('Idempotency-Key', key)
        .send({ method: 'MOCK_CARD' }),
    ));
    expect(attempts.map(response => response.status).sort()).toEqual([201, 409]);
    const confirmed = await client().get(path).set(customer).expect(200);
    expect(confirmed.body.payments).toHaveLength(1);
  });
});
