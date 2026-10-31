/**
 * Türk Fatura API adaptörü – İSKELET.
 * API dokümantasyonu geldiğinde uç noktalar ve alan eşlemesi (mapDocument) burada doldurulacak.
 * Uygulamanın geri kalanı yalnızca listDocuments / getDocument arayüzünü kullanır.
 */
export class TurkFaturaHttpAdapter {
  name = 'Türk Fatura';

  constructor({ baseUrl, apiKey }) {
    if (!baseUrl || !apiKey) {
      throw new Error('TURKFATURA_API_URL ve TURKFATURA_API_KEY tanımlı olmalı');
    }
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  async request(path, params = {}) {
    const url = new URL(this.baseUrl + path);
    for (const [k, v] of Object.entries(params)) if (v != null && v !== '') url.searchParams.set(k, v);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${this.apiKey}`, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Türk Fatura API hatası: ${res.status}`);
    return res.json();
  }

  // TODO: Gerçek uç nokta ve parametre isimleri API dokümanına göre güncellenecek.
  async listDocuments({ type, direction, from, to, q, page = 1, pageSize = 20 } = {}) {
    const data = await this.request('/documents', { type, direction, from, to, q, page, pageSize });
    return {
      items: (data.items ?? data.data ?? []).map(mapDocument),
      total: data.total ?? 0,
      page,
      pageSize,
    };
  }

  async getDocument(id) {
    return mapDocument(await this.request(`/documents/${encodeURIComponent(id)}`));
  }
}

// TODO: Türk Fatura alan adları netleşince eşleme güncellenecek.
function mapDocument(d) {
  return {
    id: d.id,
    ettn: d.ettn ?? d.uuid,
    document_no: d.documentNo ?? d.document_no,
    type: d.type,
    direction: d.direction,
    counterparty: d.counterparty ?? d.customerName ?? d.supplierName,
    tax_number: d.taxNumber ?? d.vkn,
    issue_date: d.issueDate ?? d.issue_date,
    net_total: d.netTotal ?? d.net_total,
    tax_total: d.taxTotal ?? d.tax_total,
    grand_total: d.grandTotal ?? d.grand_total,
    currency: d.currency ?? 'TRY',
    status: d.status,
    lines: d.lines,
  };
}
