import { MockTurkFaturaAdapter } from './mockAdapter.js';
import { TurkFaturaHttpAdapter } from './turkFaturaAdapter.js';

/**
 * Muhasebe sağlayıcısı arayüzü. Her adaptör şunları sağlar:
 *   listDocuments({ type, direction, from, to, q, page, pageSize })
 *     -> { items: Document[], total, page, pageSize }
 *   getDocument(id) -> Document | null
 *   name: string
 *
 * Document: { id, ettn, document_no, type, direction, counterparty, tax_number,
 *             issue_date, net_total, tax_total, grand_total, currency, status, lines? }
 */
export function createAccountingProvider(env = process.env) {
  const provider = (env.ACCOUNTING_PROVIDER || 'mock').toLowerCase();
  if (provider === 'turkfatura') {
    return new TurkFaturaHttpAdapter({ baseUrl: env.TURKFATURA_API_URL, apiKey: env.TURKFATURA_API_KEY });
  }
  return new MockTurkFaturaAdapter();
}
