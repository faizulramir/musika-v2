import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { signToken, hashPassword, verifyPassword, requireAuth, isAllowedAdmin } from '../lib/auth';

const router = Router();

function userPayload(p: { id: string; username: string; email: string | null }) {
  return {
    id: p.id,
    username: p.username,
    isAdmin: isAllowedAdmin(p.email, p.username),
  };
}

// POST /api/auth/register  { username, password, email? }
router.post('/register', async (req, res) => {
  const { username, password, email } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  if (String(username).length < 2 || String(username).length > 32) {
    return res.status(400).json({ error: 'username must be 2-32 chars' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'password must be at least 6 chars' });
  }
  const where: any = { username };
  if (email) where.OR = [{ username }, { email }];
  const existing = await prisma.profile.findFirst({ where });
  if (existing) return res.status(409).json({ error: 'username or email already taken' });

  let profile;
  try {
    profile = await prisma.profile.create({
      data: {
        username: String(username),
        email: email || null,
        passwordHash: await hashPassword(String(password)),
      },
    });
  } catch (e: any) {
    if (e?.code === 'P2002') return res.status(409).json({ error: 'username or email already taken' });
    throw e;
  }
  const token = signToken({ id: profile.id, username: profile.username, email: profile.email });
  res.json({ token, user: userPayload(profile) });
});

// POST /api/auth/login  { usernameOrEmail, password }
router.post('/login', async (req, res) => {
  const { usernameOrEmail, password } = req.body || {};
  if (!usernameOrEmail || !password) {
    return res.status(400).json({ error: 'credentials required' });
  }
  const profile = await prisma.profile.findFirst({
    where: { OR: [{ username: String(usernameOrEmail) }, { email: String(usernameOrEmail) }] },
  });
  if (!profile) return res.status(401).json({ error: 'invalid credentials' });
  const ok = await verifyPassword(String(password), profile.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });
  const token = signToken({ id: profile.id, username: profile.username, email: profile.email });
  res.json({ token, user: userPayload(profile) });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

export default router;
