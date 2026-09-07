'use client';
import Link from 'next/link';
import { Shell } from '@/components/Shell';

export default function Home() {
  return (
    <Shell>
      <section className="py-10 text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-black leading-tight">
          Guess the song.{' '}
          <span className="bg-gradient-to-r from-neon-pink via-neon-violet to-neon-cyan bg-clip-text text-transparent">
            Race the clock.
          </span>
        </h1>
        <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
          Listen to a clip, pick the artist or song from 4 options, and answer before the
          others. The faster you are — and the longer your streak — the more you score.
        </p>
      </section>

      <section className="grid sm:grid-cols-2 gap-4">
        <Link href="/solo" className="card group hover:border-neon-cyan/40 transition">
          <div className="text-5xl mb-3 group-hover:animate-float">🎧</div>
          <h2 className="text-xl font-bold mb-1">Play Solo</h2>
          <p className="text-sm text-zinc-400">
            Practice against the clock and climb the global leaderboard.
          </p>
          <span className="mt-4 inline-block text-neon-cyan font-semibold">Start solo →</span>
        </Link>

        <Link href="/play" className="card group hover:border-neon-pink/40 transition">
          <div className="text-5xl mb-3 group-hover:animate-float">🎮</div>
          <h2 className="text-xl font-bold mb-1">Multiplayer</h2>
          <p className="text-sm text-zinc-400">
            Create a room, share the code, and battle up to 8 friends live.
          </p>
          <span className="mt-4 inline-block text-neon-pink font-semibold">Create a room →</span>
        </Link>
      </section>

      <section className="grid sm:grid-cols-2 gap-4 mt-4">
        <Link href="/leaderboard" className="card hover:border-white/25 transition flex items-center gap-4">
          <div className="text-4xl">🏆</div>
          <div>
            <h3 className="font-bold">Leaderboards</h3>
            <p className="text-sm text-zinc-400">All-time &amp; weekly top players.</p>
          </div>
        </Link>
        <Link href="/library" className="card hover:border-white/25 transition flex items-center gap-4">
          <div className="text-4xl">📀</div>
          <div>
            <h3 className="font-bold">Song Library</h3>
            <p className="text-sm text-zinc-400">Browse {`65`} tracks across 9 genres.</p>
          </div>
        </Link>
      </section>

      <section className="mt-8 card">
        <h3 className="font-bold mb-3">How it works</h3>
        <ol className="grid sm:grid-cols-4 gap-4 text-sm text-zinc-300">
          <li>1️⃣ A short clip plays (4–8s).</li>
          <li>2️⃣ Pick from 4 options — artist or song.</li>
          <li>3️⃣ Faster + correct = more points &amp; streaks.</li>
          <li>4️⃣ Highest score when the final round ends wins.</li>
        </ol>
      </section>
    </Shell>
  );
}
