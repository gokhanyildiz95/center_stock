import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServices } from './services.js';
import { createAccountingProvider } from './accounting/index.js';
import { HttpError, INPUT_UNITS } from './units.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp(db, { accounting = createAccountingProvider() } = {}) {
  const s = createServices(db);
  const app = express();
  app.use(cors());
  app.use(express.json());

  const api = express.Router();
  const id = (req) => Number(req.params.id);

  api.get('/health', (req, res) => res.json({ ok: true }));
  api.get('/dashboard', (req, res) => res.json(s.dashboard()));
  api.get('/units', (req, res) => res.json(INPUT_UNITS));

  // Çalışanlar
  api.get('/employees', (req, res) => res.json(s.listEmployees()));
  api.post('/employees', (req, res) => res.status(201).json(s.createEmployee(req.body)));

  // Depo / ürünler
  api.get('/products', (req, res) => res.json(s.listStock()));
  api.post('/products', (req, res) => res.status(201).json(s.createProduct(req.body)));
  api.get('/products/:id', (req, res) => res.json(s.getProduct(id(req))));
  api.patch('/products/:id', (req, res) => res.json(s.updateProduct(id(req), req.body)));
  api.post('/products/:id/adjust', (req, res) => res.json(s.adjustStock({ ...req.body, product_id: id(req) })));

  // Mal girişi ve hareketler
  api.post('/intakes', (req, res) => res.status(201).json({ ids: s.createIntake(req.body) }));
  api.get('/movements', (req, res) => res.json(s.listMovements(req.query)));

  // Reçeteler
  api.get('/recipes', (req, res) => res.json(s.listRecipes()));
  api.post('/recipes', (req, res) => res.status(201).json(s.saveRecipe(null, req.body)));
  api.get('/recipes/:id', (req, res) => res.json(s.getRecipe(id(req))));
  api.put('/recipes/:id', (req, res) => res.json(s.saveRecipe(id(req), req.body)));
  api.delete('/recipes/:id', (req, res) => { s.deleteRecipe(id(req)); res.status(204).end(); });

  // Üretim
  api.get('/productions', (req, res) => res.json(s.listProductions()));
  api.post('/productions/preview', (req, res) => res.json(s.planProduction(req.body.recipe_id, req.body.portions)));
  api.post('/productions', (req, res) => res.status(201).json(s.createProduction(req.body)));

  // Muhasebe (Türk Fatura)
  api.get('/accounting/info', (req, res) => res.json({ provider: accounting.name }));
  api.get('/accounting/documents', async (req, res) => res.json(await accounting.listDocuments(req.query)));
  api.get('/accounting/documents/:docId', async (req, res) => {
    const doc = await accounting.getDocument(req.params.docId);
    if (!doc) throw new HttpError(404, 'Belge bulunamadı');
    res.json(doc);
  });

  app.use('/api', api);

  // Üretim ortamında derlenmiş React uygulamasını sun
  const dist = path.join(__dirname, '..', '..', 'client', 'dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
  } else {
    // Geliştirme modunda arayüz Vite'tan (5173) açılır
    app.get('/', (req, res) => res.type('html').send(
      '<meta charset="utf-8"><p style="font-family:sans-serif">Bu adres yalnızca API. Arayüz için ' +
      '<a href="http://localhost:5173">http://localhost:5173</a> adresini açın.</p>'));
  }
  app.use('/api', (req, res) => res.status(404).json({ error: `API adresi bulunamadı: ${req.originalUrl}` }));

  // Express 5 async hataları da buraya düşer
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Sunucu hatası' : err.message, ...err.details });
  });

  return app;
}
