import { openDb } from './db.js';
import { createApp } from './app.js';
import { createServices } from './services.js';
import { seedSampleData } from './seedData.js';

const port = Number(process.env.PORT) || 4000;
const db = openDb();

// İlk açılışta veritabanı boşsa örnek verileri yükle (SEED_SAMPLE_DATA=false ile kapatılır)
const s = createServices(db);
if (process.env.SEED_SAMPLE_DATA !== 'false' && s.listStock().length === 0 && s.listEmployees().length === 0) {
  seedSampleData(s);
  console.log('Veritabanı boştu, örnek veriler yüklendi.');
}

createApp(db).listen(port, () => {
  console.log(`Center Catering API: http://localhost:${port}/api`);
  console.log('Arayüz (npm run dev): http://localhost:5173');
});
