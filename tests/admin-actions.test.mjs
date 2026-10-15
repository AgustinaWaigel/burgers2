import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { loadModule } from './load-module.mjs';

function setup({ authenticated = true, deleteError, saveError } = {}) {
  const calls = [];
  const prisma = Object.fromEntries(['category', 'ingredient', 'extra', 'promotion', 'storeSettings'].map(model => [model, Object.fromEntries(['create', 'update', 'upsert', 'delete'].map(method => [method, async args => {
    if (method === 'delete' && deleteError) throw deleteError;
    if (method !== 'delete' && saveError) throw saveError;
    calls.push({ model, method, args }); return { id: 'record', ...args.data };
  }]))]));
  const actions = loadModule('app/admin/[section]/actions.ts', {
    '@prisma/client': { Prisma }, '@/lib/db': { prisma },
    '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: authenticated ? { id: 'admin' } : null } }) } }) },
    'next/navigation': { redirect: path => { throw new Error(`REDIRECT:${path}`); } },
    'next/cache': { revalidatePath() {} },
  });
  return { ...actions, calls };
}
function form(fields = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ name: 'Clásica', description: 'Descripción', active: 'on', ...fields })) data.set(key, value);
  return data;
}
const promotion = { kind: 'PERCENTAGE', value: '20', startsAt: '2026-09-09T19:00', endsAt: '2026-09-10T01:00' };
const settings = { businessName: 'Comercio', whatsappNumber: '5491112345678', deliveryCost: '1000', minimumOrder: '5000', paymentMethods: 'Efectivo\nTransferencia\nEfectivo', hours_0: '19:00 a 23:00' };

test('every management action requires a session, including deletes', async () => {
  for (const section of ['categories', 'ingredients', 'extras', 'promotions', 'settings']) {
    const api = setup({ authenticated: false });
    await assert.rejects(api.saveRecord(section, {}, form()), /REDIRECT:\/admin\/login/);
    await assert.rejects(api.deleteRecord(section, {}, form({ id: 'record' })), /REDIRECT:\/admin\/login/);
    assert.equal(api.calls.length, 0);
  }
});
test('unknown sections are rejected', async () => {
  const api = setup();
  assert.ok((await api.saveRecord('__proto__', {}, form())).error);
  assert.ok((await api.deleteRecord('orders', {}, form({ id: 'record' }))).error);
  assert.equal(api.calls.length, 0);
});
test('category slug is normalized and order must be an integer', async () => {
  const api = setup();
  await assert.rejects(api.saveRecord('categories', {}, form({ sortOrder: '2' })), /REDIRECT/);
  assert.equal(api.calls[0].args.data.slug, 'clasica');
  assert.equal(api.calls[0].args.data.sortOrder, 2);
  assert.ok((await api.saveRecord('categories', {}, form({ sortOrder: '1.5' }))).error);
});
test('extras accept decimal prices and reject invalid money', async () => {
  const api = setup();
  await assert.rejects(api.saveRecord('extras', {}, form({ price: '250,50' })), /REDIRECT/);
  assert.equal(api.calls[0].args.data.price, '250.50');
  for (const price of ['-10', '1e3', '1.111', '100000000']) assert.ok((await api.saveRecord('extras', {}, form({ price }))).error);
});
test('promotion dates use Argentina time and invalid discounts or dates are rejected', async () => {
  const api = setup();
  await assert.rejects(api.saveRecord('promotions', {}, form({ ...promotion, code: 'noche' })), /REDIRECT/);
  assert.equal(api.calls[0].args.data.startsAt.toISOString(), '2026-09-09T22:00:00.000Z');
  assert.equal(api.calls[0].args.data.code, 'NOCHE');
  for (const fields of [{ value: '101' }, { endsAt: promotion.startsAt }, { startsAt: '2026-02-30T20:00' }, { kind: 'UNSUPPORTED' }]) assert.ok((await api.saveRecord('promotions', {}, form({ ...promotion, ...fields }))).error);
});
test('settings serialize payment methods and hours without exposing JSON fields', async () => {
  const api = setup();
  await assert.rejects(api.saveRecord('settings', {}, form(settings)), /REDIRECT/);
  const data = api.calls[0].args.create;
  assert.equal(data.id, 'store');
  assert.equal(data.paymentMethods.length, 2);
  assert.equal(data.hours.Lunes, '19:00 a 23:00');
  for (const fields of [{ whatsappNumber: 'abc' }, { instagram: 'javascript:alert(1)' }, { paymentMethods: ' ' }]) assert.ok((await api.saveRecord('settings', {}, form({ ...settings, ...fields }))).error);
});
test('updates target the existing record and database conflicts return useful feedback', async () => {
  const api = setup();
  await assert.rejects(api.saveRecord('ingredients', {}, form({ id: 'existing' })), /REDIRECT/);
  assert.equal(api.calls[0].method, 'update');
  assert.equal(api.calls[0].args.where.id, 'existing');
  const duplicate = setup({ saveError: new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '6' }) });
  assert.match((await duplicate.saveRecord('categories', {}, form({ sortOrder: '0' }))).error, /Ya existe/);
});
test('referenced catalog records are deactivated instead of breaking links', async () => {
  for (const section of ['categories', 'ingredients', 'extras']) {
    const api = setup({ deleteError: new Prisma.PrismaClientKnownRequestError('FK', { code: 'P2003', clientVersion: '6' }) });
    await assert.rejects(api.deleteRecord(section, {}, form({ id: 'linked' })), /removed=archived/);
    assert.equal(api.calls[0].method, 'update');
    assert.equal(api.calls[0].args.data.active, false);
  }
});
test('unreferenced records can be deleted from each section', async () => {
  for (const section of ['categories', 'ingredients', 'extras', 'promotions', 'settings']) {
    const api = setup();
    await assert.rejects(api.deleteRecord(section, {}, form({ id: 'record' })), /removed=deleted/);
    assert.equal(api.calls[0].method, 'delete');
  }
});
