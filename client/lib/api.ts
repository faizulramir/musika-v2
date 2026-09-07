// Empty = same origin (production behind Nginx). Set to http://host:port in local dev.
export const API = process.env.NEXT_PUBLIC_API_URL || '';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('musika_token');
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('musika_token', token);
  else localStorage.removeItem('musika_token');
}

async function http<T>(path: string, opts: { method?: string; body?: any } = {}): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  const tok = getToken();
  if (tok) headers.authorization = 'Bearer ' + tok;
  const res = await fetch(API + '/api' + path, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || 'Request failed');
  return data as T;
}

export const api = {
  register: (b: { username: string; password: string; email?: string }) =>
    http<{ token: string; user: { id: string; username: string } }>('/auth/register', { method: 'POST', body: b }),
  login: (b: { usernameOrEmail: string; password: string }) =>
    http<{ token: string; user: { id: string; username: string } }>('/auth/login', { method: 'POST', body: b }),
  me: () => http<{ user: { id: string; username: string } }>('/auth/me'),
  songs: (q?: { genre?: string; difficulty?: string }) =>
    http<{ songs: import('./types').Song[] }>('/songs?' + new URLSearchParams(q as any)),
  genres: () => http<{ genres: { id: number; name: string }[] }>('/songs/genres'),
  leaderboard: (range?: 'all' | 'week') => http<{ leaderboard: import('./types').GlobalRow[]; range: string }>('/leaderboard?range=' + (range || 'all')),
};
