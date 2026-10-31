/**
 * Türk Fatura API'si gelene kadar kullanılan örnek veri adaptörü.
 * Gerçek adaptörle aynı arayüzü sağlar.
 */
const SUPPLIERS = [
  ['Anadolu Et Gıda Ltd. Şti.', '1234567890', ['Dana kuşbaşı', 'Kuzu but']],
  ['Yeşil Bahçe Sebze Meyve', '2345678901', ['Domates', 'Sivri biber', 'Soğan']],
  ['Ege Zeytinyağı A.Ş.', '3456789012', ['Zeytinyağı 5 lt', 'Ayçiçek yağı 5 lt']],
  ['Toros Bakliyat', '4567890123', ['Pirinç', 'Bulgur', 'Kırmızı mercimek']],
];
const CUSTOMERS = [
  ['Atlas Tekstil San. A.Ş.', '5678901234'],
  ['Marmara Lojistik Ltd.', '6789012345'],
  ['Özel Güneş Koleji', '7890123456'],
];
const STATUSES = ['Onaylandı', 'Onaylandı', 'Onaylandı', 'Gönderildi', 'Beklemede'];

function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function buildDocuments() {
  const rnd = seeded(42);
  const docs = [];
  const start = new Date('2026-08-01T00:00:00Z').getTime();
  for (let i = 1; i <= 48; i++) {
    const incoming = rnd() < 0.6;
    const date = new Date(start + Math.floor(rnd() * 90) * 86400000);
    const year = date.getUTCFullYear();
    let counterparty, taxNumber, lines;
    if (incoming) {
      const [name, vkn, products] = SUPPLIERS[Math.floor(rnd() * SUPPLIERS.length)];
      counterparty = name; taxNumber = vkn;
      lines = products.slice(0, 1 + Math.floor(rnd() * products.length)).map((p) => {
        const quantity = 5 + Math.floor(rnd() * 60);
        const unit_price = Math.round((20 + rnd() * 480) * 100) / 100;
        return { description: p, quantity, unit_price, tax_rate: 1, total: Math.round(quantity * unit_price * 100) / 100 };
      });
    } else {
      const [name, vkn] = CUSTOMERS[Math.floor(rnd() * CUSTOMERS.length)];
      counterparty = name; taxNumber = vkn;
      const quantity = 100 + Math.floor(rnd() * 900);
      const unit_price = Math.round((120 + rnd() * 80) * 100) / 100;
      lines = [{ description: 'Tabldot yemek hizmeti', quantity, unit_price, tax_rate: 10, total: Math.round(quantity * unit_price * 100) / 100 }];
    }
    const net = lines.reduce((s, l) => s + l.total, 0);
    const tax = lines.reduce((s, l) => s + (l.total * l.tax_rate) / 100, 0);
    const type = incoming ? (rnd() < 0.85 ? 'e-Fatura' : 'e-İrsaliye') : (rnd() < 0.7 ? 'e-Fatura' : 'e-Arşiv');
    const prefix = { 'e-Fatura': 'CCF', 'e-Arşiv': 'CCA', 'e-İrsaliye': 'CCI' }[type];
    docs.push({
      id: String(i),
      ettn: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      document_no: `${prefix}${year}${String(i).padStart(9, '0')}`,
      type,
      direction: incoming ? 'incoming' : 'outgoing',
      counterparty,
      tax_number: taxNumber,
      issue_date: date.toISOString().slice(0, 10),
      net_total: Math.round(net * 100) / 100,
      tax_total: Math.round(tax * 100) / 100,
      grand_total: Math.round((net + tax) * 100) / 100,
      currency: 'TRY',
      status: STATUSES[Math.floor(rnd() * STATUSES.length)],
      lines,
    });
  }
  return docs.sort((a, b) => b.issue_date.localeCompare(a.issue_date));
}

export class MockTurkFaturaAdapter {
  name = 'Türk Fatura (örnek veri)';
  #docs = buildDocuments();

  async listDocuments({ type, direction, from, to, q, page = 1, pageSize = 20 } = {}) {
    const needle = q?.toLocaleLowerCase('tr');
    const filtered = this.#docs.filter((d) =>
      (!type || d.type === type) &&
      (!direction || d.direction === direction) &&
      (!from || d.issue_date >= from) &&
      (!to || d.issue_date <= to) &&
      (!needle || `${d.document_no} ${d.counterparty} ${d.tax_number}`.toLocaleLowerCase('tr').includes(needle)));
    page = Math.max(1, Number(page) || 1);
    pageSize = Math.min(100, Math.max(1, Number(pageSize) || 20));
    const items = filtered.slice((page - 1) * pageSize, page * pageSize).map(({ lines, ...rest }) => rest);
    return { items, total: filtered.length, page, pageSize };
  }

  async getDocument(id) {
    return this.#docs.find((d) => d.id === String(id)) ?? null;
  }
}
