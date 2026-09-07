'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/lib/store';
import { getSocket } from '@/lib/socket';
import { audio } from '@/lib/audio';
import { TimerBar } from './TimerBar';
import { Leaderboard } from './Leaderboard';
import type { Option } from '@/lib/types';

function useNow(ms = 80) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

function Countdown({ until }: { until: number }) {
  const now = useNow(80);
  const secs = Math.max(0, Math.ceil((until - now) / 1000));
  return (
    <div className="text-center py-16">
      <div className="text-7xl font-black animate-pop" key={secs}>
        {secs > 0 ? secs : 'GO!'}
      </div>
      <p className="text-zinc-400 mt-4">Get ready…</p>
    </div>
  );
}

function Results({ onAgain, onLeave, isHost }: { onAgain: () => void; onLeave: () => void; isHost: boolean }) {
  const leaderboard = useGame((s) => s.leaderboard);
  const user = useGame((s) => s.user);
  const solo = leaderboard.length === 1;
  const podium = leaderboard.slice(0, 3);
  const order = [1, 0, 2];
  const me = user ? leaderboard.find((p) => p.userId === user.id) : undefined;

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-3xl font-black text-center mb-1">
        {solo ? 'Solo complete!' : me && me.rank === 1 ? '🏆 You win!' : 'Match over'}
      </h2>
      <p className="text-center text-zinc-400 mb-6">
        Your score: <span className="text-neon-cyan font-bold">{me?.score ?? 0}</span>
      </p>

      <div className="flex items-end justify-center gap-3 my-8">
        {order.map((i) => {
          const p = podium[i];
          if (!p) return <div key={i} className="w-24" />;
          const h = i === 0 ? 'h-40' : i === 1 ? 'h-28' : 'h-24';
          return (
            <div key={i} className="flex flex-col items-center w-24">
              <div className="text-3xl mb-1">{['🥇', '🥈', '🥉'][i]}</div>
              <div className="text-sm font-bold truncate w-full text-center">{p.username}</div>
              <div className={`w-full rounded-t-xl bg-gradient-to-t from-neon-violet/30 to-neon-pink/40 ${h} flex items-start justify-center pt-2 font-black text-xl`}>
                {p.score}
              </div>
            </div>
          );
        })}
      </div>

      {leaderboard.length > 3 && (
        <div className="card mb-6">
          <Leaderboard compact />
        </div>
      )}

      <div className="flex gap-3 justify-center">
        {isHost ? (
          <button className="btn-primary" onClick={onAgain}>
            Rematch
          </button>
        ) : (
          <div className="card flex items-center text-zinc-400 text-sm">Waiting for host to rematch…</div>
        )}
        <button className="btn-ghost" onClick={onLeave}>
          Leave
        </button>
      </div>
    </div>
  );
}

function OptionsGrid({
  options,
  answered,
  correctId,
  chosenId,
  onPick,
}: {
  options: Option[];
  answered: boolean;
  correctId?: string;
  chosenId?: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((o) => {
        const isCorrect = correctId === o.id;
        const isChosen = chosenId === o.id;
        let cls = 'bg-white/5 hover:bg-white/10 border-white/10';
        if (answered) {
          if (isCorrect) cls = 'bg-emerald-500/20 border-emerald-400 text-emerald-100';
          else if (isChosen) cls = 'bg-red-500/20 border-red-400 text-red-100';
          else cls = 'bg-white/5 border-white/10 opacity-50';
        }
        return (
          <button
            key={o.id}
            disabled={answered}
            onClick={() => onPick(o.id)}
            className={`rounded-xl border px-4 py-4 text-left font-semibold transition active:scale-[.98] ${cls}`}
          >
            <span className="text-zinc-400 text-sm mr-2 uppercase">{o.id}</span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function MatchView({ mode }: { mode: 'solo' | 'multi' }) {
  const router = useRouter();
  const user = useGame((s) => s.user);
  const roomId = useGame((s) => s.roomId);
  const lobby = useGame((s) => s.lobby);
  const setLobby = useGame((s) => s.setLobby);
  const phase = useGame((s) => s.phase);
  const round = useGame((s) => s.round);
  const roundEndsAt = useGame((s) => s.roundEndsAt);
  const reveal = useGame((s) => s.reveal);
  const answered = useGame((s) => s.answered);
  const replayUsed = useGame((s) => s.replayUsed);
  const setReplayUsed = useGame((s) => s.setReplayUsed);
  const resetMatch = useGame((s) => s.resetMatch);
  const [error, setError] = useState('');

  // Rejoin the room (this page is only reached with a roomId)
  useEffect(() => {
    if (!roomId) return;
    const s = getSocket();
    s.emit('room:rejoin', roomId, (ack: any) => {
      if (ack?.ok) setLobby(ack.lobby);
      else {
        resetMatch();
        router.push('/');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  function start() {
    setError('');
    getSocket().emit('room:start', roomId, (ack: any) => {
      if (!ack?.ok) setError(ack?.error || 'Failed to start');
    });
  }

  function rematch() {
    setError('');
    getSocket().emit('room:rematch', roomId, (ack: any) => {
      if (!ack?.ok) setError(ack?.error || 'Failed to rematch');
    });
  }

  function submit(optionId: string) {
    if (answered || !roomId) return;
    getSocket().emit(
      'round:submit',
      roomId,
      { optionId, replayUsed },
      (ack: any) => {
        if (ack?.ok) useGame.setState({ answered: true });
      }
    );
  }

  function replay() {
    if (answered || replayUsed >= 2) return;
    audio.replay();
    setReplayUsed(replayUsed + 1);
  }

  function leave() {
    if (roomId) getSocket().emit('room:leave', roomId);
    audio.stop();
    resetMatch();
    setLobby(null);
    useGame.setState({ roomId: null });
    router.push('/');
  }

  const isHost = lobby ? lobby.hostId === user?.id : false;

  if (phase === 'end') {
    return <Results isHost={isHost} onAgain={rematch} onLeave={leave} />;
  }

  if (phase === 'countdown') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between text-sm text-zinc-400 mb-2">
          <span>{mode === 'multi' ? `Room ${lobby?.code}` : 'Solo match'}</span>
        </div>
        <Countdown until={roundEndsAt} />
      </div>
    );
  }

  if (phase === 'round' && round) {
    const qLabel = round.questionType === 'artist' ? 'Who is the artist?' : 'Which song is this?';
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <span className="chip bg-white/5 text-zinc-300">
            Round {round.number}/{round.totalRounds}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={replay} disabled={answered || replayUsed >= 2} className="btn-ghost !px-3 !py-1.5 text-sm">
              🔁 Replay ({2 - replayUsed})
            </button>
            <button onClick={leave} className="btn-ghost !px-3 !py-1.5 text-sm">
              ✕
            </button>
          </div>
        </div>

        <div className="card mb-4">
          <div className="flex items-center gap-4">
            <div className="text-4xl animate-float">🎵</div>
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wide text-neon-cyan mb-1">{qLabel}</div>
              <div className="font-bold text-lg">Listen and pick the answer</div>
            </div>
          </div>
        </div>

        <TimerBar endsAt={roundEndsAt} windowMs={round.windowMs} />

        <div className="mt-4">
          <OptionsGrid options={round.options} answered={answered} onPick={submit} />
        </div>

        {answered && (
          <div className="text-center text-zinc-400 mt-4 text-sm">Locked in! Waiting for the round to end…</div>
        )}
      </div>
    );
  }

  if (phase === 'reveal' && reveal) {
    const correct = round?.options.find((o) => o.id === reveal.correctOptionId)?.label;
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card mb-4 text-center">
          <div className="text-sm text-zinc-400">Correct answer</div>
          <div className="text-2xl font-black text-emerald-300 mt-1">{correct}</div>
        </div>
        <div className="card">
          <h3 className="font-bold mb-3">Round {reveal.number} results</h3>
          <Leaderboard />
        </div>
        <p className="text-center text-zinc-500 mt-4 text-sm">Next round starting…</p>
      </div>
    );
  }

  // ---- lobby / waiting ----
  return (
    <div className="max-w-xl mx-auto">
      {error && <div className="card text-red-300 mb-4">{error}</div>}
      {!lobby ? (
        <div className="text-center py-16 text-zinc-400 animate-pulse">Loading room…</div>
      ) : (
        <>
          {mode === 'multi' ? (
            <div className="card mb-4 text-center">
              <div className="text-sm text-zinc-400 mb-1">Share this room code</div>
              <div className="text-5xl font-black tracking-[0.3em] text-neon-cyan select-all">{lobby.code}</div>
              <p className="text-xs text-zinc-500 mt-2">Friends join from Home → Multiplayer → enter code.</p>
            </div>
          ) : (
            <div className="card mb-4 text-center">
              <div className="text-sm text-zinc-400 mb-1">Solo match</div>
              <div className="font-bold">8 rounds • Medium</div>
            </div>
          )}

          <div className="card mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold">Players</h3>
              <span className="text-sm text-zinc-400">{lobby.players.length}/8</span>
            </div>
            <ul className="space-y-1">
              {lobby.players.map((p) => (
                <li key={p.userId} className="flex items-center gap-2 rounded-lg bg-white/[.03] px-3 py-2">
                  <span>{lobby.hostId === p.userId ? '👑' : '•'}</span>
                  <span className="flex-1">{p.username}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3">
            {isHost ? (
              <button className="btn-primary flex-1" onClick={start}>
                {mode === 'multi' ? `Start with ${lobby.players.length} player(s)` : 'Start'}
              </button>
            ) : (
              <div className="flex-1 card text-center text-zinc-400">Waiting for host to start…</div>
            )}
            <button className="btn-ghost" onClick={leave}>
              Leave
            </button>
          </div>
        </>
      )}
    </div>
  );
}
