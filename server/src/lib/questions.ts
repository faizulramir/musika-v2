import type { Song, Genre, QuestionType } from '@prisma/client';

export interface Option {
  id: string; // 'a' | 'b' | 'c' | 'd'
  label: string;
  isCorrect: boolean;
}

const LETTERS = ['a', 'b', 'c', 'd'];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build a 4-option question for a round.
 * - artist: correct artist + 3 distractors (same-genre artists preferred)
 * - song:   correct title + 3 distractor titles by the SAME artist (harder)
 */
export function buildQuestion(
  song: Song,
  allSongs: Song[],
  genreName: string
): { questionType: QuestionType; options: Option[]; correctOptionId: string } {
  // alternate question type but bias toward artist; deterministic-ish per song
  const questionType: QuestionType =
    song.title.length % 2 === 0 ? 'artist' : 'song';

  let correct: string;
  let distractorPool: string[];

  if (questionType === 'artist') {
    correct = song.artist;
    const sameGenre = allSongs
      .filter((s) => s.genreId === song.genreId && s.artist !== song.artist)
      .map((s) => s.artist);
    const others = allSongs.filter((s) => s.artist !== song.artist).map((s) => s.artist);
    distractorPool = dedup([...shuffle(sameGenre), ...shuffle(others)]).filter((x) => x !== correct);
  } else {
    correct = song.title;
    const sameArtist = allSongs
      .filter((s) => s.artist === song.artist && s.title !== song.title)
      .map((s) => s.title);
    const others = allSongs.filter((s) => s.title !== song.title).map((s) => s.title);
    distractorPool = dedup([...shuffle(sameArtist), ...shuffle(others)]).filter((x) => x !== correct);
  }

  const distractors = distractorPool.slice(0, 3);
  // if we can't fill 3 distractors (small library), fall back to generic labels
  const fillers = ['Unknown Artist', 'Hidden Track', 'Mystery Song'];
  let i = 0;
  while (distractors.length < 3 && i < fillers.length) distractors.push(fillers[i++]);

  const labels = shuffle([correct, ...distractors.slice(0, 3)]);
  const options: Option[] = labels.map((label, idx) => ({
    id: LETTERS[idx],
    label,
    isCorrect: label === correct,
  }));
  const correctOptionId = options.find((o) => o.isCorrect)!.id;

  return { questionType, options, correctOptionId };
}

function dedup(arr: string[]): string[] {
  return Array.from(new Set(arr));
}
