import { Server, Socket } from 'socket.io';
import { prisma } from '../lib/prisma';
import { buildQuestion, type Option } from '../lib/questions';
import { computeScore, WINDOW_MS } from '../lib/scoring';
import type { Room, Song, Difficulty, RoomMode } from '@prisma/client';

const COUNTDOWN_MS = 3000;
const REVEAL_MS = 3500;
const MAX_PLAYERS = 8;
const MIN_PLAYERS = 1; // allow solo (host only) for multi too

interface PlayerState {
  userId: string;
  username: string;
  seat: number;
  score: number;
  streak: number;
  answered: boolean;
  dropped: boolean;
  lastRoundPoints: number;
}

interface PreparedRound {
  songId: string;
  audioPath: string;
  snippetStartS: number;
  snippetLenS: number;
  questionType: 'artist' | 'song';
  options: { id: string; label: string }[];
  correctOptionId: string;
}

interface RoomState {
  roomId: string;
  mode: RoomMode;
  players: Map<string, PlayerState>;
  hostId: string;
  totalRounds: number;
  currentRound: number;
  rounds: PreparedRound[];
  roundStartAt: number;
  answers: Map<string, { optionId: string; timeMs: number; replayUsed: number }>;
  roundTimer: NodeJS.Timeout | null;
  revealTimer: NodeJS.Timeout | null;
  finalized: boolean;
}

function genCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 4; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

function leaderboardOf(players: PlayerState[]) {
  return [...players]
    .sort((a, b) => b.score - a.score || a.username.localeCompare(b.username))
    .map((p, i) => ({
      rank: i + 1,
      userId: p.userId,
      username: p.username,
      seat: p.seat,
      score: p.score,
      streak: p.streak,
      dropped: p.dropped,
    }));
}

export class Engine {
  private io: Server;
  private state = new Map<string, RoomState>();

  constructor(io: Server) {
    this.io = io;
  }

  private room(roomId: string) {
    return this.state.get(roomId);
  }

  private emit(roomId: string, event: string, payload: any) {
    this.io.to(roomId).emit(event, payload);
  }

  // ---------- lobby ----------

  async createRoom(hostId: string, hostUsername: string, settings: any, mode: RoomMode = 'multi') {
    const code = await this.uniqueCode();
    const room = await prisma.room.create({
      data: {
        code,
        hostId,
        mode,
        settings: settings || {},
        status: 'waiting',
      },
    });
    await prisma.roomPlayer.create({
      data: { roomId: room.id, userId: hostId, seat: 0, status: 'waiting' },
    });
    this.state.set(room.id, {
      roomId: room.id,
      mode,
      players: new Map([
        [hostId, { userId: hostId, username: hostUsername, seat: 0, score: 0, streak: 0, answered: false, dropped: false, lastRoundPoints: 0 }],
      ]),
      hostId,
      totalRounds: 8,
      currentRound: 0,
      rounds: [],
      roundStartAt: 0,
      answers: new Map(),
      roundTimer: null,
      revealTimer: null,
      finalized: false,
    });
    await this.refreshLobby(room.id);
    return { roomId: room.id, code: room.code };
  }

  private async uniqueCode(): Promise<string> {
    for (let i = 0; i < 20; i++) {
      const code = genCode();
      const exists = await prisma.room.findUnique({ where: { code } });
      if (!exists) return code;
    }
    return genCode();
  }

  async joinRoom(code: string, userId: string, username: string): Promise<{ error?: string; roomId?: string }> {
    const room = await prisma.room.findUnique({ where: { code } });
    if (!room) return { error: 'Room not found' };
    if (room.status !== 'waiting') return { error: 'Room already started' };
    const existing = await prisma.roomPlayer.findUnique({ where: { roomId_userId: { roomId: room.id, userId } } });
    if (existing) return { error: 'Already in this room' };
    const count = await prisma.roomPlayer.count({ where: { roomId: room.id } });
    if (count >= MAX_PLAYERS) return { error: 'Room is full' };

    await prisma.roomPlayer.create({
      data: { roomId: room.id, userId, seat: count, status: 'waiting' },
    });
    const st = this.state.get(room.id);
    if (st) {
      st.players.set(userId, { userId, username, seat: count, score: 0, streak: 0, answered: false, dropped: false, lastRoundPoints: 0 });
    }
    await this.refreshLobby(room.id);
    return { roomId: room.id };
  }

  async leaveRoom(roomId: string, userId: string) {
    await prisma.roomPlayer.deleteMany({ where: { roomId, userId } });
    const st = this.room(roomId);
    if (st) st.players.delete(userId);
    // if host leaves, promote next seat (or dissolve)
    if (st && st.hostId === userId) {
      const next = [...st.players.values()].sort((a, b) => a.seat - b.seat)[0];
      if (!next) {
        await this.dissolveRoom(roomId);
        return;
      }
      st.hostId = next.userId;
      await prisma.room.update({ where: { id: roomId }, data: { hostId: next.userId } });
    }
    await this.refreshLobby(roomId);
  }

  private async dissolveRoom(roomId: string) {
    this.clearTimers(roomId);
    this.state.delete(roomId);
    await prisma.room.deleteMany({ where: { id: roomId } }).catch(() => {});
    this.io.to(roomId).emit('room_dissolved', {});
  }

  // Host "play again": reset a finished room back to waiting (players kept)
  async rematch(roomId: string, hostId: string) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.hostId !== hostId) return { error: 'not host' };
    if (room.status === 'playing') return { error: 'match in progress' };
    this.clearTimers(roomId);
    const st = this.room(roomId);
    if (st) {
      for (const p of st.players.values()) {
        p.score = 0;
        p.streak = 0;
        p.answered = false;
        p.lastRoundPoints = 0;
        p.dropped = false;
      }
      st.currentRound = 0;
      st.finalized = false;
    }
    await prisma.room.update({ where: { id: roomId }, data: { status: 'waiting' } });
    await prisma.roomPlayer.updateMany({ where: { roomId }, data: { score: 0, streak: 0, status: 'waiting' } });
    await this.refreshLobby(roomId);
    return {};
  }

  async updateSettings(roomId: string, hostId: string, settings: any) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.hostId !== hostId) return { error: 'not host' };
    if (room.status !== 'waiting') return { error: 'already started' };
    await prisma.room.update({ where: { id: roomId }, data: { settings } });
    await this.refreshLobby(roomId);
    return {};
  }

  async kick(roomId: string, hostId: string, targetId: string) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.hostId !== hostId) return { error: 'not host' };
    if (room.status !== 'waiting') return { error: 'already started' };
    if (targetId === hostId) return { error: 'cannot kick self' };
    await prisma.roomPlayer.deleteMany({ where: { roomId, userId: targetId } });
    const st = this.room(roomId);
    if (st) st.players.delete(targetId);
    await this.refreshLobby(roomId);
    return {};
  }

  private async buildLobby(roomId: string) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { players: { include: { user: { select: { id: true, username: true } } }, orderBy: { seat: 'asc' } } },
    });
    if (!room) return null;
    return {
      roomId,
      code: room.code,
      status: room.status,
      hostId: room.hostId,
      settings: room.settings,
      players: room.players.map((p) => ({
        userId: p.userId,
        username: p.user.username,
        seat: p.seat,
      })),
    };
  }

  async getLobby(roomId: string) {
    return this.buildLobby(roomId);
  }

  private async refreshLobby(roomId: string) {
    const lobby = await this.buildLobby(roomId);
    if (lobby) this.emit(roomId, 'lobby_update', lobby);
  }

  // ---------- match ----------

  async startMatch(roomId: string, hostId: string) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { players: { where: { status: 'waiting' }, orderBy: { seat: 'asc' } } },
    });
    if (!room) return { error: 'room not found' };
    if (room.hostId !== hostId) return { error: 'only host can start' };
    if (room.status !== 'waiting') return { error: 'already started' };
    if (room.players.length < MIN_PLAYERS) return { error: 'need at least 1 player' };

    const settings = (room.settings as any) || {};
    const totalRounds = [5, 8, 12].includes(settings.rounds) ? settings.rounds : 8;
    const difficulty: Difficulty = ['easy', 'medium', 'hard'].includes(settings.difficulty)
      ? settings.difficulty
      : 'medium';

    // pick distinct songs from the chosen difficulty tier (fall back to all if too few)
    const where: any = { isActive: true, difficulty };
    let pool = await prisma.song.findMany({ where, include: { parts: { orderBy: { index: 'asc' } } } });
    if (pool.length < totalRounds)
      pool = await prisma.song.findMany({
        where: { isActive: true },
        include: { parts: { orderBy: { index: 'asc' } } },
      });

    if (pool.length === 0) {
      const msg = 'No songs available yet. Ask the admin to upload songs first.';
      this.io.in(room.id).emit('error', { message: msg });
      return { error: msg };
    }
    const allSongs = await prisma.song.findMany({ where: { isActive: true } });
    const genreNames = new Map(
      (await prisma.genre.findMany()).map((g) => [g.id, g.name])
    );

    // sample totalRounds distinct songs
    const chosen: (Song & { parts: { id: string; index: number; audioPath: string; lenS: number }[] })[] = [];
    const available = [...pool];
    while (chosen.length < totalRounds && available.length) {
      const i = Math.floor(Math.random() * available.length);
      chosen.push(available.splice(i, 1)[0]);
    }

    const prepared: PreparedRound[] = chosen.map((song) => {
      const q = buildQuestion(song, allSongs, genreNames.get(song.genreId) || 'Pop');
      // choose a random 10s part for uploaded songs; fall back to the single snippet for demo songs
      const hasParts = song.parts && song.parts.length > 0;
      const pick = hasParts ? song.parts[Math.floor(Math.random() * song.parts.length)] : null;
      return {
        songId: song.id,
        audioPath: pick ? pick.audioPath : song.audioPath,
        snippetStartS: pick ? 0 : song.snippetStartS,
        snippetLenS: pick ? pick.lenS : song.snippetLenS,
        questionType: q.questionType,
        // never leak the answer to clients
        options: q.options.map((o) => ({ id: o.id, label: o.label })),
        correctOptionId: q.correctOptionId,
      };
    });

    // persist match
    const match = await prisma.match.create({ data: { roomId } });
    for (let i = 0; i < prepared.length; i++) {
      const rd = prepared[i];
      await prisma.round.create({
        data: {
          matchId: match.id,
          number: i + 1,
          songId: rd.songId,
          questionType: rd.questionType,
          options: rd.options,
          correctOptionId: rd.correctOptionId,
        },
      });
    }

    const st = this.state.get(roomId);
    if (!st) return { error: 'engine state missing' };
    st.totalRounds = prepared.length;
    st.currentRound = 0;
    st.rounds = prepared;
    for (const p of room.players) {
      st.players.get(p.userId)!.score = 0;
      st.players.get(p.userId)!.streak = 0;
    }
    await prisma.room.update({ where: { id: roomId }, data: { status: 'playing' } });
    await prisma.roomPlayer.updateMany({
      where: { roomId, status: 'waiting' },
      data: { status: 'playing' },
    });

    this.emit(roomId, 'match_started', {
      totalRounds: prepared.length,
      countdownMs: COUNTDOWN_MS,
    });

    // begin first round after countdown
    st.revealTimer = setTimeout(() => this.driveRound(roomId), COUNTDOWN_MS);
    return {};
  }

  private driveRound(roomId: string) {
    const st = this.room(roomId);
    if (!st || st.currentRound >= st.totalRounds) {
      if (st) this.endMatch(roomId);
      return;
    }
    st.currentRound += 1;
    const rd = st.rounds[st.currentRound - 1];
    st.roundStartAt = Date.now();
    st.answers.clear();
    for (const p of st.players.values()) {
      p.answered = false;
      p.lastRoundPoints = 0;
    }
    st.finalized = false;

    this.emit(roomId, 'round_start', {
      number: st.currentRound,
      totalRounds: st.totalRounds,
      songId: rd.songId,
      audioPath: rd.audioPath,
      snippetStartS: rd.snippetStartS,
      snippetLenS: rd.snippetLenS,
      questionType: rd.questionType,
      options: rd.options,
      windowMs: WINDOW_MS,
    });

    st.roundTimer = setTimeout(() => this.finalizeRound(roomId), WINDOW_MS);
  }

  async submitAnswer(roomId: string, userId: string, payload: { optionId: string; replayUsed?: number }) {
    const st = this.room(roomId);
    if (!st) return { error: 'no match' };
    const player = st.players.get(userId);
    if (!player || player.dropped || player.answered) return { error: 'already answered' };
    const rd = st.rounds[st.currentRound - 1];
    if (!rd) return { error: 'no round' };

    const timeMs = Math.min(Date.now() - st.roundStartAt, WINDOW_MS);
    const replayUsed = Math.max(0, Math.min(2, payload.replayUsed || 0));
    const isCorrect = payload.optionId === rd.correctOptionId;

    let points = 0;
    let newStreak = 0;
    if (isCorrect) {
      const r = computeScore(timeMs, replayUsed, player.streak);
      points = r.points;
      newStreak = r.newStreak;
    }

    player.answered = true;
    player.score += points;
    player.streak = newStreak;
    player.lastRoundPoints = points;
    st.answers.set(userId, { optionId: payload.optionId, timeMs, replayUsed });

    // persist (fire and forget)
    const roundDb = await prisma.round.findFirst({
      where: { match: { roomId }, number: st.currentRound },
    });
    if (roundDb) {
      await prisma.answer
        .upsert({
          where: { roundId_userId: { roundId: roundDb.id, userId } },
          create: {
            roundId: roundDb.id,
            userId,
            selectedOptionId: payload.optionId,
            isCorrect,
            timeMs,
            points,
            replayUsed,
          },
          update: {
            selectedOptionId: payload.optionId,
            isCorrect,
            timeMs,
            points,
            replayUsed,
          },
        })
        .catch(() => {});
    }

    this.emit(roomId, 'answer_received', { userId, username: player.username, correct: isCorrect });

    // early finalize when all non-dropped players answered
    const active = [...st.players.values()].filter((p) => !p.dropped);
    if (active.every((p) => p.answered)) {
      if (st.roundTimer) clearTimeout(st.roundTimer);
      this.finalizeRound(roomId);
    }
    return {};
  }

  private finalizeRound(roomId: string) {
    const st = this.room(roomId);
    if (!st || st.finalized) return;
    st.finalized = true;
    if (st.roundTimer) clearTimeout(st.roundTimer);

    const rd = st.rounds[st.currentRound - 1];
    const perUser: any[] = [];
    for (const p of st.players.values()) {
      if (p.dropped) continue;
      perUser.push({
        userId: p.userId,
        username: p.username,
        points: p.lastRoundPoints,
        total: p.score,
        streak: p.streak,
        answered: p.answered,
      });
    }

    // persist player scores
    for (const p of st.players.values()) {
      prisma.roomPlayer
        .update({
          where: { roomId_userId: { roomId, userId: p.userId } },
          data: { score: p.score, streak: p.streak },
        })
        .catch(() => {});
    }

    this.emit(roomId, 'round_scored', {
      number: st.currentRound,
      correctOptionId: rd.correctOptionId,
      perUser,
      leaderboard: leaderboardOf([...st.players.values()]),
    });

    st.revealTimer = setTimeout(() => this.driveRound(roomId), REVEAL_MS);
  }

  private async endMatch(roomId: string) {
    const st = this.room(roomId);
    if (!st) return;
    const board = leaderboardOf([...st.players.values()]);

    // persist global scores + finish players
    for (const p of st.players.values()) {
      prisma.roomPlayer
        .update({
          where: { roomId_userId: { roomId, userId: p.userId } },
          data: { score: p.score, status: 'finished' },
        })
        .catch(() => {});
      prisma.globalScore
        .create({ data: { userId: p.userId, score: p.score, mode: st.mode } })
        .catch(() => {});
    }
    await prisma.room.update({ where: { id: roomId }, data: { status: 'finished' } }).catch(() => {});

    this.emit(roomId, 'match_end', { leaderboard: board });
    this.clearTimers(roomId);
    this.state.delete(roomId);
  }

  private clearTimers(roomId: string) {
    const st = this.room(roomId);
    if (!st) return;
    if (st.roundTimer) clearTimeout(st.roundTimer);
    if (st.revealTimer) clearTimeout(st.revealTimer);
  }

  // mark a player dropped (disconnected) without ending the match
  markDropped(roomId: string, userId: string) {
    const st = this.room(roomId);
    if (!st) return;
    const p = st.players.get(userId);
    if (p && !p.dropped) {
      p.dropped = true;
      this.emit(roomId, 'player_dropped', { userId });
    }
  }
}
