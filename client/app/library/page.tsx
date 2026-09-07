'use client';
import { useEffect, useRef, useState } from 'react';
import { Shell } from '@/components/Shell';
import { api, API } from '@/lib/api';
import { Howl } from 'howler';
import type { Song } from '@/lib/types';

export default function LibraryPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [genre, setGenre] = useState('');
  const [diff, setDiff] = useState('');
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState<string | null>(null);
  const howlRef = useRef<Howl | null>(null);

  useEffect(() => {
    Promise.all([api.songs(), api.genres()])
      .then(([s, g]) => {
        setSongs(s.songs);
        setGenres(g.genres.map((x) => x.name));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = songs.filter(
    (s) => (!genre || s.genre.name === genre) && (!diff || s.difficulty === diff)
  );

  function preview(s: Song) {
    // stop any previous preview
    howlRef.current?.stop();
    const url = s.audioPath.startsWith('http') ? s.audioPath : `${API}/${s.audioPath}`;
    const h = new Howl({ src: [url], html5: true });
    h.once('end', () => setPlaying(null));
    howlRef.current = h;
    h.play();
    setPlaying(s.id);
  }

  return (
    <Shell>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black mb-4">Song Library</h1>

        <div className="flex flex-wrap gap-2 mb-4">
          <select className="input !w-auto" value={genre} onChange={(e) => setGenre(e.target.value)}>
            <option value="">All genres</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select className="input !w-auto" value={diff} onChange={(e) => setDiff(e.target.value)}>
            <option value="">All difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <span className="self-center text-sm text-zinc-400">{filtered.length} tracks</span>
        </div>

        {loading ? (
          <div className="text-center py-16 text-zinc-400 animate-pulse">Loading…</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {filtered.map((s) => (
              <div key={s.id} className="card !p-4 flex items-center gap-3">
                <button
                  onClick={() => preview(s)}
                  className="w-11 h-11 rounded-full bg-gradient-to-br from-neon-pink to-neon-violet flex items-center justify-center text-lg shrink-0 hover:brightness-110"
                  aria-label="preview"
                >
                  {playing === s.id ? '⏸' : '▶'}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{s.title}</div>
                  <div className="text-sm text-zinc-400 truncate">
                    {s.artist} · {s.year ?? ''}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="chip bg-white/5 text-zinc-300">{s.genre.name}</span>
                  <span
                    className={`chip ${
                      s.difficulty === 'easy'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : s.difficulty === 'medium'
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'bg-red-500/15 text-red-300'
                    }`}
                  >
                    {s.difficulty}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
