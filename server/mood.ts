/**
 * claude-den mood engine — calculates mood from recent events
 *
 * Mood is derived state computed from the last 5 events.
 * No persistent storage needed — recomputed on every render.
 */

export type Mood = "celebrating" | "happy" | "focused" | "stressed" | "idle";
export type MoodColor = "gold" | "green" | "blue" | "red" | "gray";

export interface MoodResult {
  mood: Mood;
  color: MoodColor;
  emoji: string;
  xpMultiplier: number;
}

interface EventLike {
  event: string;
  ts: number;
}

const ERROR_EVENTS = new Set([
  "error", "test-fail", "type-error", "build-fail", "lint-fail",
]);

const SUCCESS_EVENTS = new Set([
  "tests-pass", "single-test", "build-success", "lint-pass",
  "bug-fix", "type-error-fixed", "coverage-increase",
]);

const COMMIT_EVENTS = new Set([
  "commit", "branch-created",
]);

export function calculateMood(recentEvents: EventLike[]): MoodResult {
  const last5 = recentEvents.slice(-5);

  if (last5.length === 0) {
    return { mood: "idle", color: "gray", emoji: "\u{1F6CC}", xpMultiplier: 1 };
  }

  const errors = last5.filter((e) => ERROR_EVENTS.has(e.event)).length;
  const successes = last5.filter((e) => SUCCESS_EVENTS.has(e.event)).length;
  const commits = last5.filter((e) => COMMIT_EVENTS.has(e.event)).length;

  // Celebrating: commits with no errors
  if (commits > 0 && errors === 0) {
    return { mood: "celebrating", color: "gold", emoji: "\u{1F389}", xpMultiplier: 1.1 };
  }

  // Stressed: 3+ errors in last 5
  if (errors >= 3) {
    return { mood: "stressed", color: "red", emoji: "\u{1F630}", xpMultiplier: 1 };
  }

  // Happy: 3+ successes with no errors
  if (successes >= 3 && errors === 0) {
    return { mood: "happy", color: "green", emoji: "\u{1F60A}", xpMultiplier: 1 };
  }

  // Default: focused
  return { mood: "focused", color: "blue", emoji: "\u{1F4BB}", xpMultiplier: 1 };
}

// ─── ANSI color for mood ────────────────────────────────────────────────────

export function moodAnsiColor(color: MoodColor): string {
  switch (color) {
    case "gold":  return "\x1b[38;2;255;193;7m";
    case "green": return "\x1b[38;2;78;186;101m";
    case "blue":  return "\x1b[38;2;100;149;237m";
    case "red":   return "\x1b[38;2;255;85;85m";
    case "gray":  return "\x1b[38;2;128;128;128m";
  }
}
