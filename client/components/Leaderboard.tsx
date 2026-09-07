'use client';
import type { LeaderRow } from '@/lib/types';
import { useGame } from '@/lib/store';

const MEDAL = ['🥇', '🥈', '🥉'];

export function Leaderboard({ compact = false }: { compact?: boolean }) {
  const leaderboard = useGame((s) => s.leaderboard);
  const user = useGame((s) => s.user);
  if (!leaderboard.length) {
    return (
      <div className="text-sm text-zinc-500 italic">Leaderboard appears here…</div>
    );
  }
  return (
    <ul className={`space-y-${compact ? 1 : 2}`}>
      {leaderboard.map((p) => {
        const me = user && p.userId === user.id;
        return (
          <li
            key={p.userId}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
              me ? 'bg-neon-cyan/10 ring-1 ring-neon-cyan/40' : 'bg-white/[.03]'
            }`}
          >
            <span className="w-7 text-center text-sm font-bold tabular-nums">
              {p.rank <= 3 ? MEDAL[p.rank - 1] : p.rank}
            </span>
            <span className={`flex-1 truncate ${p.dropped ? 'line-through text-zinc-500' : ''}`}>
              {p.username} {me && <span className="text-neon-cyan">• you</span>}
            </span>
            {p.streak > 1 && (
              <span className="chip bg-neon-pink/15 text-neon-pink">🔥{p.streak}</span>
            )}
            <span className="tabular-nums font-bold w-16 text-right">{p.score}</span>
          </li>
        );
      })}
    </ul>
  );
}
