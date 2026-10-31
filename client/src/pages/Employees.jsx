import { useState } from 'react';
import { api } from '../api.js';
import { useFetch } from '../hooks.js';
import { Alert, Card, PageHeader } from '../components/ui.jsx';

export default function Employees() {
  const [list, reload] = useFetch('/employees');
  const [f, setF] = useState({ name: '', role: 'depo' });
  const [error, setError] = useState();
  async function submit(e) {
    e.preventDefault();
    try { await api.post('/employees', f); setF({ name: '', role: f.role }); setError(); reload(); }
    catch (err) { setError(err.message); }
  }
  return (
    <>
      <PageHeader title="Çalışanlar" />
      <Card>
        <form className="form row" onSubmit={submit}>
          <label className="grow">Ad soyad<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></label>
          <label>Görev<select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            <option value="depo">Depo</option><option value="mutfak">Mutfak</option><option value="muhasebe">Muhasebe</option><option value="yonetici">Yönetici</option>
          </select></label>
          <button className="btn">Ekle</button>
        </form>
        <Alert>{error}</Alert>
        <table>
          <thead><tr><th>Ad</th><th>Görev</th></tr></thead>
          <tbody>{list?.map((e) => <tr key={e.id}><td>{e.name}</td><td className="muted">{e.role}</td></tr>)}</tbody>
        </table>
      </Card>
    </>
  );
}
