export const BASE_POINTS = 100;
export const WINDOW_MS = 15000;
export const REPLAY_PENALTY = 15;
export const MAX_STREAK_MULT = 2.0;

/**
 * Score a correct answer.
 * points = (BASE + speedBonus) * streakMultiplier
 *  - speedBonus decays linearly from 100 -> 0 over the 15s window
 *  - each replay used subtracts REPLAY_PENALTY from the bonus (floor 0)
 *  - streakMultiplier = 1 + 0.1*(streak-1), capped at MAX_STREAK_MULT
 */
export function computeScore(
  timeMs: number,
  replayUsed: number,
  prevStreak: number
): { points: number; newStreak: number } {
  const newStreak = prevStreak + 1;
  const t = Math.max(0, Math.min(timeMs, WINDOW_MS)) / 1000;
  let speedBonus = Math.round(100 * (1 - t / (WINDOW_MS / 1000)));
  speedBonus = Math.max(0, speedBonus - replayUsed * REPLAY_PENALTY);
  const mult = Math.min(MAX_STREAK_MULT, 1 + 0.1 * (newStreak - 1));
  const points = Math.round((BASE_POINTS + speedBonus) * mult);
  return { points, newStreak };
}
