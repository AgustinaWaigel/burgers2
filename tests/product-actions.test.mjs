import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as crypto from 'node:crypto';
import { Prisma } from '@prisma/client';

function setup({ authenticated = true, deleteError, saveError } = {}) {
  const calls = [];
  const tx = {
    category: { findUnique: async () => ({ id: 'category' }), upsert: async () => ({ id: 'category' }) },
    product: {
      create: async (args) => { if (saveError) throw saveError; calls.push(['create', args]); },
      update: async (args) => { calls.push(['update', args]); },
      delete: async (args) => { if (deleteError) throw deleteError; calls.push(['delete', args]); },
    },
  };
  const modules = {
    'node:crypto': crypto,
    '@prisma/client': { Prisma },
    'next/cache': { revalidatePath: path => calls.push(['refresh', path]) },
    'next/navigation': { redirect: path => { throw new Error(`REDIRECT:${path}`); } },
    '@/lib/db': { prisma: { ...tx, $transaction: fn => fn(tx) } },
    '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: authenticated ? { id: 'admin' } : null } }) } }) },
  };
  const exports = {};
  const source = ts.transpileModule(readFileSync('app/admin/products/actions.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, require: name => { if (!(name in modules)) throw new Error(name); return modules[name]; }, Buffer, File, console: { error() {} } });
  return { ...exports, calls };
}
function form(overrides = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ name: 'Clásica', description: 'Carne y queso', price: '9500.50', available: 'on', ...overrides })) data.set(key, value);
  return data;
}

test('save and delete reject anonymous requests before any mutation', async () => {
  const api = setup({ authenticated: false });
  await assert.rejects(api.saveProduct({}, form()), /REDIRECT:\/admin\/login/);
  await assert.rejects(api.deleteProduct({}, form({ id: 'product' })), /REDIRECT:\/admin\/login/);
  assert.equal(api.calls.length, 0);
});
test('invalid prices do not reach persistence', async () => {
  for (const price of ['', '-1', '0', 'NaN', '1.234', '100000000']) {
    const api = setup();
    assert.ok((await api.saveProduct({}, form({ price }))).error);
    assert.equal(api.calls.length, 0);
  }
});
test('creation stores a valid price and refreshes both catalog surfaces', async () => {
  const api = setup();
  await assert.rejects(api.saveProduct({}, form({ price: '9500,50' })), /REDIRECT:\/admin\/products\?saved=1/);
  assert.equal(api.calls[0][1].data.price, '9500.50');
  assert.equal(api.calls[0][1].data.categoryId, 'category');
  assert.deepEqual(api.calls.slice(1), [['refresh', '/'], ['refresh', '/admin/products']]);
});
test('editing preserves the existing image unless removal is requested', async () => {
  const api = setup();
  await assert.rejects(api.saveProduct({}, form({ id: 'product' })), /REDIRECT/);
  assert.equal(api.calls[0][1].data.imageUrl, undefined);
  const removal = setup();
  await assert.rejects(removal.saveProduct({}, form({ id: 'product', removeImage: 'on' })), /REDIRECT/);
  assert.equal(removal.calls[0][1].data.imageUrl, null);
});
test('invalid and oversized photos are rejected', async () => {
  for (const file of [new File(['<svg/>'], 'fake.png', { type: 'image/png' }), new File([new Uint8Array(600 * 1024 + 1)], 'large.jpg')]) {
    const api = setup();
    const data = form(); data.set('photo', file);
    assert.ok((await api.saveProduct({}, data)).error);
    assert.equal(api.calls.length, 0);
  }
});
test('products referenced by orders are hidden instead of deleted', async () => {
  const api = setup({ deleteError: new Prisma.PrismaClientKnownRequestError('FK', { code: 'P2003', clientVersion: '6' }) });
  const result = await api.deleteProduct({}, form({ id: 'product' }));
  assert.match(result.success, /historial/);
  assert.equal(api.calls[0][0], 'update');
  assert.equal(api.calls[0][1].data.available, false);
});
test('unreferenced products are deleted and database failures report an error', async () => {
  const api = setup();
  assert.match((await api.deleteProduct({}, form({ id: 'product' }))).success, /eliminado/);
  assert.equal(api.calls[0][0], 'delete');
  const failed = setup({ saveError: new Error('offline') });
  assert.ok((await failed.saveProduct({}, form())).error);
  assert.equal(failed.calls.length, 0);
});
