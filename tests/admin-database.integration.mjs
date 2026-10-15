import nextEnv from '@next/env';
import { PrismaClient, Prisma } from '@prisma/client';
import * as crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { loadModule } from './load-module.mjs';
nextEnv.loadEnvConfig(process.cwd());
const db = new PrismaClient({ log: [] });
const rollback = new Error('ROLLBACK_TEST');
const makeForm = fields => { const form = new FormData(); for (const [key, value] of Object.entries(fields)) { if (Array.isArray(value)) value.forEach(item => form.append(key, item)); else form.set(key, value); } return form; };
try {
  await db.$transaction(async tx => {
    const mocks = {
      '@prisma/client': { Prisma }, 'node:crypto': crypto,
      '@/lib/db': { prisma: { ...tx, $transaction: fn => fn(tx) } },
      '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'test-session' } } }) } }) },
      'next/cache': { revalidatePath() {} },
      'next/navigation': { redirect: path => { throw new Error(`REDIRECT:${path}`); } },
    };
    const api = loadModule('app/admin/[section]/actions.ts', mocks);
    const products = loadModule('app/admin/products/actions.ts', mocks);
    async function call(promise) { try { const result = await promise; if (result?.error) throw new Error(result.error); } catch (error) { if (!error.message.startsWith('REDIRECT:')) throw error; } }
    const suffix = crypto.randomUUID();
    const records = {};
    for (const [section, model, fields] of [
      ['categories', 'category', { sortOrder: '1' }],
      ['ingredients', 'ingredient', {}],
      ['extras', 'extra', { price: '250.50' }],
      ['promotions', 'promotion', { kind: 'PERCENTAGE', value: '15', startsAt: '2026-09-09T19:00', endsAt: '2026-09-10T01:00' }],
    ]) {
      const base = { name: `Prueba ${section} ${suffix}`, description: 'Prueba transaccional', active: 'on', ...fields };
      await call(api.saveRecord(section, {}, makeForm(base)));
      const row = await tx[model].findFirstOrThrow({ where: { name: base.name } });
      await call(api.saveRecord(section, {}, makeForm({ ...base, id: row.id, description: 'Actualizado' })));
      assert.equal((await tx[model].findUniqueOrThrow({ where: { id: row.id } })).description, 'Actualizado');
      records[section] = row.id;
      console.log(`${section}: CREATE_UPDATE_OK`);
    }
    const productData = { name: `Prueba hamburguesa ${suffix}`, description: 'Prueba', price: '1000', categoryId: records.categories, available: 'on', manageRelations: 'on', ingredientIds: [records.ingredients], removableIds: [records.ingredients], extraIds: [records.extras] };
    await call(products.saveProduct({}, makeForm(productData)));
    const product = await tx.product.findFirstOrThrow({ where: { name: productData.name }, include: { ingredients: true, extras: true } });
    assert.equal(product.ingredients[0].removable, true); assert.equal(product.extras.length, 1);
    await call(products.saveProduct({}, makeForm({ ...productData, id: product.id, ingredientIds: [], removableIds: [], extraIds: [] })));
    assert.equal(await tx.productIngredient.count({ where: { productId: product.id } }), 0);
    assert.equal(await tx.productExtra.count({ where: { productId: product.id } }), 0);
    await tx.product.delete({ where: { id: product.id } });
    console.log('PRODUCT_RELATIONS_ADD_REMOVE_OK');
    const config = await tx.storeSettings.create({ data: { businessName: `Prueba ${suffix}`, whatsappNumber: '5491112345678', deliveryCost: '0', minimumOrder: '0', hours: {}, socialLinks: {}, paymentMethods: ['Efectivo'], deliveryZones: [] } });
    await call(api.saveRecord('settings', {}, makeForm({ id: config.id, businessName: `Prueba ${suffix}`, whatsappNumber: '5491112345678', deliveryCost: '200', minimumOrder: '1000', paymentMethods: 'Efectivo\nTransferencia', hours_0: '19:00 a 23:00' })));
    assert.equal((await tx.storeSettings.findUniqueOrThrow({ where: { id: config.id } })).paymentMethods.length, 2);
    await call(api.deleteRecord('settings', {}, makeForm({ id: config.id })));
    for (const [section, id] of Object.entries(records)) await call(api.deleteRecord(section, {}, makeForm({ id })));
    console.log('ALL_DELETES_OK');
    throw rollback;
  }, { timeout: 60000, maxWait: 10000 });
} catch (error) {
  if (error === rollback) console.log('ALL_TEST_DATA_ROLLED_BACK');
  else { console.error({ name: error.name, code: error.code, message: error.message.startsWith('Invalid') ? 'Database operation failed' : error.message }); process.exitCode = 1; }
} finally { await db.$disconnect(); }

