/**
 * Kodama streak system — daily coding streaks with shield protection
 *
 * Unlocks at Level 8. Streak Shield at Level 12.
 * Any day with 1+ commit = streak continues.
 */

import { loadAchievements, saveAchievements } from "./achievements.ts";
import { isUnlocked } from "./unlocks.ts";

// ─── Streak update ──────────────────────────────────────────────────────────

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  isNewDay: boolean;
  streakBroken: boolean;
  shieldUsed: boolean;
}

export function updateStreak(level: number): StreakResult {
  const data = loadAchievements();
  const today = new Date().toISOString().slice(0, 10); // "2026-04-12"
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const result: StreakResult = {
    currentStreak: data.counters.currentStreak,
    longestStreak: data.counters.longestStreak,
    isNewDay: false,
    streakBroken: false,
    shieldUsed: false,
  };

  // Same day — no change
  if (data.counters.lastActiveDate === today) {
    return result;
  }

  result.isNewDay = true;

  // Check if streak tracking is unlocked
  if (!isUnlocked(level, "slot-2")) {
    // Streaks unlock at L10 (same level as slot-2)
    data.counters.lastActiveDate = today;
    saveAchievements(data);
    return result;
  }

  // Yesterday was active — streak continues
  if (data.counters.lastActiveDate === yesterday) {
    data.counters.currentStreak++;
  }
  // Missed a day — check shield
  else if (data.counters.lastActiveDate && data.counters.lastActiveDate !== today) {
    const missedDays = daysBetween(data.counters.lastActiveDate, today);

    if (missedDays <= 2 && canUseShield(level, data)) {
      // Shield absorbs the miss
      result.shieldUsed = true;
      data.counters.currentStreak++;
      // Mark shield as used this week
      (data.counters as any).streakShieldDate = today;
    } else {
      // Streak broken
      result.streakBroken = true;
      data.counters.currentStreak = 1; // today counts as day 1
    }
  }
  // First ever active day
  else {
    data.counters.currentStreak = 1;
  }

  // Update longest
  if (data.counters.currentStreak > data.counters.longestStreak) {
    data.counters.longestStreak = data.counters.currentStreak;
  }

  data.counters.lastActiveDate = today;
  result.currentStreak = data.counters.currentStreak;
  result.longestStreak = data.counters.longestStreak;

  saveAchievements(data);
  return result;
}

// ─── Shield logic ───────────────────────────────────────────────────────────

function canUseShield(level: number, data: any): boolean {
  if (!isUnlocked(level, "streak-shield")) return false;

  const shieldDate = (data.counters as any).streakShieldDate ?? "";
  if (!shieldDate) return true;

  // Shield recharges weekly (same ISO week = already used)
  const now = new Date();
  const shieldWeek = getISOWeek(new Date(shieldDate));
  const currentWeek = getISOWeek(now);
  return shieldWeek !== currentWeek;
}

function getISOWeek(d: Date): string {
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${weekNum}`;
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return Math.floor(Math.abs(b - a) / 86400000);
}

// ─── Render ─────────────────────────────────────────────────────────────────

export function renderStreak(level: number): string {
  const data = loadAchievements();
  const streak = data.counters.currentStreak;
  const longest = data.counters.longestStreak;
  const hasShield = isUnlocked(level, "streak-shield");
  const shieldDate = (data.counters as any).streakShieldDate ?? "";
  const shieldAvailable = hasShield && (!shieldDate || getISOWeek(new Date(shieldDate)) !== getISOWeek(new Date()));

  const flame = streak >= 30 ? "\uD83D\uDD25\uD83D\uDD25\uD83D\uDD25" : streak >= 7 ? "\uD83D\uDD25" : "";

  const lines = [
    `### ${flame} Coding Streak`,
    "",
    `**Current:** ${streak} day${streak !== 1 ? "s" : ""}`,
    `**Longest:** ${longest} day${longest !== 1 ? "s" : ""}`,
    hasShield ? `**Shield:** ${shieldAvailable ? "\uD83D\uDEE1\uFE0F available" : "\u274C used this week"}` : "",
    "",
    streak >= 100 ? "\uD83C\uDFC6 Eternal Flame! (100+ days)" :
    streak >= 30 ? "\uD83D\uDD25 On fire! (30+ days)" :
    streak >= 7 ? "\u2728 Week streak!" :
    streak >= 1 ? "Keep it going!" :
    "Start coding to begin your streak!",
  ].filter(Boolean);

  return lines.join("\n");
}
