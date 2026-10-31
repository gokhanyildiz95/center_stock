import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'depo',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Depodaki ürün kartları. unit: stoğun tutulduğu temel birim (kg, lt, adet)
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  unit TEXT NOT NULL CHECK (unit IN ('kg','lt','adet')),
  category TEXT,
  min_stock REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Her stok değişikliği bir hareket satırıdır. Stok = SUM(quantity).
-- type: in (mal girişi), production (üretimde kullanım, negatif), adjustment (sayım düzeltmesi)
CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  type TEXT NOT NULL CHECK (type IN ('in','production','adjustment')),
  quantity REAL NOT NULL,
  unit_price REAL,
  supplier TEXT,
  document_no TEXT,
  employee_id INTEGER REFERENCES employees(id),
  production_id INTEGER REFERENCES productions(id),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mov_product ON stock_movements(product_id);

-- Reçete: yield_portions kişilik malzeme listesi
CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  yield_portions REAL NOT NULL DEFAULT 1 CHECK (yield_portions > 0),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- quantity: ürünün temel biriminde, reçetenin yield_portions kişilik miktarı
CREATE TABLE IF NOT EXISTS recipe_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity REAL NOT NULL CHECK (quantity > 0),
  UNIQUE (recipe_id, product_id)
);

CREATE TABLE IF NOT EXISTS productions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id),
  portions REAL NOT NULL CHECK (portions > 0),
  employee_id INTEGER REFERENCES employees(id),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export function openDb(dbPath = process.env.DB_PATH) {
  const file = dbPath || path.join(__dirname, '..', 'data', 'catering.db');
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);
  return db;
}

/** fn içindeki tüm sorguları tek transaction içinde çalıştırır. */
export function transaction(db, fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
