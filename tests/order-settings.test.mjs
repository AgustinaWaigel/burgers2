import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { loadModule } from './load-module.mjs';
function setup({ minimum = 0, methods = ['Efectivo'], configured = true, zones = ['Centro'], hours = {}, promotions = [], whatsapp = '5491112345678' } = {}) {
  const saved = [];
  const settings = { minimumOrder: minimum, deliveryCost: 200, paymentMethods: methods, deliveryZones: zones, hours, whatsappNumber: whatsapp };
  const products = [{ id: 'burger', name: 'Clásica', price: 1000, ingredients: [{ ingredientId: 'onion', removable: true, ingredient: { name: 'Cebolla' } }], extras: [{ extraId: 'cheese', extra: { id: 'cheese', name: 'Cheddar', price: 250 } }] }];
  const prisma = {
    product: { findMany: async () => products },
    storeSettings: { findFirst: async () => configured ? settings : null },
    promotion: { findMany: async ({where}) => promotions.filter(p => p.active && p.code === where.code && p.startsAt <= where.startsAt.lte && p.endsAt > where.endsAt.gt) },
    order: {
      findUnique: async ({where}) => saved.find(order => order.requestId === where.requestId) ?? null,
      create: async ({ data }) => {
        if (saved.some(order => order.requestId === data.requestId)) throw new Prisma.PrismaClientKnownRequestError('duplicate', {code: 'P2002', clientVersion: '6'});
        saved.push(data); return data;
      },
    },
  };
  const api = loadModule('lib/orders.ts', { '@/lib/db': { prisma, isDatabaseConfigured: () => true }, 'node:crypto': { createHash, randomUUID }, '@prisma/client': { Prisma } });
  return { ...api, saved, settings, products, create: async (input, id = randomUUID()) => api.createValidatedOrder(input, id, (await api.quoteOrder(input)).token) };
}
const input = { customerName: 'Cliente', customerPhone: '1112345678', paymentMethod: 'Efectivo', deliveryMethod: 'delivery', deliveryZone: 'Centro', address: 'Dirección', items: [{ productId: 'burger', quantity: 2, removedIngredientIds: [], extraIds: ['cheese'] }] };
const promo = (fields = {}) => ({ id: 'promo', name: 'Noche', kind: 'PERCENTAGE', value: 20, code: null, active: true, startsAt: new Date('2020-01-01'), endsAt: new Date('2099-01-01'), ...fields });
test('missing or empty payment configuration rejects orders before persistence', async () => {
  for (const options of [{ configured: false }, { methods: [] }]) { const api = setup(options); await assert.rejects(api.create(input), /PAYMENT_METHODS_NOT_CONFIGURED/); assert.equal(api.saved.length, 0); }
});
test('cash and transfer orders are accepted when configured', async () => {
  const api = setup({ methods: ['Efectivo', 'Transferencia'] });
  for (const paymentMethod of ['Efectivo', 'Transferencia']) await api.create({ ...input, paymentMethod });
  assert.deepEqual(api.saved.map(order => order.paymentMethod), ['Efectivo', 'Transferencia']);
});
test('payment formatting differences use the configured method when saved', async () => {
  const api = setup(); await api.create({ ...input, paymentMethod: ' efectivo ' }); assert.equal(api.saved[0].paymentMethod, 'Efectivo');
});
test('minimum order excludes delivery and is calculated before discounts', async () => {
  const api = setup({ minimum: 2600 }); await assert.rejects(api.create(input), /MINIMUM_ORDER_NOT_MET/); assert.equal(api.saved.length, 0);
  const discounted = setup({minimum:2500, promotions:[promo()]}); assert.equal((await discounted.create(input)).total, 2200);
});
test('removed payment methods cannot be submitted by a stale checkout', async () => {
  const api = setup({ methods: ['Transferencia'] }); await assert.rejects(api.create(input), /INVALID_PAYMENT_METHOD/); assert.equal(api.saved.length, 0);
});
test('valid orders use configured delivery cost and extra prices', async () => {
  const api = setup({ minimum: 2500 }); const result = await api.create(input);
  assert.equal(result.total, 2700); assert.equal(api.saved[0].subtotal, 2500); assert.equal(api.saved[0].items.create[0].extras.create[0].extraId, 'cheese');
});
test('quote does not persist an order', async () => { const api = setup(); assert.equal((await api.quoteOrder(input)).total, 2700); assert.equal(api.saved.length, 0); });
test('best automatic promotion wins and fixed discounts cannot consume delivery', async () => {
  const api = setup({promotions:[promo(), promo({id:'fixed',kind:'FIXED',value:10000})]}); const quote=await api.quoteOrder(input); assert.equal(quote.discount,2500); assert.equal(quote.total,200);
});
test('coupon is normalized and does not stack with automatic discounts', async () => {
  const api=setup({promotions:[promo({value:50}),promo({id:'code',code:'NOCHE',value:10})]}); const result=await api.create({...input,promotionCode:' noche '}); assert.equal(result.total,2450); assert.equal(api.saved[0].promotionCode,'NOCHE');
});
test('expired inactive and unknown coupons reject before saving', async () => {
  for (const promotion of [promo({code:'NOCHE',endsAt:new Date('2020-01-01')}),promo({code:'NOCHE',active:false}),promo({code:'OTHER'})]) { const api=setup({promotions:[promotion]}); await assert.rejects(api.create({...input,promotionCode:'NOCHE'}),/INVALID_PROMOTION/); assert.equal(api.saved.length,0); }
});
test('invalid delivery zones fail, pickup does not require a zone or shipping fee', async () => {
  const api=setup(); await assert.rejects(api.create({...input,deliveryZone:'Fuera'}),/INVALID_DELIVERY_ZONE/);
  const pickup=await setup({zones:[]}).create({...input,deliveryMethod:'pickup',address:'',deliveryZone:''}); assert.equal(pickup.total,2500);
  await assert.rejects(setup({zones:[]}).create(input),/DELIVERY_UNAVAILABLE/);
});
test('closed stores reject orders before persistence',async()=>{const api=setup({hours:{Lunes:'Cerrado'}});await assert.rejects(api.create(input),/STORE_CLOSED/);assert.equal(api.saved.length,0);});
test('malformed quantities, duplicate extras and invalid customer input are rejected',async()=>{
  for(const quantity of [0,-1,1.5,100]) await assert.rejects(setup().quoteOrder({...input,items:[{...input.items[0],quantity}]}),/INVALID_ITEM/);
  await assert.rejects(setup().quoteOrder({...input,items:[{...input.items[0],extraIds:['cheese','cheese']}]}),/INVALID_ITEM/);
  for(const data of [null,{}, {...input,customerName:' '},{...input,customerPhone:'abc'},{...input,deliveryMethod:'drone'}]) await assert.rejects(setup().quoteOrder(data),/INVALID_ORDER/);
});
test('cash must cover total; non-cash payment ignores cash amount',async()=>{
  await assert.rejects(setup().create({...input,cashAmount:100}),/INSUFFICIENT_CASH/);
  const api=setup({methods:['Transferencia']});await api.create({...input,paymentMethod:'Transferencia',cashAmount:100});assert.equal(api.saved[0].cashAmount,null);
});
test('changed price or expired promotion requires a new review',async()=>{
  const api=setup();const quote=await api.quoteOrder(input);api.products[0].price=2000;
  await assert.rejects(api.createValidatedOrder(input,randomUUID(),quote.token),/PRICE_CHANGED/);assert.equal(api.saved.length,0);
  const promotion=promo({code:'NOCHE'});const other=setup({promotions:[promotion]});const couponInput={...input,promotionCode:'NOCHE'};const priced=await other.quoteOrder(couponInput);promotion.active=false;
  await assert.rejects(other.createValidatedOrder(couponInput,randomUUID(),priced.token),/INVALID_PROMOTION/);
});
test('retries reuse the stored receipt even after closure; payload changes are rejected',async()=>{
  const api=setup();const id=randomUUID();const quote=await api.quoteOrder(input);const first=await api.createValidatedOrder(input,id,quote.token);
  api.settings.hours={Lunes:'Cerrado'};const second=await api.createValidatedOrder(input,id,quote.token);assert.equal(first.code,second.code);assert.equal(api.saved.length,1);
  await assert.rejects(api.createValidatedOrder({...input,customerName:'Other'},id,quote.token),/REQUEST_CONFLICT/);
});
test('concurrent submissions with one request ID only save one order',async()=>{
  const api=setup();const id=randomUUID();const quote=await api.quoteOrder(input);const results=await Promise.all([api.createValidatedOrder(input,id,quote.token),api.createValidatedOrder(input,id,quote.token)]);assert.equal(api.saved.length,1);assert.equal(results[0].code,results[1].code);
});
test('WhatsApp receipt contains customer, item notes, removals, discount and change',async()=>{
  const api=setup({promotions:[promo()]});const result=await api.create({...input,cashAmount:3000,notes:'Timbre 2',items:[{...input.items[0],removedIngredientIds:['onion'],notes:'Bien cocida'}]});
  const message=new URL(result.whatsappUrl).searchParams.get('text');for(const value of ['Cliente','1112345678','Cheddar','Cebolla','Bien cocida','Timbre 2','Descuento','Vuelto'])assert.ok(message.includes(value));assert.equal(api.saved[0].receipt.code,result.code);
});
