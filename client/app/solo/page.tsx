'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { getSocket } from '@/lib/socket';

export default function SoloPage() {
  const router = useRouter();
  const createdRef = useRef(false);

  useEffect(() => {
    if (createdRef.current) return;
    createdRef.current = true;
    getSocket().emit(
      'room:create',
      { mode: 'solo', rounds: 8, difficulty: 'medium' },
      (ack: any) => {
        if (ack?.ok) router.push('/r/' + ack.roomId);
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Shell>
      <div className="text-center py-20 text-zinc-400 animate-pulse">Starting solo match…</div>
    </Shell>
  );
}
