/**
 * claude-den progression engine — XP awards, level calculation, event processing
 *
 * XP is saved IMMEDIATELY on every award via atomic menagerie.json write.
 * No deferred/batched/cached XP. Crash-safe after write.
 */

import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { Companion } from "./engine.ts";
import { ensureCompanionDefaults } from "./engine.ts";
import { getUnlocksAtLevel, type Unlock } from "./unlocks.ts";
import { calculateMood, type MoodResult } from "./mood.ts";

const STATE_DIR = join(homedir(), ".claude-buddy");
const EVENTS_FILE = join(STATE_DIR, "events.ndjson");

// ─── XP cap ─────────────────────────────────────────────────────────────────

export const MAX_XP_PER_EVENT = 20;

// ─── Level formula ──────────────────────────────────────────────────────────

export function xpForLevel(level: number): number {
  return Math.floor(200 * level * level);
}

export function levelFromXp(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(xp / 200)));
}

export function xpToNextLevel(xp: number): { current: number; needed: number; progress: number } {
  const level = levelFromXp(xp);
  // Floor = XP needed to reach current level (0 for level 1)
  const currentFloor = level <= 1 ? 0 : xpForLevel(level);
  // Ceiling = XP needed to reach next level
  const nextCeiling = xpForLevel(level + 1);
  const progressXp = xp - currentFloor;
  const neededXp = nextCeiling - currentFloor;
  return {
    current: Math.max(0, progressXp),
    needed: neededXp,
    progress: neededXp > 0 ? Math.max(0, progressXp) / neededXp : 1,
  };
}

// ─── Evolution from level ───────────────────────────────────────────────────

export function evolutionFromLevel(level: number): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  if (level >= 80) return 7;
  if (level >= 50) return 6;
  if (level >= 40) return 5;
  if (level >= 25) return 4;
  if (level >= 15) return 3;
  if (level >= 5) return 2;
  return 1;
}

// ─── Seasonal multipliers ───────────────────────────────────────────────────

export function getSeasonalMultiplier(reason?: string): number {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const dow = now.getDay(); // 0=Sun
  const hour = now.getHours();
  const minute = now.getMinutes();

  // Friday the 13th: 2x on bug fixes
  if (dow === 5 && day === 13 && reason === "bug-fix") return 2;

  // Pi Day: 2x on commits at 3:14
  if (month === 3 && day === 14 && hour === 3 && minute === 14 && reason === "commit") return 2;
  if (month === 3 && day === 14 && hour === 15 && minute === 14 && reason === "commit") return 2;

  return 1;
}

export function getPrestigeMultiplier(companion: Companion): number {
  let mult = 1;
  if (companion.prestigePerks?.includes("quick-study")) mult *= 1.15;
  if (companion.ascensionPerks?.includes("golden-touch")) mult *= 1.5;
  return mult;
}

// ─── XP Award Sources ───────────────────────────────────────────────────────

export const XP_AMOUNTS: Record<string, number> = {
  "commit": 15,
  "tests-pass": 8,
  "single-test": 2,
  "bug-fix": 12,
  "file-created": 5,
  "file-deleted": 3,
  "lint-pass": 4,
  "build-success": 10,
  "dep-install": 3,
  "branch-created": 5,
  "clean-tool-use": 1,
  "clean-streak-10": 5,
  "large-refactor": 8,
  "type-error-fixed": 6,
  "coverage-increase": 10,
  "first-action-day": 10,
  "session-complete": 15,
  "long-session": 20,
  "streak-day": 5,
  "new-bestiary": 8,
  "achievement-common": 10,
  "achievement-uncommon": 15,
  "achievement-rare": 20,
  "achievement-epic": 20,
  "achievement-legendary": 20,
  "daily-challenge": 15,
};

// ─── Event logging ──────────────────────────────────────────────────────────

export interface GameEvent {
  event: string;
  ts: number;
  sid: string;
  xp?: number;
  detail?: string;
}

export function logEvent(event: GameEvent): void {
  mkdirSync(STATE_DIR, { recursive: true });
  appendFileSync(EVENTS_FILE, JSON.stringify(event) + "\n");
}

export function readRecentEvents(count: number = 20): GameEvent[] {
  try {
    const lines = readFileSync(EVENTS_FILE, "utf8").trim().split("\n").filter(Boolean);
    return lines.slice(-count).map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

// ─── User Profile (global XP, separate from companion) ─────────────────────

const PROFILE_FILE = join(STATE_DIR, "profile.json");

export interface UserProfile {
  xp: number;
  level: number;
}

export function loadProfile(): UserProfile {
  try {
    const data = JSON.parse(readFileSync(PROFILE_FILE, "utf8"));
    return { xp: data.xp ?? 0, level: data.level ?? 1 };
  } catch {
    return { xp: 0, level: 1 };
  }
}

function saveProfile(profile: UserProfile): void {
  mkdirSync(STATE_DIR, { recursive: true });
  const tmp = PROFILE_FILE + ".tmp";
  writeFileSync(tmp, JSON.stringify(profile, null, 2));
  const { renameSync: rn } = require("fs");
  rn(tmp, PROFILE_FILE);
}

// ─── Award XP (atomic — user + pet) ────────────────────────────────────────
//
// XP split: The USER earns full XP. The active PET earns max(0, userXP - 3).
// User XP drives unlocks, levels, and gating.
// Pet XP is its own progression bar — pets level slower.

export interface AwardResult {
  userXP: number;         // XP awarded to user
  petXP: number;          // XP awarded to active pet
  userTotal: number;
  petTotal: number;
  leveledUp: boolean;     // user leveled up
  petLeveledUp: boolean;  // pet leveled up
  oldLevel: number;
  newLevel: number;
  oldEvolution: number;
  newEvolution: number;
  newUnlocks: Unlock[];
  // backward compat aliases
  awarded: number;
  newTotal: number;
}

export function awardXP(
  reason: string,
  sid: string,
  detail?: string,
): AwardResult {
  const MANIFEST_FILE = join(STATE_DIR, "menagerie.json");
  const empty: AwardResult = { userXP: 0, petXP: 0, userTotal: 0, petTotal: 0, leveledUp: false, petLeveledUp: false, oldLevel: 1, newLevel: 1, oldEvolution: 1, newEvolution: 1, newUnlocks: [], awarded: 0, newTotal: 0 };

  // Load manifest
  let manifest: { active: string; companions: Record<string, any> };
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_FILE, "utf8"));
  } catch {
    return empty;
  }

  const companion = manifest.companions[manifest.active];
  if (!companion) return empty;

  // Apply defaults for backward compat
  const c = ensureCompanionDefaults(companion);

  const baseXP = XP_AMOUNTS[reason] ?? 0;
  if (baseXP === 0) {
    const profile = loadProfile();
    return { ...empty, userTotal: profile.xp, petTotal: c.xp, oldLevel: profile.level, newLevel: profile.level, oldEvolution: c.evolution, newEvolution: c.evolution, newTotal: profile.xp };
  }

  // Apply multipliers, cap at MAX_XP_PER_EVENT
  const seasonalMult = getSeasonalMultiplier(reason);
  const prestigeMult = getPrestigeMultiplier(c);
  const moodResult = calculateMood(readRecentEvents(5));
  const moodMult = moodResult.mood === "celebrating" ? 1.1 : 1;

  let userXP = Math.floor(baseXP * seasonalMult * prestigeMult * moodMult);
  userXP = Math.min(userXP, MAX_XP_PER_EVENT);

  // Pet gets less XP than user:
  // - Normal pets: userXP - 3 (minimum 0)
  // - Shiny pets: userXP - 2 (minimum 0) — shinies earn 1 more XP per event
  const shinyBonus = c.bones.shiny ? 1 : 0;
  const petXP = Math.max(0, userXP - 3 + shinyBonus);

  // Load and update user profile
  const profile = loadProfile();
  const oldUserLevel = profile.level;
  profile.xp += userXP;
  profile.level = levelFromXp(profile.xp);
  saveProfile(profile);

  // Update pet (companion) XP
  const oldPetLevel = c.level;
  const oldEvolution = c.evolution;
  c.xp += petXP;
  c.level = levelFromXp(c.xp);
  c.evolution = evolutionFromLevel(c.level);

  // Increment relevant counter
  if (reason === "commit") c.totalCommits++;
  if (reason === "tests-pass" || reason === "single-test") c.totalTestsPassed++;
  if (reason.includes("error") || reason === "bug-fix") c.totalErrors++;

  // Write back to manifest atomically
  manifest.companions[manifest.active] = c;
  mkdirSync(STATE_DIR, { recursive: true });
  const tmp = MANIFEST_FILE + ".tmp";
  writeFileSync(tmp, JSON.stringify(manifest, null, 2));
  const { renameSync } = require("fs");
  renameSync(tmp, MANIFEST_FILE);

  // Log event (user XP is the primary)
  logEvent({ event: reason, ts: Date.now(), sid, xp: userXP, detail });

  // Check new unlocks (based on USER level, not pet level)
  const newUnlocks: Unlock[] = [];
  for (let l = oldUserLevel + 1; l <= profile.level; l++) {
    newUnlocks.push(...getUnlocksAtLevel(l));
  }

  return {
    userXP,
    petXP,
    userTotal: profile.xp,
    petTotal: c.xp,
    leveledUp: profile.level > oldUserLevel,
    petLeveledUp: c.level > oldPetLevel,
    oldLevel: oldUserLevel,
    newLevel: profile.level,
    oldEvolution,
    newEvolution: c.evolution,
    newUnlocks,
    // backward compat
    awarded: userXP,
    newTotal: profile.xp,
  };
}

// ─── Render helpers ─────────────────────────────────────────────────────────

export function renderXPBar(xp: number, width: number = 20): string {
  const { current, needed, progress } = xpToNextLevel(xp);
  const filled = Math.round(progress * width);
  const bar = "\u2588".repeat(filled) + "\u2591".repeat(width - filled);
  return `[${bar}] ${current}/${needed}`;
}
