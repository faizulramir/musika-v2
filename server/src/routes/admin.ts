import { Router } from 'express';
import multer = require('multer');
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../lib/prisma';
import { requireAuth, requireAdmin } from '../lib/auth';
import { processMp3 } from '../lib/mp3';
import type { Difficulty } from '@prisma/client';

const router = Router();

const MEDIA_DIR = path.resolve(process.cwd(), process.env.MEDIA_DIR || 'media');
const UPLOAD_DIR = path.join(MEDIA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ok = /\.(mp3|m4a|wav|ogg|flac)$/i.test(file.originalname) || /audio\//.test(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('Only audio files are allowed'));
  },
});

// All admin routes require auth + admin
router.use(requireAuth, requireAdmin);

/** Process a single uploaded audio file into a Song (with parts). */
async function processOne(
  file: Express.Multer.File,
  genreOverride: string | null,
  difficulty: Difficulty
): Promise<{ id: string; title: string; artist: string; genre: string; parts: number }> {
  try {
    const result = await processMp3(file.path, genreOverride || 'Other', difficulty);
    const { meta, parts } = result;

    const genreName = genreOverride && genreOverride.length ? genreOverride : meta.genre || 'Other';
    const g = await prisma.genre.upsert({
      where: { name: genreName },
      update: {},
      create: { name: genreName },
    });

    const song = await prisma.song.create({
      data: {
        title: meta.title,
        artist: meta.artist,
        album: meta.album,
        year: meta.year,
        genreId: g.id,
        difficulty,
        audioPath: parts[0].audioPath,
        snippetStartS: 0,
        snippetLenS: parts[0].lenS,
        isActive: true,
        sourceType: 'uploaded',
        parts: {
          create: parts.map((p) => ({ index: p.index, audioPath: p.audioPath, startS: p.startS, lenS: p.lenS })),
        },
      },
      include: { parts: { orderBy: { index: 'asc' } } },
    });

    return { id: song.id, title: song.title, artist: song.artist, genre: g.name, parts: song.parts.length };
  } finally {
    // always clean up the raw temp upload (parts are already re-encoded into parts/)
    if (file.path && fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch {}
    }
  }
}

// POST /api/admin/songs  (multipart: files[] , genre?, difficulty?)  — batch upload
router.post('/songs', upload.array('files', 50), async (req, res) => {
  const files: Express.Multer.File[] =
    Array.isArray(req.files) && req.files.length ? req.files : req.file ? [req.file] : [];
  if (!files.length) return res.status(400).json({ error: 'No audio files provided' });

  const genreOverride = String(req.body.genre || '').trim() || null;
  const difficulty = (['easy', 'medium', 'hard'].includes(req.body.difficulty)
    ? req.body.difficulty
    : 'medium') as Difficulty;

  const results: {
    file: string;
    ok: boolean;
    error?: string;
    song?: { id: string; title: string; artist: string; genre: string; parts: number };
  }[] = [];

  // process sequentially (ffmpeg is CPU-bound; keeps memory bounded)
  for (const f of files) {
    const name = f.originalname || f.filename;
    try {
      const song = await processOne(f, genreOverride, difficulty);
      results.push({ file: name, ok: true, song });
    } catch (e: any) {
      results.push({ file: name, ok: false, error: e.message || 'Failed to process' });
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  res.json({ total: files.length, ok: okCount, failed: files.length - okCount, results });
});

// GET /api/admin/songs
router.get('/songs', async (_req, res) => {
  const songs = await prisma.song.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      genre: true,
      parts: { orderBy: { index: 'asc' }, select: { id: true, index: true, audioPath: true, lenS: true } },
    },
  });
  res.json({
    songs: songs.map((s) => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      album: s.album,
      year: s.year,
      genre: s.genre.name,
      difficulty: s.difficulty,
      isActive: s.isActive,
      sourceType: s.sourceType,
      parts: s.parts.map((p) => ({ index: p.index, audioPath: p.audioPath, lenS: p.lenS })),
      partCount: s.parts.length,
      createdAt: s.createdAt,
    })),
  });
});

// POST /api/admin/songs/:id/toggle
router.post('/songs/:id/toggle', async (req, res) => {
  const song = await prisma.song.findUnique({ where: { id: req.params.id } });
  if (!song) return res.status(404).json({ error: 'Not found' });
  const updated = await prisma.song.update({
    where: { id: song.id },
    data: { isActive: !song.isActive },
  });
  res.json({ id: updated.id, isActive: updated.isActive });
});

// DELETE /api/admin/songs/:id
router.delete('/songs/:id', async (req, res) => {
  const song = await prisma.song.findUnique({
    where: { id: req.params.id },
    include: { parts: true },
  });
  if (!song) return res.status(404).json({ error: 'Not found' });

  // delete part files
  for (const p of song.parts) {
    try {
      const abs = path.resolve(process.cwd(), p.audioPath.replace(/^media\//, 'media/'));
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    } catch {}
  }
  // remove part dir if empty
  try {
    const dir = path.dirname(path.resolve(process.cwd(), song.parts[0]?.audioPath.replace(/^media\//, 'media/') || ''));
    if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  } catch {}

  await prisma.song.delete({ where: { id: song.id } });
  res.json({ ok: true });
});

export default router;
