async function request(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'İstek başarısız');
    Object.assign(err, data, { status: res.status });
    throw err;
  }
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b ?? {}),
  put: (p, b) => request('PUT', p, b),
  patch: (p, b) => request('PATCH', p, b),
  del: (p) => request('DELETE', p),
};

export const fmtQty = (n, unit) =>
  `${Number(n).toLocaleString('tr-TR', { maximumFractionDigits: 3 })} ${unit ?? ''}`.trim();
export const fmtMoney = (n, currency = 'TRY') =>
  Number(n ?? 0).toLocaleString('tr-TR', { style: 'currency', currency });
export const fmtDate = (s) => (s ? new Date(s.replace(' ', 'T') + (s.length > 10 ? 'Z' : '')).toLocaleString('tr-TR', s.length > 10 ? undefined : { dateStyle: 'medium' }) : '');

export const MOVEMENT_LABEL = { in: 'Giriş', production: 'Üretim', adjustment: 'Sayım' };
