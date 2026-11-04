import {Test} from '@nestjs/testing';
import {AppModule} from '../src/app.module';
import {INestApplication,ValidationPipe} from '@nestjs/common';
import request from 'supertest';
describe('Menu to paid order (e2e)',()=>{
 let app:INestApplication;
 beforeAll(async()=>{const m=await Test.createTestingModule({imports:[AppModule]}).compile();app=m.createNestApplication();app.setGlobalPrefix('api');app.useGlobalPipes(new ValidationPipe({whitelist:true,transform:true,forbidNonWhitelisted:true}));await app.init()});
 afterAll(async()=>app.close());
 it('loads menu, registers, places an order, handles a failed charge and retry',async()=>{
  const menu=await request(app.getHttpServer()).get('/api/products').expect(200);expect(menu.body.length).toBeGreaterThan(0);
  const p=menu.body[0];const auth=await request(app.getHttpServer()).post('/api/auth/register').send({email:`e2e-${Date.now()}@brewlite.local`,name:'E2E Customer',password:'BrewLite123!'}).expect(201);const headers={Authorization:`Bearer ${auth.body.accessToken}`};
  const created=await request(app.getHttpServer()).post('/api/orders').set(headers).send({items:[{productId:p.id,size:p.sizes[0].name,toppings:[],quantity:1}]}).expect(201);expect(created.body.status).toBe('PENDING_PAYMENT');
  const failed=await request(app.getHttpServer()).post(`/api/orders/${created.body.id}/pay`).set(headers).set('Idempotency-Key',`e2e-fail-${Date.now()}`).send({method:'MOCK_WALLET',simulate:'fail'}).expect(201);expect(failed.body.payment.status).toBe('FAILED');
  const paid=await request(app.getHttpServer()).post(`/api/orders/${created.body.id}/pay`).set(headers).set('Idempotency-Key',`e2e-ok-${Date.now()}`).send({method:'MOCK_WALLET',simulate:'success'}).expect(201);expect(paid.body.order.status).toBe('CONFIRMED');
 });
});
