'use client';
import { useState } from 'react';
import { api, setToken } from '@/lib/api';
import { useGame } from '@/lib/store';

export function AuthForm() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const setAuth = useGame((s) => s.setAuth);
  const bindSocket = useGame((s) => s.bindSocket);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res =
        mode === 'login'
          ? await api.login({ usernameOrEmail: username, password })
          : await api.register({ username, password, email: email || undefined });
      setToken(res.token);
      setAuth(res.user);
      bindSocket();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm card animate-pop">
        <div className="text-4xl mb-2 text-center">🎧</div>
        <h1 className="text-2xl font-extrabold text-center mb-1">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p className="text-center text-sm text-zinc-400 mb-6">
          Guess the song. Race the clock. Top the board.
        </p>

        <form onSubmit={submit} className="space-y-3">
          <input
            className="input"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
          />
          {mode === 'register' && (
            <input
              className="input"
              placeholder="Email (optional)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
          <input
            className="input"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <div className="text-sm text-red-400">{error}</div>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          className="mt-4 text-sm text-zinc-400 hover:text-zinc-200 w-full"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
          }}
        >
          {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
