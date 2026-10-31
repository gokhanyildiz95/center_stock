import { useState } from 'react';
import { api, fmtDate, fmtQty } from '../api.js';
import { useFetch } from '../hooks.js';
import { Alert, Card, EmployeeSelect, PageHeader } from '../components/ui.jsx';

const emptyLine = () => ({ product_id: '', quantity: '', unit_price: '' });

export default function Intake() {
  const [products] = useFetch('/products');
  const [employees] = useFetch('/employees');
  const [history, reloadHistory] = useFetch('/movements?type=in&limit=30');
  const [form, setForm] = useState({ employee_id: '', supplier: '', document_no: '', note: '' });
  const [lines, setLines] = useState([emptyLine()]);
  const [msg, setMsg] = useState({});

  const setLine = (i, patch) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const unitOf = (id) => products?.find((p) => p.id === Number(id))?.unit;

  async function submit(e) {
    e.preventDefault();
    setMsg({});
    try {
      const items = lines.filter((l) => l.product_id).map((l) => ({ ...l, product_id: Number(l.product_id) }));
      await api.post('/intakes', { ...form, employee_id: Number(form.employee_id), items });
      setMsg({ ok: `${items.length} kalem depoya eklendi.` });
      setLines([emptyLine()]);
      setForm((f) => ({ ...f, document_no: '', note: '' }));
      reloadHistory();
    } catch (err) { setMsg({ error: err.message }); }
  }

  return (
    <>
      <PageHeader title="Mal Girişi" />
      <Card>
        <form onSubmit={submit} className="form">
          <div className="row">
            <label>Girişi yapan<EmployeeSelect employees={employees} value={form.employee_id} onChange={(v) => setForm({ ...form, employee_id: v })} required /></label>
            <label>Tedarikçi<input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></label>
            <label>İrsaliye / fatura no<input value={form.document_no} onChange={(e) => setForm({ ...form, document_no: e.target.value })} /></label>
          </div>
          <table className="lines">
            <thead><tr><th>Ürün</th><th>Miktar</th><th>Birim fiyat (₺)</th><th /></tr></thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td>
                    <select value={l.product_id} onChange={(e) => setLine(i, { product_id: e.target.value })} required={i === 0}>
                      <option value="">Ürün seçin…</option>
                      {products?.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                    </select>
                  </td>
                  <td><div className="with-unit"><input type="number" step="any" min="0" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} required={!!l.product_id} /><span>{unitOf(l.product_id)}</span></div></td>
                  <td><input type="number" step="any" min="0" value={l.unit_price} onChange={(e) => setLine(i, { unit_price: e.target.value })} /></td>
                  <td>{lines.length > 1 && <button type="button" className="link danger" onClick={() => setLines(lines.filter((_, j) => j !== i))}>Sil</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row">
            <button type="button" className="btn secondary" onClick={() => setLines([...lines, emptyLine()])}>+ Satır ekle</button>
            <label className="grow">Not<input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
          </div>
          <Alert>{msg.error}</Alert>
          <Alert kind="success">{msg.ok}</Alert>
          <button className="btn">Depoya kaydet</button>
          <p className="muted small">Listede olmayan bir ürün için önce Depo sayfasından ürün kartı açın.</p>
        </form>
      </Card>
      <Card title="Son girişler">
        <table>
          <thead><tr><th>Tarih</th><th>Ürün</th><th className="num">Miktar</th><th>Tedarikçi</th><th>Belge</th><th>Giren</th></tr></thead>
          <tbody>{history?.map((m) => (
            <tr key={m.id}><td>{fmtDate(m.created_at)}</td><td>{m.product_name}</td><td className="num">{fmtQty(m.quantity, m.unit)}</td><td>{m.supplier}</td><td>{m.document_no}</td><td>{m.employee_name}</td></tr>
          ))}</tbody>
        </table>
      </Card>
    </>
  );
}
