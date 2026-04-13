#!/usr/bin/env bun
/**
 * CLI entry point for awarding XP from hooks.
 * Usage: bun run server/award-xp.ts <reason> <sid>
 *
 * Called by hooks/react.sh after detecting an XP-worthy event.
 * Must be fast (<50ms) since it runs in the hook pipeline.
 */

import { awardXP } from "./progression.ts";
import { writeStatusState } from "./state.ts";
import { saveReaction } from "./state.ts";
import { checkAchievements, TIER_XP } from "./achievements.ts";

const reason = process.argv[2];
const sid = process.argv[3] ?? "default";

if (!reason) process.exit(0);

const result = awardXP(reason, sid);

// Sync status.json so the statusline reflects updated XP/level
try {
  const { readFileSync } = require("fs");
  const { join } = require("path");
  const { homedir } = require("os");
  const MANIFEST = join(homedir(), ".claude-buddy", "menagerie.json");
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  const comp = manifest.companions[manifest.active];
  if (comp) {
    const { ensureCompanionDefaults } = require("./engine.ts");
    writeStatusState(ensureCompanionDefaults(comp));
  }
} catch { /* non-critical */ }

// Check achievements after XP award
if (result.awarded > 0) {
  try {
    const { readFileSync } = require("fs");
    const { join } = require("path");
    const { homedir } = require("os");
    const MANIFEST = join(homedir(), ".claude-buddy", "menagerie.json");
    const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
    const companion = manifest.companions[manifest.active];
    if (companion) {
      const { ensureCompanionDefaults } = require("./engine.ts");
      const c = ensureCompanionDefaults(companion);
      const newAchievements = checkAchievements(c, sid);

      for (const ach of newAchievements) {
        // Award achievement XP (50 XP for all tiers)
        awardXP(`achievement-${ach.def.tier}`, sid, ach.def.name);

        // Toast notification with description of what they did
        const reward = ach.def.cosmeticReward ? ` Reward: ${ach.def.cosmeticReward}` : "";
        saveReaction(
          `\u{1F3C6} Achievement: ${ach.def.name}! ${ach.def.desc}. +50 XP!${reward}`,
          "achievement",
        );
      }

      // User level-up toast
      if (result.leveledUp) {
        const unlockNames = result.newUnlocks.map((u) => u.name).join(", ");
        const msg = unlockNames
          ? `\u2728 You reached Level ${result.newLevel}! Unlocked: ${unlockNames}`
          : `\u2728 You reached Level ${result.newLevel}!`;
        saveReaction(msg, "level-up");
      }

      // Pet level-up + milestone toast
      if (result.petLeveledUp) {
        const { getMilestoneAtLevel } = require("./pet-milestones.ts");
        const milestone = getMilestoneAtLevel(c.level);
        if (milestone) {
          const icon = milestone.type === "evolution" ? "\uD83C\uDF1F" : milestone.type === "personality" ? "\uD83D\uDCAC" : "\uD83C\uDFA8";
          saveReaction(
            `${icon} ${c.name} reached Lv.${c.level}! Milestone: ${milestone.name} \u2014 ${milestone.desc}`,
            "pet-milestone",
          );
        }
      }
    }
  } catch {
    // silent — achievements are non-critical
  }
}
