import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import type { Request, Response, NextFunction } from 'express';

const SECRET = process.env.JWT_SECRET || 'musika-dev-secret';

function adminList(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** True if this user (email and/or username) is in the ADMIN_EMAILS list. */
export function isAllowedAdmin(email: string | null, username: string): boolean {
  const list = adminList();
  if (list.length === 0) return false;
  const e = (email || '').toLowerCase();
  const u = (username || '').toLowerCase();
  return list.includes(e) || list.includes(u);
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; username: string; isAdmin: boolean };
    }
  }
}

export function signToken(user: { id: string; username: string; email?: string | null }): string {
  return jwt.sign(
    { id: user.id, username: user.username, isAdmin: isAllowedAdmin(user.email || null, user.username) },
    SECRET,
    { expiresIn: '30d' }
  );
}

export function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export function extractToken(req: Request): string | null {
  const h = req.headers.authorization;
  if (h && h.startsWith('Bearer ')) return h.slice(7);
  return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, SECRET) as { id: string; username: string; isAdmin?: boolean };
    req.user = { id: payload.id, username: payload.username, isAdmin: !!payload.isAdmin };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  next();
}

export function verifyToken(token: string): { id: string; username: string; isAdmin: boolean } | null {
  try {
    const p = jwt.verify(token, SECRET) as { id: string; username: string; isAdmin?: boolean };
    return { id: p.id, username: p.username, isAdmin: !!p.isAdmin };
  } catch {
    return null;
  }
}
