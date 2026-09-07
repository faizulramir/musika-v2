/**
 * Generates short, royalty-free synth "clips" for each demo song.
 *
 * Every song gets a unique, deterministic melody (seeded by title+artist)
 * built from a genre-flavored scale, so "artist/song guessing" gameplay works
 * with 100% original audio (no copyrighted recordings).
 *
 * Writes mono 22050Hz 16-bit WAV files to server/media/<id>.wav
 */
import * as fs from 'fs';
import * as path from 'path';
import { GENRES, SONGS, type Difficulty } from '../src/data/songs';

const SR = 22050;
const MEDIA_DIR = path.resolve(process.cwd(), process.env.MEDIA_DIR || 'media');

// deterministic hash -> int
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// minor-pentatonic-ish scales keyed by genre index, so same-genre songs share a flavor
const MAJOR = [0, 2, 4, 7, 9, 12, 14];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const PENTA = [0, 3, 5, 7, 10, 12];

function scaleFor(genre: string): number[] {
  const idx = GENRES.indexOf(genre);
  const pick = [MINOR, MAJOR, PENTA, MAJOR, MINOR, PENTA, MINOR, MAJOR, PENTA];
  return pick[((idx % pick.length) + pick.length) % pick.length];
}

function noteToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function difficultyLen(d: Difficulty): number {
  return d === 'easy' ? 8 : d === 'medium' ? 6 : 4;
}

function makeWav(song: { title: string; artist: string; genre: string; difficulty: Difficulty; year: number }) {
  const rng = mulberry32(hashStr(`${song.artist}|${song.title}|${song.year}`));
  const scale = scaleFor(song.genre);
  const root = 45 + Math.floor(rng() * 8); // C3..G3
  const totalLen = difficultyLen(song.difficulty);
  const nSamples = Math.floor(SR * totalLen);
  const buf = Buffer.alloc(nSamples * 2);

  // a short rhythmic melody line
  const steps = Math.max(4, Math.floor(totalLen * 4)); // 4 notes/sec
  const stepDur = totalLen / steps;
  let midiIdx = Math.floor(rng() * scale.length);

  for (let s = 0; s < steps; s++) {
    // choose next note: mostly step by 1 or 2 in scale, occasional jump
    const move = rng() < 0.6 ? (rng() < 0.5 ? 1 : -1) : (rng() < 0.5 ? 2 : -2);
    midiIdx = (midiIdx + move + scale.length) % scale.length;
    const midi = root + scale[midiIdx] + (rng() < 0.15 ? 12 : 0);
    const freq = noteToFreq(midi);
    const start = Math.floor(s * stepDur * SR);
    const dur = Math.floor(stepDur * SR * 0.9);
    // velocity pattern
    const accent = s % 4 === 0 ? 1.0 : 0.7;
    for (let i = 0; i < dur; i++) {
      const pos = start + i;
      if (pos >= nSamples) break;
      const t = i / SR;
      // simple two-oscillator "pluck": fundamental + soft 2nd harmonic, fast decay
      const env = Math.exp(-t * 9) * accent;
      const v =
        (Math.sin(2 * Math.PI * freq * t) * 0.6 +
          Math.sin(2 * Math.PI * freq * 2 * t) * 0.15) *
        env;
      const val = Math.max(-1, Math.min(1, v * 0.8));
      const sample = Math.round(val * 32767);
      buf.writeInt16LE(sample, pos * 2);
    }
  }

  // WAV header (mono, 16-bit)
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + buf.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(buf.length, 40);
  return { header, data: buf, totalLen };
}

function main() {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
  for (const song of SONGS) {
    // stable, human-ish filename slug
    const slug = (song.artist + '-' + song.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
    const { header, data } = makeWav(song);
    fs.writeFileSync(path.join(MEDIA_DIR, `${slug}.wav`), Buffer.concat([header, data]));
  }
  console.log(`Generated ${SONGS.length} clips into ${MEDIA_DIR}`);
}

main();
