import { Link } from 'react-router-dom';
import { useFetch } from '../hooks.js';
import { fmtDate, fmtQty, MOVEMENT_LABEL } from '../api.js';
import { Alert, Card, PageHeader } from '../components/ui.jsx';

export default function Dashboard() {
  const [d, , error] = useFetch('/dashboard');
  return (
    <>
      <PageHeader title="Panel" />
      <Alert>{error}</Alert>
      {d && (
        <>
          <div className="stats">
            <div className="stat"><b>{d.product_count}</b><span>Ürün</span></div>
            <div className="stat"><b>{d.recipe_count}</b><span>Reçete</span></div>
            <div className="stat"><b>{d.productions_today}</b><span>Bugünkü üretim</span></div>
            <div className={`stat ${d.low_stock.length ? 'warn' : ''}`}><b>{d.low_stock.length}</b><span>Kritik stok</span></div>
          </div>
          <div className="grid-2">
            <Card title="Kritik stoktaki ürünler">
              {d.low_stock.length === 0 ? <p className="muted">Tüm ürünler minimum seviyenin üzerinde.</p> : (
                <table>
                  <thead><tr><th>Ürün</th><th className="num">Stok</th><th className="num">Minimum</th></tr></thead>
                  <tbody>{d.low_stock.map((p) => (
                    <tr key={p.id}><td>{p.name}</td><td className="num neg">{fmtQty(p.stock, p.unit)}</td><td className="num">{fmtQty(p.min_stock, p.unit)}</td></tr>
                  ))}</tbody>
                </table>
              )}
              <Link to="/mal-girisi" className="btn small">Mal girişi yap</Link>
            </Card>
            <Card title="Son stok hareketleri">
              <table>
                <tbody>{d.recent_movements.map((m) => (
                  <tr key={m.id}>
                    <td><span className={`tag ${m.type}`}>{MOVEMENT_LABEL[m.type]}</span></td>
                    <td>{m.product_name}</td>
                    <td className={`num ${m.quantity < 0 ? 'neg' : 'pos'}`}>{m.quantity > 0 ? '+' : ''}{fmtQty(m.quantity, m.unit)}</td>
                    <td className="muted">{fmtDate(m.created_at)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
