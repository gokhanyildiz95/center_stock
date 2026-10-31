import { useState } from 'react';
import { api, fmtDate, fmtMoney } from '../api.js';
import { useFetch } from '../hooks.js';
import { Alert, Card, PageHeader } from '../components/ui.jsx';

const DIRECTION = { incoming: 'Gelen', outgoing: 'Giden' };

export default function Accounting() {
  const [q, setQ] = useState({ direction: '', type: '', from: '', to: '', q: '', page: 1 });
  const params = new URLSearchParams(Object.entries(q).filter(([, v]) => v)).toString();
  const [data, , error, loading] = useFetch(`/accounting/documents?${params}`);
  const [info] = useFetch('/accounting/info');
  const [doc, setDoc] = useState(null);
  const set = (patch) => setQ({ ...q, page: 1, ...patch });
  const pages = data ? Math.ceil(data.total / data.pageSize) : 1;

  return (
    <>
      <PageHeader title="Muhasebe">
        {info && <span className="tag">{info.provider}</span>}
      </PageHeader>
      <Card>
        <div className="form row">
          <label>Yön<select value={q.direction} onChange={(e) => set({ direction: e.target.value })}>
            <option value="">Tümü</option><option value="incoming">Gelen</option><option value="outgoing">Giden</option>
          </select></label>
          <label>Tür<select value={q.type} onChange={(e) => set({ type: e.target.value })}>
            <option value="">Tümü</option><option>e-Fatura</option><option>e-Arşiv</option><option>e-İrsaliye</option>
          </select></label>
          <label>Başlangıç<input type="date" value={q.from} onChange={(e) => set({ from: e.target.value })} /></label>
          <label>Bitiş<input type="date" value={q.to} onChange={(e) => set({ to: e.target.value })} /></label>
          <label className="grow">Ara<input placeholder="Belge no, firma, VKN" value={q.q} onChange={(e) => set({ q: e.target.value })} /></label>
        </div>
        <Alert>{error}</Alert>
        <table className="hover">
          <thead><tr><th>Tarih</th><th>Belge no</th><th>Tür</th><th>Yön</th><th>Firma</th><th className="num">Tutar</th><th>Durum</th></tr></thead>
          <tbody>{data?.items.map((d) => (
            <tr key={d.id} onClick={() => api.get(`/accounting/documents/${d.id}`).then(setDoc)}>
              <td>{fmtDate(d.issue_date)}</td><td>{d.document_no}</td><td>{d.type}</td>
              <td><span className={`tag ${d.direction}`}>{DIRECTION[d.direction]}</span></td>
              <td>{d.counterparty}</td><td className="num">{fmtMoney(d.grand_total, d.currency)}</td><td>{d.status}</td>
            </tr>
          ))}</tbody>
        </table>
        {data && (
          <div className="pager">
            <span className="muted">{loading ? 'Yükleniyor…' : `${data.total} belge`}</span>
            <button className="btn secondary small" disabled={q.page <= 1} onClick={() => setQ({ ...q, page: q.page - 1 })}>‹</button>
            <span>{q.page} / {pages || 1}</span>
            <button className="btn secondary small" disabled={q.page >= pages} onClick={() => setQ({ ...q, page: q.page + 1 })}>›</button>
          </div>
        )}
      </Card>
      {doc && (
        <div className="modal" onClick={() => setDoc(null)}>
          <div className="card modal-body" onClick={(e) => e.stopPropagation()}>
            <button className="link close" onClick={() => setDoc(null)}>Kapat</button>
            <h2>{doc.type} · {doc.document_no}</h2>
            <p className="muted">{doc.counterparty} · VKN {doc.tax_number} · {fmtDate(doc.issue_date)} · ETTN {doc.ettn}</p>
            <table>
              <thead><tr><th>Açıklama</th><th className="num">Miktar</th><th className="num">Birim fiyat</th><th className="num">KDV</th><th className="num">Tutar</th></tr></thead>
              <tbody>{doc.lines?.map((l, i) => (
                <tr key={i}><td>{l.description}</td><td className="num">{l.quantity}</td><td className="num">{fmtMoney(l.unit_price)}</td><td className="num">%{l.tax_rate}</td><td className="num">{fmtMoney(l.total)}</td></tr>
              ))}</tbody>
              <tfoot>
                <tr><td colSpan={4}>Ara toplam</td><td className="num">{fmtMoney(doc.net_total)}</td></tr>
                <tr><td colSpan={4}>KDV</td><td className="num">{fmtMoney(doc.tax_total)}</td></tr>
                <tr><th colSpan={4}>Genel toplam</th><th className="num">{fmtMoney(doc.grand_total)}</th></tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
