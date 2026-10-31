import { useEffect, useState } from 'react';
import { api, fmtDate, fmtQty } from '../api.js';
import { useFetch } from '../hooks.js';
import { Alert, Card, EmployeeSelect, PageHeader } from '../components/ui.jsx';

export default function Production() {
  const [recipes] = useFetch('/recipes');
  const [employees] = useFetch('/employees');
  const [history, reloadHistory] = useFetch('/productions');
  const [f, setF] = useState({ recipe_id: '', portions: '', employee_id: '', note: '' });
  const [plan, setPlan] = useState(null);
  const [msg, setMsg] = useState({});

  // Seçim değiştikçe ihtiyaç listesini göster
  useEffect(() => {
    if (!f.recipe_id || !(Number(f.portions) > 0)) { setPlan(null); return; }
    const t = setTimeout(() => {
      api.post('/productions/preview', { recipe_id: Number(f.recipe_id), portions: Number(f.portions) })
        .then(setPlan).catch((e) => setMsg({ error: e.message }));
    }, 250);
    return () => clearTimeout(t);
  }, [f.recipe_id, f.portions]);

  async function submit(e, force = false) {
    e?.preventDefault();
    if (plan?.shortages.length && !force) return;
    try {
      await api.post('/productions', { ...f, recipe_id: Number(f.recipe_id), portions: Number(f.portions), employee_id: Number(f.employee_id) || null, force });
      setMsg({ ok: `${plan.recipe.name} – ${f.portions} kişilik üretim kaydedildi, malzemeler stoktan düşüldü.` });
      setF({ ...f, portions: '', note: '' });
      setPlan(null);
      reloadHistory();
    } catch (err) { setMsg({ error: err.message }); }
  }

  return (
    <>
      <PageHeader title="Mutfak / Üretim" />
      <Card title="Yapılan yemeği kaydet">
        <form className="form" onSubmit={submit}>
          <div className="row">
            <label className="grow">Yemek
              <select value={f.recipe_id} onChange={(e) => setF({ ...f, recipe_id: e.target.value })} required>
                <option value="">Reçete seçin…</option>
                {recipes?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>
            <label>Kaç kişilik yapıldı<input type="number" min="1" step="any" value={f.portions} onChange={(e) => setF({ ...f, portions: e.target.value })} required /></label>
            <label>Kaydeden<EmployeeSelect employees={employees} value={f.employee_id} onChange={(v) => setF({ ...f, employee_id: v })} /></label>
          </div>
          {plan && (
            <table>
              <thead><tr><th>Malzeme</th><th className="num">Düşülecek</th><th className="num">Mevcut stok</th><th className="num">Kalan</th></tr></thead>
              <tbody>{plan.needs.map((n) => (
                <tr key={n.product_id} className={n.sufficient ? '' : 'short'}>
                  <td>{n.product_name}</td>
                  <td className="num">{fmtQty(n.required, n.unit)}</td>
                  <td className="num">{fmtQty(n.stock, n.unit)}</td>
                  <td className={`num ${n.remaining < 0 ? 'neg' : ''}`}>{fmtQty(n.remaining, n.unit)}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
          <Alert>{msg.error}</Alert>
          <Alert kind="success">{msg.ok}</Alert>
          {plan?.shortages.length > 0 ? (
            <Alert kind="warn">
              {plan.shortages.length} malzemede stok yetersiz. Stok kaydı eksik olabilir; yine de kaydederseniz stok eksiye düşer.
              <div><button type="button" className="btn danger" onClick={() => submit(null, true)}>Yine de kaydet</button></div>
            </Alert>
          ) : (
            <button className="btn" disabled={!plan}>Kaydet ve stoktan düş</button>
          )}
        </form>
      </Card>
      <Card title="Üretim geçmişi">
        <table>
          <thead><tr><th>Tarih</th><th>Yemek</th><th className="num">Kişi</th><th>Kaydeden</th></tr></thead>
          <tbody>{history?.map((p) => (
            <tr key={p.id}><td>{fmtDate(p.created_at)}</td><td>{p.recipe_name}</td><td className="num">{p.portions}</td><td>{p.employee_name}</td></tr>
          ))}</tbody>
        </table>
      </Card>
    </>
  );
}
