export function PageHeader({ title, children }) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
      <div className="actions">{children}</div>
    </header>
  );
}

export function Alert({ kind = 'error', children }) {
  if (!children) return null;
  return <div className={`alert ${kind}`}>{children}</div>;
}

export function Card({ title, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}

export function EmployeeSelect({ employees, value, onChange, required }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} required={required}>
      <option value="">Çalışan seçin…</option>
      {employees?.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
    </select>
  );
}
