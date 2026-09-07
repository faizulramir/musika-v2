import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../lib/auth';
import type { Difficulty } from '@prisma/client';

const router = Router();

// GET /api/songs?genre=&difficulty=
router.get('/', requireAuth, async (req, res) => {
  const { genre, difficulty } = req.query;
  const where = {
    isActive: true,
    ...(difficulty ? { difficulty: difficulty as Difficulty } : {}),
  };
  let songs = await prisma.song.findMany({
    where,
    include: {
      genre: true,
      parts: { orderBy: { index: 'asc' }, select: { id: true, index: true, audioPath: true, lenS: true } },
    },
    orderBy: { year: 'desc' },
  });
  if (genre) songs = songs.filter((s) => s.genre.name === genre);
  // don't leak audio start/len? keep it, client needs it for playback
  res.json({ songs });
});

// GET /api/genres
router.get('/genres', requireAuth, async (_req, res) => {
  const genres = await prisma.genre.findMany({ orderBy: { name: 'asc' } });
  res.json({ genres });
});

export default router;
