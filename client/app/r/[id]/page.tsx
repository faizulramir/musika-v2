'use client';
import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { MatchView } from '@/components/MatchView';
import { useGame } from '@/lib/store';

export default function RoomPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const setRoomId = useGame((s) => s.setRoomId);
  const lobby = useGame((s) => s.lobby);

  // sync the URL room id into the store so MatchView can rejoin
  useEffect(() => {
    if (id) setRoomId(id);
  }, [id, setRoomId]);

  const mode = lobby?.settings?.mode === 'solo' ? 'solo' : 'multi';

  return (
    <Shell>
      <MatchView mode={mode} />
    </Shell>
  );
}
