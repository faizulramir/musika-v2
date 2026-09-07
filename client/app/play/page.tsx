'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { useGame } from '@/lib/store';
import { getSocket } from '@/lib/socket';

export default function PlayPage() {
  const router = useRouter();
  const resetMatch = useGame((s) => s.resetMatch);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function create() {
    setBusy(true);
    setError('');
    resetMatch();
    getSocket().emit(
      'room:create',
      { mode: 'multi', rounds: 8, difficulty: 'medium' },
      (ack: any) => {
        setBusy(false);
        if (ack?.ok) router.push('/r/' + ack.roomId);
        else setError(ack?.error || 'Failed to create room');
      }
    );
  }

  function join() {
    if (code.trim().length < 4) {
      setError('Enter a 4-character room code');
      return;
    }
    setBusy(true);
    setError('');
    resetMatch();
    getSocket().emit(
      'room:join',
      code.trim().toUpperCase(),
      (ack: any) => {
        setBusy(false);
        if (ack?.ok) router.push('/r/' + ack.roomId);
        else setError(ack?.error || 'Failed to join room');
      }
    );
  }

  return (
    <Shell>
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-black mb-1">Multiplayer</h1>
        <p className="text-zinc-400 mb-6">Create a room to share a code, or join a friend&apos;s room.</p>

        <button className="btn-primary w-full mb-4" onClick={create} disabled={busy}>
          ➕ Create a room
        </button>

        <div className="flex items-center gap-3 my-4 text-zinc-500 text-sm">
          <div className="flex-1 h-px bg-white/10" /> or join with code <div className="flex-1 h-px bg-white/10" />
        </div>

        <div className="flex gap-3">
          <input
            className="input uppercase tracking-[0.3em] text-center font-bold"
            placeholder="CODE"
            maxLength={4}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && join()}
          />
          <button className="btn-cyan shrink-0" onClick={join} disabled={busy}>
            Join
          </button>
        </div>
        {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
      </div>
    </Shell>
  );
}
