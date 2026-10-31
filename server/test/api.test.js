import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';

let server, base;
before(async () => {
  const app = createApp(openDb(':memory:'));
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://localhost:${server.address().port}/api`;
});
after(() => server.close());

async function call(method, path, body) {
  const res = await fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body),
  });
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
}

test('mal girişi stoğa yansır, reçeteyle üretim stoktan düşer', async () => {
  const emp = (await call('POST', '/employees', { name: 'Test' })).body;
  const et = (await call('POST', '/products', { name: 'Et', unit: 'kg' })).body;
  const domates = (await call('POST', '/products', { name: 'Domates', unit: 'kg' })).body;

  let r = await call('POST', '/intakes', { employee_id: emp.id, items: [
    { product_id: et.id, quantity: 40 }, { product_id: domates.id, quantity: 30 }] });
  assert.equal(r.status, 201);
  assert.equal((await call('GET', `/products/${et.id}`)).body.stock, 40);

  // 10 kişilik: 1.5 kg et (gram olarak girildi), 1 kg domates
  const recipe = (await call('POST', '/recipes', { name: 'Saç kavurma', yield_portions: 10, items: [
    { product_id: et.id, quantity: 1500, unit: 'g' }, { product_id: domates.id, quantity: 1, unit: 'kg' }] })).body;
  assert.equal(recipe.items.find((i) => i.product_id === et.id).quantity, 1.5);

  r = await call('POST', '/productions', { recipe_id: recipe.id, portions: 200, employee_id: emp.id });
  assert.equal(r.status, 201);
  assert.equal((await call('GET', `/products/${et.id}`)).body.stock, 10);       // 40 - 30
  assert.equal((await call('GET', `/products/${domates.id}`)).body.stock, 10);  // 30 - 20

  // Stok yetersizse reddedilir ve hiçbir şey düşülmez
  r = await call('POST', '/productions', { recipe_id: recipe.id, portions: 200 });
  assert.equal(r.status, 409);
  assert.equal(r.body.shortages.length, 2);
  assert.equal((await call('GET', `/products/${et.id}`)).body.stock, 10);

  // force ile eksiye düşmeye izin verilir
  r = await call('POST', '/productions', { recipe_id: recipe.id, portions: 100, force: true });
  assert.equal(r.status, 201);
  assert.equal((await call('GET', `/products/${et.id}`)).body.stock, -5);

  // Sayım düzeltmesi
  r = await call('POST', `/products/${et.id}/adjust`, { counted: 2 });
  assert.equal(r.body.stock, 2);
});

test('geçersiz birim dönüşümü reddedilir', async () => {
  const p = (await call('POST', '/products', { name: 'Yumurta', unit: 'adet' })).body;
  const r = await call('POST', '/recipes', { name: 'Omlet', items: [{ product_id: p.id, quantity: 100, unit: 'g' }] });
  assert.equal(r.status, 400);
});

test('muhasebe belgeleri filtrelenip listelenir', async () => {
  const r = await call('GET', '/accounting/documents?direction=incoming&pageSize=5');
  assert.equal(r.status, 200);
  assert.ok(r.body.total > 0);
  assert.ok(r.body.items.length <= 5);
  assert.ok(r.body.items.every((d) => d.direction === 'incoming'));
  const doc = await call('GET', `/accounting/documents/${r.body.items[0].id}`);
  assert.ok(Array.isArray(doc.body.lines));
});
