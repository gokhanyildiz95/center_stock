# Center Catering · Stok Takip Sistemi

Reçete bazlı stok takibi: mal girişi → depo stoğu → mutfakta yapılan yemeğe göre stoktan otomatik düşüm → muhasebe belgeleri (Türk Fatura).

**Teknoloji:** React 19 + Vite (arayüz), Node.js + Express 5 (API), SQLite (Node'un yerleşik `node:sqlite` modülü, ek kurulum gerekmez).

## Kurulum

Node.js **22.5 veya üzeri** gerekir.

```bash
npm install
npm run seed     # isteğe bağlı: sunucu ilk açılışta boş veritabanına örnek verileri zaten yükler
npm run dev      # API: http://localhost:4000  ·  Arayüz: http://localhost:5173
```

Canlı kullanım için: `npm run build && npm start` (API derlenmiş arayüzü de 4000 portundan sunar).
Testler: `npm test`.

Ayarlar için `server/.env.example` dosyasına bakın (`PORT`, `DB_PATH`, muhasebe sağlayıcısı).

## Modüller

| Sayfa | Ne yapar |
|---|---|
| **Mal Girişi** | Çalışan, tedarikçi, irsaliye no ve kalemlerle depoya giriş. Her kalem stok hareketi olarak kaydedilir. |
| **Depo** | Ürün kartları (kg / lt / adet), anlık stok, minimum stok uyarısı, ürün bazında hareket geçmişi, sayım düzeltmesi. |
| **Reçeteler** | Yemek başına malzeme listesi. Reçete "X kişilik" olarak girilir; malzemeler g/kg, ml/lt veya adet ile yazılabilir. |
| **Mutfak / Üretim** | "Saç kavurma, 200 kişilik yapıldı" kaydı. Kaydetmeden önce düşülecek miktarlar ve kalan stok gösterilir; stok yetersizse uyarır. |
| **Muhasebe** | Türk Fatura'dan gelen/giden e-Fatura, e-Arşiv, e-İrsaliye listesi, filtreleme ve belge detayı. |
| **Çalışanlar** | Girişleri ve üretimleri kaydeden personel. |

## Stok mantığı

- Stok, `stock_movements` tablosundaki hareketlerin toplamıdır (giriş +, üretim −, sayım ±). Böylece her rakamın geçmişi izlenebilir.
- Üretimde düşülen miktar = `reçete miktarı × (yapılan kişi sayısı / reçetenin kişi sayısı)`.
  Örnek: Saç kavurma 10 kişilik → 1,5 kg et. 200 kişilik yapıldığında 30 kg et düşülür.

## Türk Fatura entegrasyonu

`server/src/accounting/` altında bir adaptör katmanı var:

- `mockAdapter.js` – API gelene kadar örnek belgeler (varsayılan, `ACCOUNTING_PROVIDER=mock`).
- `turkFaturaAdapter.js` – gerçek API iskeleti. Doküman geldiğinde uç nokta yolları ve `mapDocument` alan eşlemesi doldurulacak, ardından `ACCOUNTING_PROVIDER=turkfatura`, `TURKFATURA_API_URL`, `TURKFATURA_API_KEY` ayarlanacak. Arayüzde değişiklik gerekmez.

## API özet

```
GET  /api/dashboard
GET  /api/products            POST /api/products         PATCH /api/products/:id
POST /api/products/:id/adjust { counted }
POST /api/intakes             { employee_id, supplier, document_no, items: [{ product_id, quantity, unit_price }] }
GET  /api/movements?product_id=&type=
GET  /api/recipes             POST /api/recipes          PUT /api/recipes/:id   DELETE /api/recipes/:id
POST /api/productions/preview { recipe_id, portions }
POST /api/productions         { recipe_id, portions, employee_id, force? }
GET  /api/accounting/documents?direction=&type=&from=&to=&q=&page=
GET  /api/accounting/documents/:id
```

## Sonraki adımlar

- Kullanıcı girişi ve rol bazlı yetki (depo / mutfak / muhasebe / yönetici)
- Türk Fatura API'sinin bağlanması; gelen faturalardan otomatik mal girişi önerisi
- Reçete maliyeti ve porsiyon başı maliyet raporu (giriş fiyatlarından)
- Excel'e aktarma, günlük/aylık tüketim raporları
