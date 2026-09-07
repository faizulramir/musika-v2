export interface User {
  id: string;
  username: string;
  isAdmin?: boolean;
}

export interface LobbyPlayer {
  userId: string;
  username: string;
  seat: number;
}

export interface LobbyState {
  roomId: string;
  code: string;
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  hostId: string;
  settings: { rounds?: number; difficulty?: string; mode?: string };
  players: LobbyPlayer[];
}

export interface Option {
  id: string;
  label: string;
  isCorrect?: boolean;
}

export interface RoundStart {
  number: number;
  totalRounds: number;
  songId: string;
  audioPath: string;
  snippetStartS: number;
  snippetLenS: number;
  questionType: 'artist' | 'song';
  options: Option[];
  windowMs: number;
}

export interface LeaderRow {
  rank: number;
  userId: string;
  username: string;
  seat: number;
  score: number;
  streak: number;
  dropped?: boolean;
}

export interface PerUser {
  userId: string;
  username: string;
  points: number;
  total: number;
  streak: number;
  answered: boolean;
}

export interface GlobalRow {
  rank: number;
  score: number;
  username: string;
  isYou: boolean;
}

export interface SongPart {
  id: string;
  index: number;
  audioPath: string;
  lenS: number;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string | null;
  year: number | null;
  difficulty: 'easy' | 'medium' | 'hard';
  audioPath: string;
  sourceType?: 'demo' | 'uploaded';
  genre: { id: number; name: string };
  parts?: SongPart[];
}
