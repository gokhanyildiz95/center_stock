// Örnek verilerle boş bir veritabanını doldurur: npm run seed
import { openDb } from './db.js';
import { createServices } from './services.js';
import { seedSampleData } from './seedData.js';

const s = createServices(openDb());
if (s.listStock().length > 0) {
  console.log('Veritabanında zaten veri var, seed atlandı.');
} else {
  seedSampleData(s);
  console.log('Örnek veriler eklendi.');
}
