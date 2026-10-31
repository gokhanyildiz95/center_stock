import { useState } from 'react';
import { api, fmtDate, fmtQty, MOVEMENT_LABEL } from '../api.js';
import { useFetch } from '../hooks.js';
import { Alert, Card, PageHeader } from '../components/ui.jsx';

export default function Warehouse() {
  const [products, reload, error] = useFetch('/products');
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const list = products?.filter((p) => `${p.name} ${p.category ?? ''}`.toLocaleLowerCase('tr').includes(filter.toLocaleLowerCase('tr')));

  return (
    <>
      <PageHeader title="Depo">
        <input placeholder="Ara…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <button className="btn" onClick={() => setShowNew(!showNew)}>+ Yeni ürün</button>
      </PageHeader>
      <Alert>{error}</Alert>
      {showNew && <NewProduct onDone={() => { setShowNew(false); reload(); }} />}
      <div className={selected ? 'grid-2' : ''}>
        <Card>
          <table className="hover">
            <thead><tr><th>Ürün</th><th>Kategori</th><th className="num">Stok</th><th className="num">Minimum</th></tr></thead>
            <tbody>{list?.map((p) => (
              <tr key={p.id} onClick={() => setSelected(p.id)} className={selected === p.id ? 'selected' : ''}>
                <td>{p.name} {p.low && <span className="tag warn">kritik</span>}</td>
                <td className="muted">{p.category}</td>
                <td className={`num ${p.stock < 0 ? 'neg' : ''}`}>{fmtQty(p.stock, p.unit)}</td>
                <td className="num muted">{fmtQty(p.min_stock, p.unit)}</td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
        {selected && <ProductDetail key={selected} id={selected} onChange={reload} onClose={() => setSelected(null)} />}
      </div>
    </>
  );
}

function NewProduct({ onDone }) {
  const [f, setF] = useState({ name: '', unit: 'kg', category: '', min_stock: '' });
  const [error, setError] = useState();
  async function submit(e) {
    e.preventDefault();
    try { await api.post('/products', f); onDone(); } catch (err) { setError(err.message); }
  }
  return (
    <Card title="Yeni ürün kartı">
      <form className="form row" onSubmit={submit}>
        <label>Ad<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></label>
        <label>Stok birimi
          <select value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}>
            <option value="kg">kg</option><option value="lt">lt</option><option value="adet">adet</option>
          </select>
        </label>
        <label>Kategori<input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /></label>
        <label>Minimum stok<input type="number" step="any" min="0" value={f.min_stock} onChange={(e) => setF({ ...f, min_stock: e.target.value })} /></label>
        <button className="btn">Kaydet</button>
      </form>
      <Alert>{error}</Alert>
    </Card>
  );
}

function ProductDetail({ id, onChange, onClose }) {
  const [product, reloadProduct] = useFetch(`/products/${id}`);
  const [moves, reloadMoves] = useFetch(`/movements?product_id=${id}&limit=50`);
  const [counted, setCounted] = useState('');
  const [error, setError] = useState();

  async function adjust(e) {
    e.preventDefault();
    try {
      await api.post(`/products/${id}/adjust`, { counted: Number(counted) });
      setCounted(''); setError(); reloadProduct(); reloadMoves(); onChange();
    } catch (err) { setError(err.message); }
  }

  if (!product) return null;
  return (
    <Card title={product.name}>
      <button className="link close" onClick={onClose}>Kapat</button>
      <p className="big">{fmtQty(product.stock, product.unit)}</p>
      <form className="form row" onSubmit={adjust}>
        <label>Sayım sonucu ({product.unit})<input type="number" step="any" value={counted} onChange={(e) => setCounted(e.target.value)} required /></label>
        <button className="btn secondary">Stoğu düzelt</button>
      </form>
      <Alert>{error}</Alert>
      <h3>Hareketler</h3>
      <table>
        <tbody>{moves?.map((m) => (
          <tr key={m.id}>
            <td><span className={`tag ${m.type}`}>{MOVEMENT_LABEL[m.type]}</span></td>
            <td className={`num ${m.quantity < 0 ? 'neg' : 'pos'}`}>{m.quantity > 0 ? '+' : ''}{fmtQty(m.quantity, m.unit)}</td>
            <td className="muted">{m.recipe_name || m.supplier || m.note}</td>
            <td className="muted">{fmtDate(m.created_at)}</td>
          </tr>
        ))}</tbody>
      </table>
    </Card>
  );
}
