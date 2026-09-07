import * as http from 'http';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';

import { prisma } from './lib/prisma';
import { verifyToken } from './lib/auth';
import { Engine } from './game/engine';

import authRouter from './routes/auth';
import songsRouter from './routes/songs';
import leaderboardRouter from './routes/leaderboard';
import adminRouter from './routes/admin';

const PORT = Number(process.env.PORT || 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';
const MEDIA_DIR = path.resolve(process.cwd(), process.env.MEDIA_DIR || 'media');

const app = express();
app.use(
  cors({
    origin: CLIENT_ORIGIN === '*' ? true : CLIENT_ORIGIN.split(','),
    credentials: true,
  })
);
app.use(express.json());
app.use('/media', express.static(MEDIA_DIR));

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.use('/api/auth', authRouter);
app.use('/api/songs', songsRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/admin', adminRouter);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN === '*' ? true : CLIENT_ORIGIN.split(','), credentials: true },
});
const engine = new Engine(io);

// track which socket belongs to which room
const socketRoom = new Map<string, string>();

io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  const user = token ? verifyToken(token) : null;
  if (!user) return next(new Error('unauthorized'));
  socket.data.user = user;
  next();
});

io.on('connection', (socket) => {
  const user = socket.data.user as { id: string; username: string };

  socket.on('room:create', async (settings: any, cb: any) => {
    try {
      const mode = settings?.mode === 'solo' ? 'solo' : 'multi';
      const { roomId, code } = await engine.createRoom(user.id, user.username, settings, mode);
      socket.join(roomId);
      socketRoom.set(socket.id, roomId);
      cb?.({ ok: true, roomId, code });
    } catch (e: any) {
      cb?.({ ok: false, error: e.message });
    }
  });

  socket.on('room:join', async (code: string, cb: any) => {
    try {
      const res = await engine.joinRoom(code, user.id, user.username);
      if (res.error) return cb?.({ ok: false, error: res.error });
      socket.join(res.roomId!);
      socketRoom.set(socket.id, res.roomId!);
      cb?.({ ok: true, roomId: res.roomId });
    } catch (e: any) {
      cb?.({ ok: false, error: e.message });
    }
  });

  socket.on('room:leave', async (roomId: string) => {
    if (socketRoom.get(socket.id) !== roomId) return;
    socket.leave(roomId);
    socketRoom.delete(socket.id);
    await engine.leaveRoom(roomId, user.id);
  });

  socket.on('room:update_settings', async (roomId: string, settings: any, cb: any) => {
    const res = await engine.updateSettings(roomId, user.id, settings);
    cb?.({ ok: !res.error, error: res.error });
  });

  socket.on('room:kick', async (roomId: string, targetId: string, cb: any) => {
    const res = await engine.kick(roomId, user.id, targetId);
    cb?.({ ok: !res.error, error: res.error });
  });

  socket.on('room:state', async (roomId: string, cb: any) => {
    const lobby = await engine.getLobby(roomId);
    cb?.({ ok: !!lobby, lobby });
  });

  // Reattach after a page refresh (without re-adding a seat)
  socket.on('room:rejoin', async (roomId: string, cb: any) => {
    const rp = await prisma.roomPlayer.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
    });
    if (!rp) return cb?.({ ok: false, error: 'not a member' });
    socket.join(roomId);
    socketRoom.set(socket.id, roomId);
    const lobby = await engine.getLobby(roomId);
    cb?.({ ok: true, lobby });
  });

  socket.on('room:start', async (roomId: string, cb: any) => {
    const res = await engine.startMatch(roomId, user.id);
    cb?.({ ok: !res.error, error: res.error });
  });

  socket.on('round:submit', async (roomId: string, payload: any, cb: any) => {
    const res = await engine.submitAnswer(roomId, user.id, payload);
    cb?.({ ok: !res.error, error: res.error });
  });

  socket.on('room:rematch', async (roomId: string, cb: any) => {
    const res = await engine.rematch(roomId, user.id);
    cb?.({ ok: !res.error, error: res.error });
  });

  socket.on('disconnect', () => {
    const roomId = socketRoom.get(socket.id);
    if (roomId) {
      engine.markDropped(roomId, user.id);
      socketRoom.delete(socket.id);
    }
  });
});

server.listen(PORT, () => {
  console.log(`[musika] server + socket.io on http://localhost:${PORT}`);
  console.log(`[musika] media dir: ${MEDIA_DIR}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
