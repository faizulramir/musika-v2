import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../lib/auth';

const router = Router();

type Range = 'all' | 'week';

// GET /api/leaderboard?range=all|week
router.get('/', requireAuth, async (req, res) => {
  const range = (req.query.range as Range) || 'all';
  const since =
    range === 'week' ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) : undefined;

  const top = await prisma.globalScore.findMany({
    where: since ? { createdAt: { gte: since } } : {},
    orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
    take: 50,
    include: { user: { select: { id: true, username: true, avatarUrl: true } } },
  });

  // rank map so ties share the same rank
  const rows = top.map((s, i) => {
    const prevScore = i > 0 ? top[i - 1].score : null;
    const rank = prevScore === s.score ? (top[i - 1] as any)._rank : i + 1;
    (s as any)._rank = rank;
    return { rank, score: s.score, username: s.user.username, isYou: s.userId === req.user!.id };
  });

  res.json({ leaderboard: rows, range });
});

export default router;
