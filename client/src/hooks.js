import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

/** GET isteği yapar; [data, reload, error, loading] döner. */
export function useFetch(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await api.get(path)); setError(null); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [path]);
  useEffect(() => { load(); }, [load]);
  return [data, load, error, loading];
}
