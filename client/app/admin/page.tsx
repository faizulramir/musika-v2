'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Shell } from '@/components/Shell';
import { useGame } from '@/lib/store';
import { api, API, getToken } from '@/lib/api';
import { Howl } from 'howler';
import type { Song } from '@/lib/types';

interface AdminRow {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  year: number | null;
  genre: string;
  difficulty: 'easy' | 'medium' | 'hard';
  sourceType: 'demo' | 'uploaded';
  isActive: boolean;
  partCount: number;
  parts: number[];
}

const GENRES = ['Pop', 'Rock', 'Hip-Hop', 'K-Pop', 'EDM', 'Latin', 'Jazz', 'R&B', 'Malay', 'Other'];

export default function AdminPage() {
  const user = useGame((s) => s.user);
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [genres, setGenres] = useState<string[]>(GENRES);
  const [genre, setGenre] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');
  const [pending, setPending] = useState<File[]>([]);
  const [results, setResults] = useState<
    { file: string; ok: boolean; error?: string; parts?: number; title?: string; artist?: string }[]
  >([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const howlRef = useRef<Howl | null>(null);
  const fullRef = useRef<Record<string, Song>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, g] = await Promise.all([
        adminFetch('/admin/songs'),
        api.genres(),
      ]);
      setGenres(g.genres.map((x) => x.name));
      const full: Record<string, Song> = {};
      const mapped: AdminRow[] = s.songs.map((x: any) => {
        full[x.id] = {
          id: x.id,
          title: x.title,
          artist: x.artist,
          year: x.year,
          album: x.album,
          difficulty: x.difficulty,
          audioPath: '',
          sourceType: x.sourceType,
          genre: { id: 0, name: x.genre },
          parts: x.parts,
        };
        return {
          id: x.id,
          title: x.title,
          artist: x.artist,
          album: x.album,
          year: x.year,
          genre: x.genre,
          difficulty: x.difficulty,
          sourceType: x.sourceType,
          isActive: x.isActive,
          partCount: x.partCount,
          parts: x.parts.map((p: any) => p.index),
        };
      });
      fullRef.current = full;
      setRows(mapped);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function adminFetch(path: string, init: RequestInit = {}) {
    const res = await fetch(API + '/api' + path, {
      ...init,
      headers: { ...(init.headers as any), authorization: 'Bearer ' + (getToken() || '') },
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((d as any).error || 'Request failed');
    return d;
  }

  function onFilesPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []);
    setPending((prev) => {
      const seen = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...picked.filter((f) => !seen.has(f.name + f.size))];
    });
    if (fileRef.current) fileRef.current.value = ''; // allow re-picking same file
  }

  function removePending(i: number) {
    setPending((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function startUpload() {
    if (!pending.length || uploading) return;
    setUploading(true);
    setError('');
    setResults([]);
    setStatus(`Processing ${pending.length} file(s)… each is trimmed and cut into 10s parts.`);
    try {
      const fd = new FormData();
      for (const f of pending) fd.append('files', f);
      fd.append('genre', genre);
      fd.append('difficulty', difficulty);
      const res = await fetch(API + '/api/admin/songs', {
        method: 'POST',
        headers: { authorization: 'Bearer ' + (getToken() || '') },
        body: fd,
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Upload failed');
      setResults(
        (d.results || []).map((r: any) => ({
          file: r.file,
          ok: r.ok,
          error: r.error,
          parts: r.song?.parts,
          title: r.song?.title,
          artist: r.song?.artist,
        }))
      );
      setStatus(`Done: ${d.ok}/${d.total} uploaded successfully.`);
      setPending([]);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function toggle(id: string) {
    await adminFetch(`/admin/songs/${id}/toggle`, { method: 'POST' });
    load();
  }
  async function del(id: string) {
    if (!confirm('Delete this song and all its parts?')) return;
    await adminFetch(`/admin/songs/${id}`, { method: 'DELETE' });
    load();
  }
  function previewPart(songId: string, idx: number) {
    const song = fullRef.current[songId];
    const part = song?.parts?.find((p) => p.index === idx);
    if (!part) return;
    howlRef.current?.stop();
    const url = part.audioPath.startsWith('http') ? part.audioPath : `${API}/${part.audioPath}`;
    const h = new Howl({ src: [url], html5: true });
    h.once('end', () => setPreview(''));
    howlRef.current = h;
    h.play();
    setPreview(`${song?.artist} — ${song?.title} (part ${idx})`);
  }

  if (!user?.isAdmin) {
    return (
      <Shell>
        <div className="card max-w-md mx-auto text-center py-16">
          <div className="text-5xl mb-3">🔒</div>
          <h1 className="text-2xl font-bold mb-2">Admin access required</h1>
          <p className="text-zinc-400">
            Your account isn&apos;t in the <code>ADMIN_EMAILS</code> list. Ask the server admin to add your
            email, then sign in again.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black mb-1">Admin · Music Library</h1>
        <p className="text-zinc-400 mb-6">
          Drop an MP3. We read its ID3 tags, remove empty/noise silences, and cut it into up to 10 × 10s parts.
        </p>

        <div className="card mb-6">
          <h2 className="font-bold mb-3">Upload songs (batch)</h2>
          <div className="flex flex-wrap gap-3 items-end">
            <label className="flex-1 min-w-[220px]">
              <span className="text-xs text-zinc-400 block mb-1">
                Audio files — select one or many (mp3/m4a/wav/ogg/flac)
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="audio/*,.mp3"
                multiple
                onChange={onFilesPicked}
                disabled={uploading}
                className="input file:mr-3 file:rounded-lg file:px-3 file:py-1 file:text-sm file:bg-white/10 file:text-white"
              />
            </label>
            <label>
              <span className="text-xs text-zinc-400 block mb-1">Genre (optional)</span>
              <select className="input !w-auto" value={genre} onChange={(e) => setGenre(e.target.value)}>
                <option value="">auto (ID3)</option>
                {genres.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-xs text-zinc-400 block mb-1">Difficulty</span>
              <select className="input !w-auto" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="easy">easy</option>
                <option value="medium">medium</option>
                <option value="hard">hard</option>
              </select>
            </label>
          </div>

          {pending.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-zinc-400 mb-1">
                {pending.length} file(s) ready
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                {pending.map((f, i) => (
                  <div key={f.name + f.size} className="flex items-center gap-2 text-sm bg-white/5 rounded-lg px-3 py-1.5">
                    <span className="truncate flex-1">🎵 {f.name}</span>
                    <span className="text-xs text-zinc-500 shrink-0">
                      {(f.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                    <button className="text-red-300 hover:text-red-200" onClick={() => removePending(i)}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            className="btn-primary mt-3"
            disabled={uploading || pending.length === 0}
            onClick={startUpload}
          >
            {uploading ? 'Processing…' : `Upload ${pending.length || ''} file(s)`}
          </button>

          {status && <div className="mt-3 text-sm text-neon-cyan">{status}</div>}
          {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
          {results.length > 0 && (
            <div className="mt-3 space-y-1">
              {results.map((r, i) => (
                <div
                  key={r.file + i}
                  className={
                    'text-sm rounded-lg px-3 py-1.5 ' +
                    (r.ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300')
                  }
                >
                  {r.ok ? '✔' : '✖'} {r.file}
                  {r.ok && r.title && (
                    <span className="text-zinc-400">
                      {' '}{r.artist} — {r.title} · {r.parts} parts
                    </span>
                  )}
                  {!r.ok && r.error && <span className="text-zinc-400"> {' '}{r.error}</span>}
                </div>
              ))}
            </div>
          )}
          {preview && (
            <div className="mt-3 flex items-center gap-3 text-sm">
              <span className="chip bg-white/5 text-zinc-300">🔊 {preview}</span>
              <button className="btn-ghost !px-3 !py-1 text-xs" onClick={() => howlRef.current?.stop()}>
                stop
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mb-2">
          <h2 className="font-bold">Songs ({rows.length})</h2>
          <button className="btn-ghost !px-3 !py-1.5 text-sm" onClick={load}>↻ Refresh</button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-zinc-400 animate-pulse">Loading…</div>
        ) : (
          <div className="space-y-2">
            {rows.map((s) => (
              <div key={s.id} className="card !p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">
                      {s.title} <span className="text-zinc-500 font-normal">— {s.artist}</span>
                    </div>
                    <div className="text-xs text-zinc-400">
                      {s.genre} · {s.year ?? '—'} · {s.difficulty} ·{' '}
                      {s.sourceType === 'uploaded' ? '📥 uploaded' : '🎛 demo'} ·{' '}
                      <span className="text-neon-cyan">{s.partCount} parts</span>
                    </div>
                  </div>
                  <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => toggle(s.id)}>
                    {s.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button className="btn-ghost !px-3 !py-1.5 text-xs !text-red-300" onClick={() => del(s.id)}>
                    Delete
                  </button>
                </div>
                {s.partCount > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.parts.map((idx) => (
                      <button
                        key={idx}
                        className="chip bg-white/5 text-zinc-300 hover:bg-white/10"
                        onClick={() => previewPart(s.id, idx)}
                      >
                        ▶ part {idx}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
