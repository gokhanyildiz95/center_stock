import { useState } from 'react';
import { api, fmtQty } from '../api.js';
import { useFetch } from '../hooks.js';
import { Alert, Card, PageHeader } from '../components/ui.jsx';

const INPUT_UNITS = { kg: ['g', 'kg'], lt: ['ml', 'lt'], adet: ['adet'] };

export default function Recipes() {
  const [recipes, reload, error] = useFetch('/recipes');
  const [products] = useFetch('/products');
  const [editing, setEditing] = useState(null); // null | 'new' | recipe

  async function remove(r) {
    if (!confirm(`"${r.name}" reçetesi silinsin mi?`)) return;
    try { await api.del(`/recipes/${r.id}`); reload(); } catch (e) { alert(e.message); }
  }

  return (
    <>
      <PageHeader title="Reçeteler">
        <button className="btn" onClick={() => setEditing('new')}>+ Yeni reçete</button>
      </PageHeader>
      <Alert>{error}</Alert>
      {editing && (
        <RecipeForm key={editing === 'new' ? 'new' : editing.id} recipe={editing === 'new' ? null : editing}
          products={products} onDone={() => { setEditing(null); reload(); }} onCancel={() => setEditing(null)} />
      )}
      <div className="cards">
        {recipes?.map((r) => (
          <Card key={r.id} title={r.name}>
            <p className="muted">{r.yield_portions} kişilik{r.notes ? ` · ${r.notes}` : ''}</p>
            <table>
              <thead><tr><th>Malzeme</th><th className="num">{r.yield_portions} kişilik</th><th className="num">Kişi başı</th></tr></thead>
              <tbody>{r.items.map((i) => (
                <tr key={i.product_id}><td>{i.product_name}</td><td className="num">{fmtQty(i.quantity, i.unit)}</td><td className="num muted">{fmtQty(i.quantity / r.yield_portions, i.unit)}</td></tr>
              ))}</tbody>
            </table>
            <div className="row">
              <button className="link" onClick={() => setEditing(r)}>Düzenle</button>
              <button className="link danger" onClick={() => remove(r)}>Sil</button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function RecipeForm({ recipe, products, onDone, onCancel }) {
  const [name, setName] = useState(recipe?.name ?? '');
  const [yieldPortions, setYield] = useState(recipe?.yield_portions ?? 1);
  const [notes, setNotes] = useState(recipe?.notes ?? '');
  const [items, setItems] = useState(
    recipe?.items.map((i) => ({ product_id: String(i.product_id), quantity: i.quantity, unit: i.unit })) ??
    [{ product_id: '', quantity: '', unit: '' }]);
  const [error, setError] = useState();

  const unitOf = (id) => products?.find((p) => p.id === Number(id))?.unit;
  const setItem = (i, patch) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function submit(e) {
    e.preventDefault();
    const body = {
      name, yield_portions: Number(yieldPortions), notes,
      items: items.filter((i) => i.product_id).map((i) => ({
        product_id: Number(i.product_id), quantity: Number(i.quantity), unit: i.unit || unitOf(i.product_id),
      })),
    };
    try {
      if (recipe) await api.put(`/recipes/${recipe.id}`, body); else await api.post('/recipes', body);
      onDone();
    } catch (err) { setError(err.message); }
  }

  return (
    <Card title={recipe ? `${recipe.name} – düzenle` : 'Yeni reçete'}>
      <form className="form" onSubmit={submit}>
        <div className="row">
          <label className="grow">Yemek adı<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <label>Kaç kişilik<input type="number" min="0.01" step="any" value={yieldPortions} onChange={(e) => setYield(e.target.value)} required /></label>
          <label className="grow">Not<input value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        </div>
        <p className="muted small">Malzeme miktarlarını yukarıdaki kişi sayısına göre girin. Kişi başı tarif için 1 yazın.</p>
        <table className="lines">
          <thead><tr><th>Malzeme</th><th>Miktar</th><th>Birim</th><th /></tr></thead>
          <tbody>{items.map((it, i) => {
            const base = unitOf(it.product_id);
            return (
              <tr key={i}>
                <td>
                  <select value={it.product_id} onChange={(e) => setItem(i, { product_id: e.target.value, unit: unitOf(e.target.value) })} required={i === 0}>
                    <option value="">Ürün seçin…</option>
                    {products?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </td>
                <td><input type="number" step="any" min="0" value={it.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} required={!!it.product_id} /></td>
                <td>
                  <select value={it.unit || base || ''} onChange={(e) => setItem(i, { unit: e.target.value })} disabled={!base}>
                    {(INPUT_UNITS[base] ?? []).map((u) => <option key={u}>{u}</option>)}
                  </select>
                </td>
                <td>{items.length > 1 && <button type="button" className="link danger" onClick={() => setItems(items.filter((_, j) => j !== i))}>Sil</button>}</td>
              </tr>
            );
          })}</tbody>
        </table>
        <button type="button" className="btn secondary" onClick={() => setItems([...items, { product_id: '', quantity: '', unit: '' }])}>+ Malzeme ekle</button>
        <Alert>{error}</Alert>
        <div className="row">
          <button className="btn">Kaydet</button>
          <button type="button" className="btn secondary" onClick={onCancel}>Vazgeç</button>
        </div>
      </form>
    </Card>
  );
}
