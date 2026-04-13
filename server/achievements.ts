/**
 * claude-den achievement system — 75 achievements across 6 tiers
 *
 * Achievements are checked after every XP award. Newly unlocked achievements
 * are written to achievements.json atomically.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { Companion } from "./engine.ts";

const STATE_DIR = join(homedir(), ".claude-buddy");
const ACHIEVEMENTS_FILE = join(STATE_DIR, "achievements.json");

// ─── Types ──────────────────────────────────────────────────────────────────

export type AchievementTier = "common" | "uncommon" | "rare" | "epic" | "legendary" | "secret";

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  tier: AchievementTier;
  cosmeticReward?: string;
  hint?: string;            // for secret achievements
  check: (ctx: AchievementContext) => boolean;
}

export interface AchievementContext {
  companion: Companion;
  counters: AchievementCounters;
  sessionCount: number;
  contextPct: number;
  currentHour: number;
  currentDow: number;       // 0=Sun
  currentDay: number;
  currentMonth: number;
  currentMinute: number;
  isLeapDay: boolean;
  isFriday13: boolean;
}

export interface AchievementCounters {
  totalCommits: number;
  totalTestsPassed: number;
  totalErrors: number;
  totalSessions: number;
  longestStreak: number;
  currentStreak: number;
  lastActiveDate: string;
  cleanToolUses: number;
  totalBuddies: number;
  totalHats: number;
  totalSpecies: number;
  totalAccessories: number;
  totalBestiaryEntries: number;
  moodHistoryCount: number;
}

export interface AchievementsFile {
  unlocked: Record<string, { ts: number; session: string; companion: string }>;
  counters: AchievementCounters;
}

// ─── Achievement Definitions ────────────────────────────────────────────────

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Common (15) ─────────────────────────────────────────────────────────
  { id: "first-blood",    name: "First Blood",     tier: "common", desc: "First test passed",                check: c => c.counters.totalTestsPassed >= 1 },
  { id: "hello-world",    name: "Hello World",     tier: "common", desc: "First commit tracked",             check: c => c.counters.totalCommits >= 1 },
  { id: "early-bird",     name: "Early Bird",      tier: "common", desc: "Code before 7am",                  check: c => c.currentHour < 7 },
  { id: "night-owl",      name: "Night Owl",       tier: "common", desc: "Code after midnight",              check: c => c.currentHour >= 0 && c.currentHour < 4, cosmeticReward: "lantern accessory" },
  { id: "mood-swing",     name: "Mood Swing",      tier: "common", desc: "All 5 moods in one session",       check: () => false }, // tracked separately
  { id: "chatterbox",     name: "Chatterbox",      tier: "common", desc: "10 buddy reactions in one session", check: () => false },
  { id: "pet-lover",      name: "Pet Lover",       tier: "common", desc: "Pet buddy 5 times",                check: () => false, cosmeticReward: "tinyduck hat" },
  { id: "name-caller",    name: "Name Caller",     tier: "common", desc: "Mention buddy's name in a prompt", check: () => false },
  { id: "error-one",      name: "First Oops",      tier: "common", desc: "First tracked error",              check: c => c.counters.totalErrors >= 1 },
  { id: "level-5",        name: "Breaking Out",    tier: "common", desc: "Reach level 5 (egg hatches)",      check: c => c.companion.level >= 5 },
  { id: "rename",         name: "Identity Crisis",  tier: "common", desc: "Rename your buddy",               check: () => false },
  { id: "personality",    name: "Soul Crafter",     tier: "common", desc: "Set a custom personality",        check: () => false },
  { id: "ten-commits",    name: "Warming Up",       tier: "common", desc: "10 commits tracked",              check: c => c.counters.totalCommits >= 10 },
  { id: "ten-tests",      name: "Test Curious",     tier: "common", desc: "10 tests passed",                 check: c => c.counters.totalTestsPassed >= 10 },
  { id: "five-sessions",  name: "Regular",          tier: "common", desc: "Complete 5 sessions",             check: c => c.counters.totalSessions >= 5 },

  // ── Uncommon (20) ───────────────────────────────────────────────────────
  { id: "streak-7",       name: "Week Warrior",     tier: "uncommon", desc: "7-day coding streak",            check: c => c.counters.currentStreak >= 7 },
  { id: "century",        name: "Century",          tier: "uncommon", desc: "100 tests passed",               check: c => c.counters.totalTestsPassed >= 100, cosmeticReward: "chef hat" },
  { id: "committer",      name: "Serial Committer", tier: "uncommon", desc: "50 commits",                    check: c => c.counters.totalCommits >= 50, cosmeticReward: "flag accessory" },
  { id: "clean-streak-5", name: "Clean Streak",     tier: "uncommon", desc: "5 consecutive clean tool uses",  check: c => c.counters.cleanToolUses >= 5, cosmeticReward: "shield accessory" },
  { id: "marathon",       name: "Marathon",          tier: "uncommon", desc: "2+ hour single session",        check: () => false },
  { id: "hatcher",        name: "Hatcher",           tier: "uncommon", desc: "Hatch a second companion",     check: c => c.counters.totalBuddies >= 2 },
  { id: "aquarium-owner", name: "Aquarium Owner",    tier: "uncommon", desc: "View aquarium first time",     check: () => false },
  { id: "level-10",       name: "Double Digits",     tier: "uncommon", desc: "Reach level 10",               check: c => c.companion.level >= 10 },
  { id: "zen-master",     name: "Zen Master",        tier: "uncommon", desc: "Happy mood entire session",    check: () => false, cosmeticReward: "halo hat" },
  { id: "hat-collector",  name: "Hat Collector",      tier: "uncommon", desc: "Own 3 different hats",        check: c => c.counters.totalHats >= 3 },
  { id: "species-pair",   name: "Odd Couple",         tier: "uncommon", desc: "Own 2 different species",    check: c => c.counters.totalSpecies >= 2 },
  { id: "bug-squasher",   name: "Bug Squasher",       tier: "uncommon", desc: "Fix 10 errors",             check: c => c.counters.totalErrors >= 10 },
  { id: "code-nose-catch",name: "Good Nose",           tier: "uncommon", desc: "First code smell caught",  check: () => false },
  { id: "xp-1000",        name: "Thousandaire",        tier: "uncommon", desc: "Accumulate 1,000 XP",      check: c => c.companion.xp >= 1000 },
  { id: "level-13",       name: "Lucky Number",        tier: "uncommon", desc: "Reach level 13",           check: c => c.companion.level >= 13 },
  { id: "all-hats-5",     name: "Fashionista",         tier: "uncommon", desc: "Own 5 different hats",     check: c => c.counters.totalHats >= 5 },
  { id: "three-species",  name: "Trio",                 tier: "uncommon", desc: "Own 3 different species", check: c => c.counters.totalSpecies >= 3 },
  { id: "morning-streak", name: "Dawn Patrol",          tier: "uncommon", desc: "Code before 7am, 3 days", check: () => false },
  { id: "test-fixer",     name: "Red to Green",         tier: "uncommon", desc: "Fix failing tests 5 times", check: () => false },
  { id: "xp-5000",        name: "Five Grand",           tier: "uncommon", desc: "Accumulate 5,000 XP",     check: c => c.companion.xp >= 5000 },

  // ── Rare (20) ───────────────────────────────────────────────────────────
  { id: "streak-30",      name: "Streak Lord",      tier: "rare", desc: "30-day coding streak",             check: c => c.counters.currentStreak >= 30, cosmeticReward: "book accessory" },
  { id: "debug-master",   name: "Debug Master",     tier: "rare", desc: "100 errors resolved",              check: c => c.counters.totalErrors >= 100, cosmeticReward: "wrench accessory" },
  { id: "the-purge",      name: "The Purge",        tier: "rare", desc: "Delete 1000+ lines in one commit", check: () => false, cosmeticReward: "pirate hat" },
  { id: "archaeologist",  name: "Archaeologist",    tier: "rare", desc: "Edit a file untouched 6+ months",  check: () => false },
  { id: "clean-streak-20",name: "Spotless",         tier: "rare", desc: "20 consecutive clean tool uses",   check: c => c.counters.cleanToolUses >= 20, cosmeticReward: "frost aura" },
  { id: "hydra",          name: "Hydra",            tier: "rare", desc: "3+ simultaneous sessions",         check: c => c.sessionCount >= 3, cosmeticReward: "space aquarium" },
  { id: "polyglot",       name: "Polyglot",         tier: "rare", desc: "3+ languages in one week",         check: () => false, cosmeticReward: "rainbow aura" },
  { id: "level-20",       name: "Journeyman",       tier: "rare", desc: "Reach level 20",                   check: c => c.companion.level >= 20 },
  { id: "five-hundred",   name: "Five Hundred",     tier: "rare", desc: "500 tests passed",                 check: c => c.counters.totalTestsPassed >= 500 },
  { id: "bestiary-5",     name: "Bug Spotter",      tier: "rare", desc: "5 unique bestiary entries",        check: c => c.counters.totalBestiaryEntries >= 5 },
  { id: "speed-fix",      name: "Quick Draw",       tier: "rare", desc: "Fix error within 30 seconds",      check: () => false, cosmeticReward: "electric aura" },
  { id: "species-5",      name: "Menagerie",        tier: "rare", desc: "Own 5 different species",           check: c => c.counters.totalSpecies >= 5 },
  { id: "weekend-warrior",name: "Weekend Warrior",  tier: "rare", desc: "Code Saturday + Sunday",            check: () => false },
  { id: "midnight-oil",   name: "Midnight Oil",     tier: "rare", desc: "3+ hour session after midnight",    check: () => false, cosmeticReward: "shadow aura" },
  { id: "bestiary-10",    name: "Bug Collector",    tier: "rare", desc: "10 unique bestiary entries",         check: c => c.counters.totalBestiaryEntries >= 10, cosmeticReward: "sword accessory" },
  { id: "level-25",       name: "Veteran",          tier: "rare", desc: "Reach level 25",                    check: c => c.companion.level >= 25 },
  { id: "all-accessories",name: "Arsenal",          tier: "rare", desc: "Own 4 different accessories",        check: c => c.counters.totalAccessories >= 4 },
  { id: "mood-tracker",   name: "Mood Diary",       tier: "rare", desc: "Use /buddy mood 10 times",          check: c => c.counters.moodHistoryCount >= 10 },
  { id: "level-30",       name: "Journeyman II",    tier: "rare", desc: "Reach level 30",                    check: c => c.companion.level >= 30 },
  { id: "session-50",     name: "Dedicated",         tier: "rare", desc: "Complete 50 sessions",             check: c => c.counters.totalSessions >= 50 },

  // ── Epic (10) ───────────────────────────────────────────────────────────
  { id: "chosen-one",     name: "Chosen One",       tier: "epic", desc: "Hatch a legendary companion",       check: c => c.companion.bones.rarity === "legendary", cosmeticReward: "crown hat" },
  { id: "context-master", name: "Edge of Context",  tier: "epic", desc: "Hit 90% context usage",             check: c => c.contextPct >= 90, cosmeticReward: "astronaut hat" },
  { id: "phoenix-ach",    name: "Phoenix",           tier: "epic", desc: "Revert a revert",                  check: () => false },
  { id: "shiny-hunter",   name: "Shiny Hunter",      tier: "epic", desc: "Own a shiny companion",           check: c => c.companion.bones.shiny, cosmeticReward: "\u25C8 eye" },
  { id: "thousand-commits",name: "Commit Machine",   tier: "epic", desc: "1,000 commits",                   check: c => c.counters.totalCommits >= 1000 },
  { id: "thousand-tests", name: "Test Factory",       tier: "epic", desc: "1,000 tests passed",             check: c => c.counters.totalTestsPassed >= 1000 },
  { id: "evolution-4",    name: "Full Grown",         tier: "epic", desc: "Reach Evolution Stage 4",        check: c => c.companion.evolution >= 4 },
  { id: "level-40",       name: "Master",             tier: "epic", desc: "Reach level 40",                 check: c => c.companion.level >= 40 },
  { id: "bestiary-25",    name: "Bug Encyclopedia",   tier: "epic", desc: "25 unique bestiary entries",     check: c => c.counters.totalBestiaryEntries >= 25, cosmeticReward: "dungeon aquarium" },
  { id: "living-fossil",  name: "Living Fossil",      tier: "epic", desc: "Edit file untouched 2+ years",  check: () => false, cosmeticReward: "forest aquarium" },

  // ── Legendary (5) ──────────────────────────────────────────────────────
  { id: "level-50",       name: "Transcendent",      tier: "legendary", desc: "Reach level 50",              check: c => c.companion.level >= 50, cosmeticReward: "\u2605 eye" },
  { id: "prestige-1",     name: "Reborn",             tier: "legendary", desc: "Complete first prestige",    check: c => c.companion.generation >= 1, cosmeticReward: "\u221E eye" },
  { id: "streak-100",     name: "Eternal Flame",      tier: "legendary", desc: "100-day coding streak",     check: c => c.counters.currentStreak >= 100, cosmeticReward: "samurai hat" },
  { id: "full-house",     name: "Full House",          tier: "legendary", desc: "5 companions in aquarium", check: c => c.counters.totalBuddies >= 5 },
  { id: "level-100",      name: "Centurion",           tier: "legendary", desc: "Complete first Ascension", check: c => c.companion.ascension >= 1, cosmeticReward: "animated frames + golden egg" },

  // ── Secret (5) ─────────────────────────────────────────────────────────
  { id: "friday-13",      name: "Cursed",              tier: "secret", desc: "Fix a bug on Friday the 13th",  check: c => c.isFriday13, hint: "Some days are unluckier than others...", cosmeticReward: "\u15E3 eye" },
  { id: "pi-commit",      name: "Irrational",          tier: "secret", desc: "Commit at exactly 3:14 AM or PM",  check: c => (c.currentHour === 3 || c.currentHour === 15) && c.currentMinute === 14, hint: "Time is a circle..." },
  { id: "leap-bug",       name: "Temporal Anomaly",    tier: "secret", desc: "Fix a bug on Feb 29",          check: c => c.isLeapDay, hint: "Once every four years...", cosmeticReward: "glitch hat" },
  { id: "palindrome",     name: "Mirror Mirror",       tier: "secret", desc: "Palindrome commit message",    check: () => false, hint: "Forwards, backwards, all the same..." },
  { id: "prestige-3",     name: "Thrice Reforged",     tier: "secret", desc: "Complete 3 prestiges",         check: c => c.companion.generation >= 3, hint: "Some journeys never end...", cosmeticReward: "void aquarium" },
];

// ─── XP for tier ────────────────────────────────────────────────────────────

export const TIER_XP: Record<AchievementTier, number> = {
  common: 50,
  uncommon: 50,
  rare: 50,
  epic: 50,
  legendary: 50,
  secret: 50,
};

// ─── File I/O ───────────────────────────────────────────────────────────────

function defaultCounters(): AchievementCounters {
  return {
    totalCommits: 0, totalTestsPassed: 0, totalErrors: 0,
    totalSessions: 0, longestStreak: 0, currentStreak: 0,
    lastActiveDate: "", cleanToolUses: 0, totalBuddies: 1,
    totalHats: 1, totalSpecies: 1, totalAccessories: 0,
    totalBestiaryEntries: 0, moodHistoryCount: 0,
  };
}

export function loadAchievements(): AchievementsFile {
  try {
    const data = JSON.parse(readFileSync(ACHIEVEMENTS_FILE, "utf8"));
    return {
      unlocked: data.unlocked ?? {},
      counters: { ...defaultCounters(), ...data.counters },
    };
  } catch {
    return { unlocked: {}, counters: defaultCounters() };
  }
}

export function saveAchievements(data: AchievementsFile): void {
  mkdirSync(STATE_DIR, { recursive: true });
  const tmp = ACHIEVEMENTS_FILE + ".tmp";
  writeFileSync(tmp, JSON.stringify(data, null, 2));
  const { renameSync } = require("fs");
  renameSync(tmp, ACHIEVEMENTS_FILE);
}

// ─── Check and award ────────────────────────────────────────────────────────

export interface NewAchievement {
  def: AchievementDef;
  xpAwarded: number;
}

export function checkAchievements(
  companion: Companion,
  sid: string,
  extraContext?: Partial<AchievementContext>,
): NewAchievement[] {
  const file = loadAchievements();
  const now = new Date();

  const ctx: AchievementContext = {
    companion,
    counters: file.counters,
    sessionCount: extraContext?.sessionCount ?? 1,
    contextPct: extraContext?.contextPct ?? 0,
    currentHour: now.getHours(),
    currentDow: now.getDay(),
    currentDay: now.getDate(),
    currentMonth: now.getMonth() + 1,
    currentMinute: now.getMinutes(),
    isLeapDay: now.getMonth() === 1 && now.getDate() === 29,
    isFriday13: now.getDay() === 5 && now.getDate() === 13,
  };

  const newlyUnlocked: NewAchievement[] = [];

  for (const def of ACHIEVEMENTS) {
    if (file.unlocked[def.id]) continue; // already unlocked

    try {
      if (def.check(ctx)) {
        const xp = TIER_XP[def.tier];
        file.unlocked[def.id] = {
          ts: Date.now(),
          session: sid,
          companion: companion.name,
        };
        newlyUnlocked.push({ def, xpAwarded: xp });
      }
    } catch {
      // skip broken checks
    }
  }

  if (newlyUnlocked.length > 0) {
    saveAchievements(file);
  }

  return newlyUnlocked;
}

// ─── Render helpers ─────────────────────────────────────────────────────────

const TIER_EMOJI: Record<AchievementTier, string> = {
  common: "\u26AA",     // ⚪
  uncommon: "\uD83D\uDFE2", // 🟢
  rare: "\uD83D\uDD35",     // 🔵
  epic: "\uD83D\uDFE3",     // 🟣
  legendary: "\uD83D\uDFE1", // 🟡
  secret: "\u2753",          // ❓
};

export function renderAchievementList(level: number): string {
  const file = loadAchievements();
  const lines: string[] = [];

  for (const tier of ["common", "uncommon", "rare", "epic", "legendary", "secret"] as AchievementTier[]) {
    const defs = ACHIEVEMENTS.filter((a) => a.tier === tier);
    const emoji = TIER_EMOJI[tier];
    lines.push(`\n### ${emoji} ${tier.charAt(0).toUpperCase() + tier.slice(1)} (${defs.filter(d => file.unlocked[d.id]).length}/${defs.length})\n`);

    for (const def of defs) {
      const unlocked = file.unlocked[def.id];
      if (unlocked) {
        const date = new Date(unlocked.ts).toLocaleDateString();
        const reward = def.cosmeticReward ? ` \u2192 ${def.cosmeticReward}` : "";
        lines.push(`\u2705 **${def.name}** \u2014 ${def.desc} *(${date})*${reward}`);
      } else if (def.tier === "secret") {
        lines.push(`\u2753 **???** \u2014 ${def.hint ?? "Hidden achievement"}`);
      } else {
        lines.push(`\u26AB **${def.name}** \u2014 ${def.desc}`);
      }
    }
  }

  return lines.join("\n");
}
