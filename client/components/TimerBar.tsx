'use client';
import { useEffect, useState } from 'react';

export function TimerBar({ endsAt, windowMs }: { endsAt: number; windowMs: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 80);
    return () => clearInterval(id);
  }, []);
  const remain = Math.max(0, endsAt - now);
  const pct = Math.min(100, (remain / windowMs) * 100);
  const danger = pct < 30;
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-zinc-400 mb-1">
        <span>Answer fast for more points</span>
        <span className="tabular-nums">{(remain / 1000).toFixed(1)}s</span>
      </div>
      <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-100 ease-linear"
          style={{
            width: `${pct}%`,
            background: danger
              ? 'linear-gradient(90deg,#ff2d95,#ff5533)'
              : 'linear-gradient(90deg,#22d3ee,#a3e635)',
          }}
        />
      </div>
    </div>
  );
}
