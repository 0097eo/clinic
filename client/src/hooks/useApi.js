import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function useApi(fn, deps = [], { immediate = true } = {}) {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!immediate) {
      return () => {};
    }

    let active = true;

    const call = async () => {
      if (!token) return;

      setLoading(true);
      setError(null);
      try {
        const result = await fn(token);
        if (active) {
          setData(result);
        }
      } catch (err) {
        if (active) {
          setError(err);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    call();

    return () => {
      active = false;
    };
  }, [token, immediate, fn, ...deps]);

  return { data, loading, error, setData };
}
