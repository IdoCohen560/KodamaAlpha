#!/usr/bin/env bun
/**
 * CLI entry point for cataloguing errors into the bestiary.
 * Usage: bun run server/catalogue-error.ts <error-text> <sid>
 *
 * Called by hooks/react.sh when an error is detected.
 */

import { catalogueError, recordFix } from "./bestiary.ts";
import { awardXP } from "./progression.ts";
import { isUnlocked } from "./unlocks.ts";
import { ensureCompanionDefaults } from "./engine.ts";
import { loadCompanion, saveReaction } from "./state.ts";

const action = process.argv[2]; // "error" or "fix"
const errorText = process.argv[3] ?? "";
const sid = process.argv[4] ?? "default";

const companion = loadCompanion();
if (!companion) process.exit(0);
const c = ensureCompanionDefaults(companion);

// Bestiary unlocks at L18
if (!isUnlocked(c.level, "bestiary")) process.exit(0);

if (action === "error" && errorText) {
  const result = catalogueError(errorText);
  if (result.isNew) {
    // New species discovered!
    awardXP("new-bestiary", sid, result.entry.name);
    saveReaction(
      `\uD83D\uDC1B New bug discovered: ${result.entry.name}!`,
      "bestiary",
    );
  }
} else if (action === "fix") {
  recordFix();
}
