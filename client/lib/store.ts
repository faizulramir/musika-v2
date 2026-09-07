import { create } from 'zustand';
import type { User, LobbyState, RoundStart, LeaderRow, PerUser } from './types';
import { setToken } from './api';
import { getSocket } from './socket';
import { audio } from './audio';

export type Phase = 'idle' | 'countdown' | 'round' | 'reveal' | 'end';

interface Reveal {
  number: number;
  correctOptionId: string;
  perUser: PerUser[];
}

interface GameStore {
  // auth
  user: User | null;
  authLoading: boolean;
  setAuth: (user: User | null) => void;
  setAuthLoading: (b: boolean) => void;

  // room / lobby
  roomId: string | null;
  lobby: LobbyState | null;
  setRoomId: (id: string | null) => void;
  setLobby: (l: LobbyState | null) => void;

  // match
  phase: Phase;
  round: RoundStart | null;
  roundEndsAt: number;
  totalRounds: number;
  leaderboard: LeaderRow[];
  reveal: Reveal | null;
  answered: boolean;
  replayUsed: number;
  setReplayUsed: (n: number) => void;
  notice: string | null;
  setNotice: (m: string | null) => void;

  // socket-driven
  bindSocket: () => void;
  resetMatch: () => void;
  onLobbyUpdate: (l: LobbyState) => void;
  onMatchStarted: (p: { totalRounds: number; countdownMs: number }) => void;
  onRoundStart: (p: RoundStart) => void;
  onRoundScored: (p: { number: number; correctOptionId: string; perUser: PerUser[]; leaderboard: LeaderRow[] }) => void;
  onMatchEnd: (p: { leaderboard: LeaderRow[] }) => void;
  onAnswered: () => void;
  onRoomDissolved: () => void;
  onSocketError: (p: { message: string }) => void;
}

export const useGame = create<GameStore>((set, get) => ({
  user: null,
  authLoading: true,
  setAuthLoading: (b) => set({ authLoading: b }),
  setAuth: (user) => {
    if (!user) setToken(null);
    set({ user });
  },

  roomId: null,
  lobby: null,
  setRoomId: (id) => set({ roomId: id }),
  setLobby: (lobby) => set({ lobby, roomId: lobby ? lobby.roomId : get().roomId }),

  phase: 'idle',
  round: null,
  roundEndsAt: 0,
  totalRounds: 0,
  leaderboard: [],
  reveal: null,
  answered: false,
  replayUsed: 0,
  setReplayUsed: (n) => set({ replayUsed: n }),
  notice: null,
  setNotice: (m) => set({ notice: m }),

  resetMatch: () =>
    set({
      phase: 'idle',
      round: null,
      roundEndsAt: 0,
      totalRounds: 0,
      leaderboard: [],
      reveal: null,
      answered: false,
      replayUsed: 0,
    }),

  onLobbyUpdate: (lobby) => set({ lobby }),

  onMatchStarted: (p) =>
    set({
      phase: 'countdown',
      totalRounds: p.totalRounds,
      leaderboard: [],
      reveal: null,
      answered: false,
      replayUsed: 0,
      roundEndsAt: Date.now() + p.countdownMs,
    }),

  onRoundStart: (p) => {
    audio.play(p.audioPath);
    set({
      phase: 'round',
      round: p,
      roundEndsAt: Date.now() + p.windowMs,
      answered: false,
      replayUsed: 0,
      reveal: null,
    });
  },

  onRoundScored: (p) => {
    audio.stop();
    set({ phase: 'reveal', reveal: p, leaderboard: p.leaderboard });
  },

  onMatchEnd: (p) => {
    audio.stop();
    set({ phase: 'end', leaderboard: p.leaderboard, reveal: null, round: null });
  },

  onAnswered: () => set({ answered: true }),

  onRoomDissolved: () => {
    audio.stop();
    get().resetMatch();
    set({ roomId: null, lobby: null });
  },

  onSocketError: (p) => {
    audio.stop();
    get().resetMatch();
    set({ notice: p.message, phase: 'idle' });
  },

  bindSocket: () => {
    const s = getSocket();
    const st = get();
    s.on('lobby_update', (l: LobbyState) => st.onLobbyUpdate(l));
    s.on('match_started', (p: any) => st.onMatchStarted(p));
    s.on('round_start', (p: RoundStart) => st.onRoundStart(p));
    s.on('round_scored', (p: any) => st.onRoundScored(p));
    s.on('match_end', (p: any) => st.onMatchEnd(p));
    s.on('answer_received', (p: any) => {
      if (get().user && p.userId === get().user!.id) st.onAnswered();
    });
    s.on('room_dissolved', () => st.onRoomDissolved());
    s.on('error', (p: any) => {
      // only react to server-emitted { message } payloads, not socket.io client errors
      if (!p || typeof p !== 'object' || typeof p.message !== 'string') return;
      const msg = p.message;
      if (['disconnected', 'server error', 'transport error'].includes(msg)) return;
      st.onSocketError({ message: msg });
    });
  },
}));
