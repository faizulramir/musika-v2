import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

const MEDIA_DIR = path.resolve(process.cwd(), process.env.MEDIA_DIR || 'media');
const PARTS_DIR = path.join(MEDIA_DIR, 'parts');
const TMP_DIR = path.join(MEDIA_DIR, 'tmp');

// silence threshold in dB and the min silence length (s) to be cut
const SILENCE_DB = -35;
const LEAD_TAIL_S = 0.4; // trim up to this much of leading/trailing silence
const INTERNAL_S = 0.6; // cut internal silences longer than this
const PART_LEN = 10; // seconds per part
const MAX_PARTS = 10; // we want up to 10 parts

function ffmpeg(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('ffmpeg-static') as string;
}

function runFFmpeg(args: string[]): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(ffmpeg(), args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('error', (e) => resolve({ code: 1, stderr: String(e) }));
    proc.on('close', (code) => resolve({ code: code ?? 1, stderr }));
  });
}

export interface Mp3Meta {
  title: string;
  artist: string;
  album: string | null;
  year: number | null;
  genre: string;
  durationS: number;
}

/** Run `ffmpeg -i <file>` and capture the metadata + duration it prints to stderr. */
async function probe(file: string): Promise<{ meta: Record<string, string>; durationS: number }> {
  const { stderr } = await runFFmpeg(['-hide_banner', '-i', file]);
  const meta: Record<string, string> = {};
  for (const line of stderr.split('\n')) {
    // ffmpeg prints "      Title          : value" (key padded, then colon)
    const m = line.match(/^\s*(Title|Artist|Album|Genre|Date|Comment)\s*:\s*(.+?)\s*$/i);
    if (m) meta[m[1].toLowerCase()] = m[2].trim();
  }
  // Duration: 00:01:59.99
  const d = stderr.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
  let durationS = 0;
  if (d) durationS = parseInt(d[1], 10) * 3600 + parseInt(d[2], 10) * 60 + parseInt(d[3], 10) + parseInt(d[4], 10) / 100;
  return { meta, durationS };
}

/**
 * Some downloaders embed a full file path (with extension) as the title tag,
 * e.g. `C:\...\Temp\YoutubePlaylistDownloader\Di Alam Fana Cintamu.jpg`.
 * Reduce such values to just the filename without extension.
 */
function cleanTitle(raw: string): string {
  let t = (raw || '').trim();
  if (!t) return t;
  const looksLikePath = /^[a-zA-Z]:[\\/]/.test(t) || t.includes('/') || t.includes('\\');
  if (looksLikePath) {
    t = path.basename(t).replace(/\.(mp3|m4a|wav|ogg|flac|jpg|jpeg|png|webp)$/i, '');
  }
  return t.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Read ID3 tags + duration from an audio file using ffmpeg (robust to ID3v2.3/2.4). */
async function readMp3Meta(file: string): Promise<Mp3Meta> {
  const { meta, durationS } = await probe(file);
  const metaTitle = cleanTitle(meta.title);
  const fallbackTitle = path.basename(file, path.extname(file)).replace(/[_-]+/g, ' ').trim();
  const title = metaTitle || fallbackTitle;
  const artist = meta.artist || 'Unknown Artist';
  const album = meta.album || null;
  const year = meta.date ? parseInt(meta.date, 10) : null;
  const genre = meta.genre && meta.genre.trim() ? meta.genre.trim() : 'Other';
  return { title, artist, album, year: year || null, genre, durationS };
}

/** Get the duration (seconds) of an audio file (used on the trimmed WAV). */
async function audioDuration(file: string): Promise<number> {
  const { durationS } = await probe(file);
  return durationS;
}

/**
 * Trim leading/trailing silence AND long internal silences into a continuous
 * content-only WAV. Returns the output path.
 */
async function trimSilence(input: string, out: string): Promise<boolean> {
  // start: trim leading silence; then collapse internal; areverse trick trims trailing
  const af = [
    `silenceremove=start_periods=1:start_silence=${LEAD_TAIL_S}:start_threshold=${SILENCE_DB}dB`,
    `silenceremove=start_periods=-1:start_silence=${INTERNAL_S}:start_threshold=${SILENCE_DB}dB:stop_periods=-1:stop_threshold=${SILENCE_DB}dB`,
    `areverse`,
    `silenceremove=start_periods=1:start_silence=${LEAD_TAIL_S}:start_threshold=${SILENCE_DB}dB`,
    `areverse`,
  ].join(',');
  const r = await runFFmpeg(['-y', '-i', input, '-af', af, '-ac', '2', '-ar', '44100', out]);
  return r.code === 0;
}

/** Cut one segment [start, start+len) from src into out (MP3). */
async function cutPart(src: string, start: number, len: number, out: string): Promise<boolean> {
  const r = await runFFmpeg([
    '-y',
    '-ss', String(start),
    '-i', src,
    '-t', String(len),
    '-c:a', 'libmp3lame',
    '-b:a', '96k',
    out,
  ]);
  return r.code === 0;
}

export interface ProcessedSong {
  meta: Mp3Meta;
  parts: { index: number; audioPath: string; startS: number; lenS: number }[];
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

/**
 * Full pipeline: read metadata -> trim silence -> cut up to 10 x 10s parts.
 * `genre`/`difficulty` come from the admin (metadata genre is a fallback).
 */
export async function processMp3(
  inputPath: string,
  genre: string,
  _difficulty: 'easy' | 'medium' | 'hard'
): Promise<ProcessedSong> {
  fs.mkdirSync(PARTS_DIR, { recursive: true });
  fs.mkdirSync(TMP_DIR, { recursive: true });

  const meta = await readMp3Meta(inputPath);
  const songSlug = slug(`${meta.artist}-${meta.title}`);
  const songDir = path.join(PARTS_DIR, songSlug);
  fs.mkdirSync(songDir, { recursive: true });
  const trimmedWav = path.join(TMP_DIR, `${songSlug}.wav`);

  // trim silence
  const trimmed = await trimSilence(inputPath, trimmedWav);
  let contentDuration = 0;
  if (trimmed) {
    contentDuration = await audioDuration(trimmedWav);
  } else {
    // fallback: no trimming, use full source
    contentDuration = meta.durationS;
  }

  // Instead of slicing the song into sequential 10s chunks, sample up to 10
  // RANDOM 10-second windows from across the whole track. During a round one of
  // these parts is then picked at random (see game/engine.ts).
  const src = trimmed ? trimmedWav : inputPath;
  const maxStart = Math.max(0, contentDuration - PART_LEN);

  const chosen: number[] = [];
  const seen = new Set<number>();
  let attempts = 0;
  const maxAttempts = MAX_PARTS * 40;
  while (chosen.length < MAX_PARTS && attempts < maxAttempts) {
    attempts++;
    const start = Math.floor(Math.random() * (maxStart + 1)); // random integer second
    if (seen.has(start)) continue;
    // reject windows that overlap an existing one (keeps the 10 parts distinct)
    if (chosen.some((s) => Math.abs(s - start) < PART_LEN)) continue;
    seen.add(start);
    chosen.push(start);
  }
  if (chosen.length === 0) chosen.push(0); // song shorter than one window
  chosen.sort((a, b) => a - b);

  const parts: ProcessedSong['parts'] = [];
  for (let i = 0; i < chosen.length; i++) {
    const start = chosen[i];
    const len = Math.min(PART_LEN, contentDuration - start);
    if (len < 2) continue; // skip dust at the very end
    const outRel = `media/parts/${songSlug}/p${i}.mp3`;
    const outAbs = path.join(songDir, `p${i}.mp3`);
    const ok = await cutPart(src, start, len, outAbs);
    if (ok) {
      parts.push({ index: i, audioPath: outRel, startS: start, lenS: len });
    }
  }

  // cleanup temp
  try {
    if (fs.existsSync(trimmedWav)) fs.unlinkSync(trimmedWav);
  } catch {}

  if (parts.length === 0) throw new Error('No usable audio could be extracted from the MP3.');
  return { meta, parts };
}
