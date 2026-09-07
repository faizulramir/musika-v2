'use client';
import { useEffect } from 'react';
import { useGame } from '@/lib/store';
import { api, getToken } from '@/lib/api';

/**
 * On mount: if a token exists, validate it and hydrate the store,
 * then bind the shared socket to the game store.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setAuth = useGame((s) => s.setAuth);
  const setAuthLoading = useGame((s) => s.setAuthLoading);
  const bindSocket = useGame((s) => s.bindSocket);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!getToken()) {
        setAuthLoading(false);
        return;
      }
      try {
        const { user } = await api.me();
        if (active) {
          setAuth(user);
          bindSocket();
        }
      } catch {
        if (active) setAuth(null);
      } finally {
        if (active) setAuthLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [setAuth, setAuthLoading, bindSocket]);

  return <>{children}</>;
}
