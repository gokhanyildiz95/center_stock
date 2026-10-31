import { transaction } from './db.js';
import { HttpError, round, toBaseUnit } from './units.js';

const STOCK_SQL = `
  SELECT p.*, COALESCE(SUM(m.quantity), 0) AS stock
  FROM products p LEFT JOIN stock_movements m ON m.product_id = p.id`;

export function createServices(db) {
  const getProduct = (id) => {
    const p = db.prepare(`${STOCK_SQL} WHERE p.id = ? GROUP BY p.id`).get(id);
    if (!p) throw new HttpError(404, 'Ürün bulunamadı');
    return { ...p, stock: round(p.stock) };
  };

  const listStock = () =>
    db.prepare(`${STOCK_SQL} GROUP BY p.id ORDER BY p.name`).all()
      .map((p) => ({ ...p, stock: round(p.stock), low: p.stock <= p.min_stock }));

  // ---------- Ürünler ----------
  function createProduct({ name, unit, category, min_stock = 0 }) {
    if (!name?.trim()) throw new HttpError(400, 'Ürün adı zorunlu');
    if (!['kg', 'lt', 'adet'].includes(unit)) throw new HttpError(400, 'Birim kg, lt veya adet olmalı');
    try {
      const r = db.prepare('INSERT INTO products (name, unit, category, min_stock) VALUES (?, ?, ?, ?)')
        .run(name.trim(), unit, category || null, Number(min_stock) || 0);
      return getProduct(r.lastInsertRowid);
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) throw new HttpError(409, 'Bu isimde bir ürün zaten var');
      throw e;
    }
  }

  function updateProduct(id, { name, category, min_stock }) {
    getProduct(id);
    db.prepare(`UPDATE products SET name = COALESCE(?, name), category = COALESCE(?, category),
      min_stock = COALESCE(?, min_stock) WHERE id = ?`)
      .run(name?.trim() || null, category ?? null, min_stock ?? null, id);
    return getProduct(id);
  }

  // ---------- Mal girişi ----------
  function createIntake({ employee_id, supplier, document_no, note, items }) {
    if (!employee_id) throw new HttpError(400, 'Girişi yapan çalışanı seçin');
    if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, 'En az bir ürün girin');
    return transaction(db, () => {
      const ins = db.prepare(`INSERT INTO stock_movements
        (product_id, type, quantity, unit_price, supplier, document_no, employee_id, note)
        VALUES (?, 'in', ?, ?, ?, ?, ?, ?)`);
      return items.map((it) => {
        const product = getProduct(it.product_id);
        const qty = Number(it.quantity);
        if (!(qty > 0)) throw new HttpError(400, `${product.name} için miktar sıfırdan büyük olmalı`);
        const r = ins.run(product.id, qty, it.unit_price != null && it.unit_price !== '' ? Number(it.unit_price) : null,
          supplier || null, document_no || null, employee_id, note || null);
        return r.lastInsertRowid;
      });
    });
  }

  function adjustStock({ product_id, counted, employee_id, note }) {
    const product = getProduct(product_id);
    const diff = round(Number(counted) - product.stock);
    if (Number.isNaN(diff)) throw new HttpError(400, 'Sayılan miktar geçersiz');
    if (diff !== 0) {
      db.prepare(`INSERT INTO stock_movements (product_id, type, quantity, employee_id, note)
        VALUES (?, 'adjustment', ?, ?, ?)`).run(product.id, diff, employee_id || null, note || 'Sayım düzeltmesi');
    }
    return getProduct(product.id);
  }

  function listMovements({ product_id, type, limit = 100 } = {}) {
    const where = [];
    const args = [];
    if (product_id) { where.push('m.product_id = ?'); args.push(product_id); }
    if (type) { where.push('m.type = ?'); args.push(type); }
    return db.prepare(`
      SELECT m.*, p.name AS product_name, p.unit, e.name AS employee_name, r.name AS recipe_name
      FROM stock_movements m
      JOIN products p ON p.id = m.product_id
      LEFT JOIN employees e ON e.id = m.employee_id
      LEFT JOIN productions pr ON pr.id = m.production_id
      LEFT JOIN recipes r ON r.id = pr.recipe_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY m.id DESC LIMIT ?`).all(...args, Math.min(Number(limit) || 100, 1000));
  }

  // ---------- Reçeteler ----------
  function getRecipe(id) {
    const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id);
    if (!recipe) throw new HttpError(404, 'Reçete bulunamadı');
    recipe.items = db.prepare(`SELECT ri.product_id, ri.quantity, p.name AS product_name, p.unit
      FROM recipe_items ri JOIN products p ON p.id = ri.product_id WHERE ri.recipe_id = ? ORDER BY p.name`).all(id);
    return recipe;
  }

  const listRecipes = () => db.prepare('SELECT id FROM recipes ORDER BY name').all().map((r) => getRecipe(r.id));

  function saveRecipe(id, { name, yield_portions = 1, notes, items }) {
    if (!name?.trim()) throw new HttpError(400, 'Reçete adı zorunlu');
    if (!(Number(yield_portions) > 0)) throw new HttpError(400, 'Kaç kişilik olduğu sıfırdan büyük olmalı');
    if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, 'Reçeteye en az bir malzeme ekleyin');
    const seen = new Set();
    const rows = items.map((it) => {
      const product = getProduct(it.product_id);
      if (seen.has(product.id)) throw new HttpError(400, `${product.name} reçetede iki kez var`);
      seen.add(product.id);
      const qty = toBaseUnit(it.quantity, it.unit, product.unit);
      if (!(qty > 0)) throw new HttpError(400, `${product.name} miktarı sıfırdan büyük olmalı`);
      return [product.id, qty];
    });
    try {
      return transaction(db, () => {
        if (id) {
          getRecipe(id);
          db.prepare('UPDATE recipes SET name = ?, yield_portions = ?, notes = ? WHERE id = ?')
            .run(name.trim(), Number(yield_portions), notes || null, id);
          db.prepare('DELETE FROM recipe_items WHERE recipe_id = ?').run(id);
        } else {
          id = db.prepare('INSERT INTO recipes (name, yield_portions, notes) VALUES (?, ?, ?)')
            .run(name.trim(), Number(yield_portions), notes || null).lastInsertRowid;
        }
        const ins = db.prepare('INSERT INTO recipe_items (recipe_id, product_id, quantity) VALUES (?, ?, ?)');
        for (const [pid, qty] of rows) ins.run(id, pid, qty);
        return getRecipe(id);
      });
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) throw new HttpError(409, 'Bu isimde bir reçete zaten var');
      throw e;
    }
  }

  function deleteRecipe(id) {
    getRecipe(id);
    const used = db.prepare('SELECT COUNT(*) AS c FROM productions WHERE recipe_id = ?').get(id).c;
    if (used > 0) throw new HttpError(409, 'Bu reçeteyle üretim kaydı var, silinemez');
    db.prepare('DELETE FROM recipes WHERE id = ?').run(id);
  }

  // ---------- Üretim ----------
  /** N kişilik üretim için gereken malzemeleri ve stok yeterliliğini hesaplar. */
  function planProduction(recipe_id, portions) {
    const recipe = getRecipe(recipe_id);
    const n = Number(portions);
    if (!(n > 0)) throw new HttpError(400, 'Kişi sayısı sıfırdan büyük olmalı');
    const factor = n / recipe.yield_portions;
    const needs = recipe.items.map((it) => {
      const stock = getProduct(it.product_id).stock;
      const required = round(it.quantity * factor);
      return { product_id: it.product_id, product_name: it.product_name, unit: it.unit,
        required, stock, remaining: round(stock - required), sufficient: stock >= required };
    });
    return { recipe, portions: n, needs, shortages: needs.filter((x) => !x.sufficient) };
  }

  function createProduction({ recipe_id, portions, employee_id, note, force = false }) {
    const plan = planProduction(recipe_id, portions);
    if (plan.shortages.length && !force) {
      throw new HttpError(409, 'Stok yetersiz', { shortages: plan.shortages });
    }
    return transaction(db, () => {
      const pid = db.prepare('INSERT INTO productions (recipe_id, portions, employee_id, note) VALUES (?, ?, ?, ?)')
        .run(plan.recipe.id, plan.portions, employee_id || null, note || null).lastInsertRowid;
      const ins = db.prepare(`INSERT INTO stock_movements (product_id, type, quantity, employee_id, production_id, note)
        VALUES (?, 'production', ?, ?, ?, ?)`);
      for (const n of plan.needs) {
        ins.run(n.product_id, -n.required, employee_id || null, pid,
          `${plan.recipe.name} – ${plan.portions} kişilik`);
      }
      return { id: pid, ...plan };
    });
  }

  const listProductions = (limit = 100) => db.prepare(`
    SELECT pr.*, r.name AS recipe_name, e.name AS employee_name
    FROM productions pr JOIN recipes r ON r.id = pr.recipe_id
    LEFT JOIN employees e ON e.id = pr.employee_id
    ORDER BY pr.id DESC LIMIT ?`).all(limit);

  // ---------- Çalışanlar ----------
  const listEmployees = () => db.prepare('SELECT * FROM employees WHERE active = 1 ORDER BY name').all();
  function createEmployee({ name, role = 'depo' }) {
    if (!name?.trim()) throw new HttpError(400, 'Çalışan adı zorunlu');
    const id = db.prepare('INSERT INTO employees (name, role) VALUES (?, ?)').run(name.trim(), role).lastInsertRowid;
    return db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
  }

  function dashboard() {
    const stock = listStock();
    return {
      product_count: stock.length,
      low_stock: stock.filter((p) => p.low),
      recipe_count: db.prepare('SELECT COUNT(*) AS c FROM recipes').get().c,
      productions_today: db.prepare("SELECT COUNT(*) AS c FROM productions WHERE date(created_at) = date('now')").get().c,
      recent_movements: listMovements({ limit: 10 }),
    };
  }

  return {
    getProduct, listStock, createProduct, updateProduct,
    createIntake, adjustStock, listMovements,
    getRecipe, listRecipes, saveRecipe, deleteRecipe,
    planProduction, createProduction, listProductions,
    listEmployees, createEmployee, dashboard,
  };
}
