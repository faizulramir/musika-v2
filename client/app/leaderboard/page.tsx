'use client';
import { useEffect, useState } from 'react';
import { Shell } from '@/components/Shell';
import { api } from '@/lib/api';
import type { GlobalRow } from '@/lib/types';

const MEDAL = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const [range, setRange] = useState<'all' | 'week'>('all');
  const [rows, setRows] = useState<GlobalRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .leaderboard(range)
      .then((d) => active && setRows(d.leaderboard))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [range]);

  return (
    <Shell>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-black">Leaderboard</h1>
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            {(['all', 'week'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
                  range === r ? 'bg-neon-violet text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {r === 'all' ? 'All-time' : 'This week'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-zinc-400 animate-pulse">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-zinc-400">
            No scores yet. Play a match to claim the top spot! 🎶
          </div>
        ) : (
          <ol className="space-y-2">
            {rows.map((r) => (
              <li
                key={r.rank + '-' + r.username}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                  r.isYou ? 'bg-neon-cyan/10 ring-1 ring-neon-cyan/40' : 'bg-white/[.03]'
                }`}
              >
                <span className="w-8 text-center text-lg">
                  {r.rank <= 3 ? MEDAL[r.rank - 1] : <span className="text-sm font-bold">{r.rank}</span>}
                </span>
                <span className="flex-1 font-semibold truncate">
                  {r.username} {r.isYou && <span className="text-neon-cyan text-sm">• you</span>}
                </span>
                <span className="font-black tabular-nums text-lg">{r.score}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Shell>
  );
}
