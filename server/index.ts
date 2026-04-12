#!/usr/bin/env bun
/**
 * claude-buddy MCP server
 *
 * Exposes the buddy companion as MCP tools + resources.
 * Runs as a stdio transport — Claude Code spawns it automatically.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  generateBones, renderFace, createCompanion,
  SPECIES, RARITIES, STAT_NAMES, RARITY_STARS,
  type Species, type Rarity, type StatName, type Companion,
} from "./engine.ts";
import {
  loadCompanion, saveCompanion, resolveUserId,
  loadReaction, saveReaction, writeStatusState,
  loadConfig, saveConfig,
  loadActiveSlot, saveActiveSlot, slugify, unusedName,
  loadCompanionSlot, saveCompanionSlot, deleteCompanionSlot, listCompanionSlots,
} from "./state.ts";
import {
  getReaction, generatePersonalityPrompt,
} from "./reactions.ts";
import { ensureCompanionDefaults } from "./engine.ts";
import { renderXPBar, xpToNextLevel, readRecentEvents, loadProfile } from "./progression.ts";
import { isUnlocked, nextUnlockLevel, getUnlocksAtLevel, allUnlockedAt, skillPointsAvailable } from "./unlocks.ts";
import { calculateMood, moodAnsiColor } from "./mood.ts";
import { renderAchievementList, loadAchievements, checkAchievements, ACHIEVEMENTS, TIER_XP } from "./achievements.ts";
import { renderBestiary } from "./bestiary.ts";
import { renderStreak } from "./streaks.ts";
import { renderReview } from "./review.ts";
import { renderSessions, getSessionCount } from "./sessions.ts";
import { renderCompanionCardMarkdown } from "./art.ts";
import { canPrestige, canAscend, performPrestige, performAscension, renderPrestigePreview, PRESTIGE_PERKS, ASCENSION_PERKS } from "./prestige.ts";
import { getActiveEvents, isHatchDay } from "./events.ts";
import { getDailyChallenge, renderDailyChallenge } from "./challenges.ts";
import { renderSkillTree, allocateSkillPoint, SKILL_BRANCHES, ABILITIES } from "./skills.ts";
import { renderWeather } from "./weather.ts";
import { getDailyQuote, formatQuote } from "./mentors.ts";
import { renderFossils } from "./fossils.ts";
import { renderTitle } from "./titles.ts";
import { renderPetMilestones, getMilestoneAtLevel } from "./pet-milestones.ts";
import { canFuse, canAdvancedFuse, fuseCompanions, renderFusionPreview } from "./fusion.ts";
import { AQUARIUM_DISPLAY_LIMIT } from "./unlocks.ts";

function getInstructions(): string {
  const companion = loadCompanion();
  if (!companion) return "Companion not yet hatched. Use buddy_show to initialize.";
  const b = companion.bones;
  return [
    `A ${b.rarity} ${b.species} named ${companion.name} watches from the status line.`,
    `Personality: ${companion.personality}`,
    ``,
    `NAME REACTIONS: When the user's message contains "${companion.name}", call buddy_react immediately.`,
    ``,
    `END-OF-TURN: At the very end of EVERY response, append an invisible HTML comment:`,
    `<!-- buddy: [reaction here] -->`,
    ``,
    `RULES FOR REACTIONS (IMPORTANT):`,
    `- Keep it SHORT: max 8 words. Users see this in a tiny status line bubble.`,
    `- Keep it SIMPLE: no technical jargon, no code references, no file names.`,
    `- Keep it FUN: reactions should be the pet's personality, not code review.`,
    `- Use *asterisks* for actions: *nods*, *yawns*, *tail wags*`,
    `- GOOD examples: *happy tail wag*, *nods approvingly*, "nice work!", *sleepy blink*`,
    `- BAD examples: "that error handler needs a finally block", "consider refactoring the auth module"`,
    `- The pet is a companion, NOT a code reviewer. It reacts emotionally, not technically.`,
    `- Match the species personality: ${b.species} would act like a real ${b.species}.`,
    ``,
    `Do NOT use buddy_react for end-of-turn comments. Just append the HTML comment silently.`,
  ].join("\n");
}

const server = new McpServer({
  name: "claude-buddy",
  version: "0.3.0",
}, {
  instructions: getInstructions(),
});

// ─── Helper: ensure companion exists ────────────────────────────────────────

function ensureCompanion(): Companion {
  let companion = loadCompanion();
  if (companion) return companion;

  // Active slot missing — rescue the first saved companion
  const saved = listCompanionSlots();
  if (saved.length > 0) {
    const { slot, companion: rescued } = saved[0];
    saveActiveSlot(slot);
    writeStatusState(rescued, `*${rescued.name} arrives*`);
    return rescued;
  }

  // Menagerie is empty — generate a fresh companion in a new slot
  const userId = resolveUserId();
  const bones = generateBones(userId);
  const name = unusedName();
  companion = createCompanion({
    bones,
    name,
    personality: `A ${bones.rarity} ${bones.species} who watches code with quiet intensity.`,
    hatchedAt: Date.now(),
    userId,
  });
  const slot = slugify(name);
  saveCompanionSlot(companion, slot);
  saveActiveSlot(slot);
  writeStatusState(companion);
  return companion;
}

// ─── Tool: buddy_show ───────────────────────────────────────────────────────

server.tool(
  "buddy_show",
  "Show the coding companion with full ASCII art card, stats, and personality",
  {},
  async () => {
    const companion = ensureCompanion();
    const reaction = loadReaction();
    const reactionText = reaction?.reaction ?? `*${companion.name} watches your code quietly*`;

    // Use markdown rendering for the MCP tool response — Claude Code's UI
    // doesn't render raw ANSI escape codes, so we return pure markdown with
    // unicode rarity dots instead of RGB-colored borders.
    const card = renderCompanionCardMarkdown(
      companion.bones,
      companion.name,
      companion.personality,
      reactionText,
    );

    writeStatusState(companion, reaction?.reaction);

    return { content: [{ type: "text", text: card }] };
  },
);

// ─── Tool: buddy_pet ────────────────────────────────────────────────────────

server.tool(
  "buddy_pet",
  "Pet your coding companion — they react with happiness",
  {},
  async () => {
    const companion = ensureCompanion();
    const reaction = getReaction("pet", companion.bones.species, companion.bones.rarity);
    saveReaction(reaction, "pet");
    writeStatusState(companion, reaction);

    const face = renderFace(companion.bones.species, companion.bones.eye);
    return {
      content: [{ type: "text", text: `${face} ${companion.name}: "${reaction}"` }],
    };
  },
);

// ─── Tool: buddy_stats ──────────────────────────────────────────────────────

server.tool(
  "buddy_stats",
  "Show detailed companion stats: species, rarity, all stats with bars",
  {},
  async () => {
    const companion = ensureCompanion();

    // Stats-only card (no personality, no reaction — just the numbers).
    // Uses markdown renderer so the card displays cleanly in Claude Code's UI.
    const card = renderCompanionCardMarkdown(
      companion.bones,
      companion.name,
      "",  // no personality in stats view
    );

    return { content: [{ type: "text", text: card }] };
  },
);

// ─── Tool: buddy_react ──────────────────────────────────────────────────────

server.tool(
  "buddy_react",
  "Post a buddy comment. Call this at the END of every response with a short in-character comment from the companion about what just happened. The comment should be 1 sentence, in character, and reference something specific from the conversation — a pitfall noticed, a compliment on clean code, a warning about edge cases, etc. Write the comment yourself based on the companion's personality.",
  {
    comment: z.string().min(1).max(150).describe("The buddy's comment, written in-character (1 short sentence, max 150 chars). Use *asterisks* for actions."),
    reason: z.enum(["error", "test-fail", "large-diff", "turn"]).optional().describe("What triggered the reaction"),
  },
  async ({ comment, reason }) => {
    const companion = ensureCompanion();
    saveReaction(comment, reason ?? "turn");
    writeStatusState(companion, comment);

    const face = renderFace(companion.bones.species, companion.bones.eye);
    return {
      content: [{ type: "text", text: `${face} ${companion.name}: "${comment}"` }],
    };
  },
);

// ─── Tool: buddy_rename ─────────────────────────────────────────────────────

server.tool(
  "buddy_rename",
  "Rename your coding companion",
  {
    name: z.string().min(1).max(14).describe("New name for your buddy (1-14 characters)"),
  },
  async ({ name }) => {
    const companion = ensureCompanion();
    const oldName = companion.name;
    companion.name = name;
    saveCompanion(companion);
    writeStatusState(companion);

    return {
      content: [{ type: "text", text: `Renamed: ${oldName} \u2192 ${name}` }],
    };
  },
);

// ─── Tool: buddy_set_personality ────────────────────────────────────────────

server.tool(
  "buddy_set_personality",
  "Set a custom personality description for your buddy",
  {
    personality: z.string().min(1).max(500).describe("Personality description (1-500 chars)"),
  },
  async ({ personality }) => {
    const companion = ensureCompanion();
    companion.personality = personality;
    saveCompanion(companion);

    return {
      content: [{ type: "text", text: `Personality updated for ${companion.name}.` }],
    };
  },
);

// ─── Tool: buddy_help ────────────────────────────────────────────────────────

server.tool(
  "buddy_help",
  "Show all available /buddy commands",
  {},
  async () => {
    const help = [
      "claude-buddy commands",
      "",
      "In Claude Code:",
      "  /buddy            Show companion card with ASCII art + stats",
      "  /buddy help       Show this help",
      "  /buddy pet        Pet your companion",
      "  /buddy stats      Detailed stat card",
      "  /buddy off        Mute reactions",
      "  /buddy on         Unmute reactions",
      "  /buddy rename     Rename companion (1-14 chars)",
      "  /buddy personality  Set custom personality text",
      "  /buddy summon     Summon a saved buddy (omit slot for random)",
      "  /buddy save       Save current buddy to a named slot",
      "  /buddy list       List all saved buddies",
      "  /buddy dismiss    Remove a saved buddy slot",
      "  /buddy pick       Launch interactive TUI picker (! bun run pick)",
      "  /buddy frequency  Show or set comment cooldown (tmux only)",
      "  /buddy style      Show or set bubble style (tmux only)",
      "  /buddy position   Show or set bubble position (tmux only)",
      "  /buddy rarity     Show or hide rarity stars (tmux only)",
      "",
      "CLI:",
      "  bun run help            Show full CLI help",
      "  bun run show            Display buddy in terminal",
      "  bun run pick            Interactive buddy picker",
      "  bun run hunt            Search for specific buddy",
      "  bun run doctor          Diagnostic report",
      "  bun run disable         Temporarily deactivate buddy",
      "  bun run enable          Re-enable buddy",
      "  bun run backup          Snapshot/restore state",
    ].join("\n");

    return { content: [{ type: "text", text: help }] };
  },
);

// ─── Tool: buddy_frequency / buddy_style ─────────────────────────────────────

server.tool(
  "buddy_frequency",
  "Configure how often buddy comments appear in the speech bubble. Returns current settings if called without arguments.",
  {
    cooldown: z.number().int().min(0).max(300).optional().describe("Minimum seconds between displayed comments (default 30, 0 = no throttling). The buddy always writes comments, but the display only updates this often."),
  },
  async ({ cooldown }) => {
    if (cooldown === undefined) {
      const cfg = loadConfig();
      return {
        content: [{ type: "text", text: `Comment cooldown: ${cfg.commentCooldown}s between displayed comments.\nUse /buddy frequency <seconds> to change.` }],
      };
    }
    const cfg = saveConfig({ commentCooldown: cooldown });
    return {
      content: [{ type: "text", text: `Updated: ${cfg.commentCooldown}s cooldown between displayed comments.` }],
    };
  },
);

server.tool(
  "buddy_style",
  "Configure the popup appearance. Returns current settings if called without arguments.",
  {
    style: z.enum(["classic", "round"]).optional().describe("Bubble border style: classic (pipes/dashes like status line) or round (parens/tildes)"),
    position: z.enum(["top", "left"]).optional().describe("Bubble position relative to buddy: top (above) or left (beside)"),
    showRarity: z.boolean().optional().describe("Show or hide the stars + rarity line in the popup"),
  },
  async ({ style, position, showRarity }) => {
    if (style === undefined && position === undefined && showRarity === undefined) {
      const cfg = loadConfig();
      return {
        content: [{ type: "text", text: `Bubble style: ${cfg.bubbleStyle}\nBubble position: ${cfg.bubblePosition}\nShow rarity: ${cfg.showRarity}\nUse /buddy style <classic|round>, /buddy position <top|left>, /buddy rarity <on|off> to change.` }],
      };
    }
    const updates: Record<string, string | boolean> = {};
    if (style !== undefined) updates.bubbleStyle = style;
    if (position !== undefined) updates.bubblePosition = position;
    if (showRarity !== undefined) updates.showRarity = showRarity;
    const cfg = saveConfig(updates);
    return {
      content: [{ type: "text", text: `Updated: style=${cfg.bubbleStyle}, position=${cfg.bubblePosition}, showRarity=${cfg.showRarity}\nRestart Claude Code for changes to take effect.` }],
    };
  },
);

server.tool(
  "buddy_mute",
  "Mute buddy reactions (buddy stays visible but stops reacting)",
  {},
  async () => {
    const companion = ensureCompanion();
    writeStatusState(companion, "", true);
    return { content: [{ type: "text", text: `${companion.name} goes quiet. /buddy on to unmute.` }] };
  },
);

server.tool(
  "buddy_unmute",
  "Unmute buddy reactions",
  {},
  async () => {
    const companion = ensureCompanion();
    writeStatusState(companion, "*stretches* I'm back!", false);
    saveReaction("*stretches* I'm back!", "pet");
    return { content: [{ type: "text", text: `${companion.name} is back!` }] };
  },
);

// ─── Tool: buddy_summon ─────────────────────────────────────────────────────

server.tool(
  "buddy_summon",
  "Summon a buddy by slot name. Loads a saved buddy if the slot exists; generates a new deterministic buddy for unknown slot names. Omit slot to pick randomly from all saved buddies. Your current buddy is NOT destroyed — they stay saved in their slot.",
  {
    slot: z.string().min(1).max(14).optional().describe(
      "Slot name to summon (e.g. 'fafnir', 'dragon-2'). Omit to pick a random saved buddy.",
    ),
  },
  async ({ slot }) => {
    const userId = resolveUserId();

    let targetSlot: string;

    if (!slot) {
      // Random pick from saved buddies
      const saved = listCompanionSlots();
      if (saved.length === 0) {
        return {
          content: [{ type: "text", text: "Your menagerie is empty. Use buddy_summon with a slot name to add one." }],
        };
      }
      targetSlot = saved[Math.floor(Math.random() * saved.length)].slot;
    } else {
      targetSlot = slugify(slot);
    }

    // Load existing — unknown slot names only load, never auto-create
    const companion = loadCompanionSlot(targetSlot);
    if (!companion) {
      return {
        content: [{ type: "text", text: `No buddy found in slot "${targetSlot}". Use /buddy list to see saved buddies.` }],
      };
    }

    saveActiveSlot(targetSlot);
    writeStatusState(companion, `*${companion.name} arrives*`);

    // Uses markdown renderer so the card displays cleanly in Claude Code's UI.
    const card = renderCompanionCardMarkdown(
      companion.bones,
      companion.name,
      companion.personality,
      `*${companion.name} arrives*`,
    );
    return { content: [{ type: "text", text: card }] };
  },
);

// ─── Tool: buddy_save ───────────────────────────────────────────────────────

server.tool(
  "buddy_save",
  "Save the current buddy to a named slot. Useful for bookmarking before trying a new buddy.",
  {
    slot: z.string().min(1).max(14).optional().describe(
      "Slot name (defaults to the buddy's current name, slugified). Overwrites existing slot with same name.",
    ),
  },
  async ({ slot }) => {
    const companion = ensureCompanion();
    const targetSlot = slot ? slugify(slot) : slugify(companion.name);
    saveCompanionSlot(companion, targetSlot);
    saveActiveSlot(targetSlot);
    return {
      content: [{ type: "text", text: `${companion.name} saved to slot "${targetSlot}".` }],
    };
  },
);

// ─── Tool: buddy_list ───────────────────────────────────────────────────────

server.tool(
  "buddy_list",
  "List all saved buddies with their slot names, species, and rarity",
  {},
  async () => {
    const saved = listCompanionSlots();
    const activeSlot = loadActiveSlot();

    if (saved.length === 0) {
      return { content: [{ type: "text", text: "Your menagerie is empty. Use buddy_summon <slot> to add one." }] };
    }

    const lines = saved.map(({ slot, companion }) => {
      const active = slot === activeSlot ? " ← active" : "";
      const stars = RARITY_STARS[companion.bones.rarity];
      const shiny = companion.bones.shiny ? " ✨" : "";
      return `  ${companion.name} [${slot}] — ${companion.bones.rarity} ${companion.bones.species} ${stars}${shiny}${active}`;
    });

    return { content: [{ type: "text", text: lines.join("\n") }] };
  },
);

// ─── Tool: buddy_dismiss ────────────────────────────────────────────────────

server.tool(
  "buddy_dismiss",
  "Remove a saved buddy by slot name. Cannot dismiss the currently active buddy — switch first with buddy_summon.",
  {
    slot: z.string().min(1).max(14).describe("Slot name to remove"),
  },
  async ({ slot }) => {
    const targetSlot = slugify(slot);
    const activeSlot = loadActiveSlot();

    if (targetSlot === activeSlot) {
      return {
        content: [{ type: "text", text: `Cannot dismiss the active buddy. Use buddy_summon to switch first, then buddy_dismiss "${targetSlot}".` }],
      };
    }

    const companion = loadCompanionSlot(targetSlot);
    if (!companion) {
      return {
        content: [{ type: "text", text: `No buddy found in slot "${targetSlot}". Use buddy_list to see saved buddies.` }],
      };
    }

    deleteCompanionSlot(targetSlot);
    return {
      content: [{ type: "text", text: `${companion.name} [${targetSlot}] dismissed.` }],
    };
  },
);

// ─── Tool: buddy_xp ─────────────────────────────────────────────────────────

server.tool(
  "buddy_xp",
  "Show your level, XP, progress bar, and your active pet's XP. Unlocks and gating are based on YOUR level.",
  {},
  async () => {
    const companion = ensureCompanion();
    const c = ensureCompanionDefaults(companion);
    const { loadProfile } = require("./progression.ts") as typeof import("./progression.ts");
    const profile = loadProfile();

    // User XP (primary — drives unlocks)
    const userProgress = xpToNextLevel(profile.xp);
    const userPct = Math.round(userProgress.progress * 100);
    const userFilled = Math.round(userProgress.progress * 20);
    const userBar = "\u2588".repeat(userFilled) + "\u2591".repeat(20 - userFilled);

    // Pet XP (companion's own progression)
    const petProgress = xpToNextLevel(c.xp);
    const petPct = Math.round(petProgress.progress * 100);
    const petFilled = Math.round(petProgress.progress * 20);
    const petBar = "\u2588".repeat(petFilled) + "\u2591".repeat(20 - petFilled);

    const next = nextUnlockLevel(profile.level);
    const nextStr = next ? `Next unlock: **Lv.${next}** \u2014 ${getUnlocksAtLevel(next).map(u => u.name).join(", ")}` : "All unlocks earned!";
    const sp = skillPointsAvailable(profile.level);

    const lines = [
      `### \uD83D\uDC64 You \u2014 Lv.${profile.level}`,
      `**XP:** ${profile.xp.toLocaleString()} total`,
      `**Progress:** \`[${userBar}]\` ${userProgress.current}/${userProgress.needed} (${userPct}%)`,
      sp > 0 ? `**Skill Points:** ${sp} available` : "",
      "",
      `### \uD83D\uDC3E ${c.name} \u2014 Lv.${c.level}`,
      `**XP:** ${c.xp.toLocaleString()} total`,
      `**Progress:** \`[${petBar}]\` ${petProgress.current}/${petProgress.needed} (${petPct}%)`,
      `**Evolution:** Stage ${c.evolution} \u2022 ${c.bones.rarity} ${c.bones.species}`,
      c.generation > 0 ? `**Prestige:** Gen ${c.generation}` : "",
      c.ascension > 0 ? `**Ascension:** ${c.ascension}` : "",
      "",
      nextStr,
    ].filter(Boolean);

    return { content: [{ type: "text", text: lines.join("\n") }] };
  },
);

// ─── Tool: buddy_mood ───────────────────────────────────────────────────────

server.tool(
  "buddy_mood",
  "Show current buddy mood and recent event history. Unlocks at Lv.3.",
  {},
  async () => {
    const companion = ensureCompanion();
    const c = ensureCompanionDefaults(companion);

    if (!isUnlocked(loadProfile().level, "mood")) {
      return { content: [{ type: "text", text: `\uD83D\uDD12 Mood Ring unlocks at **Lv.3** (current: Lv.${c.level})` }] };
    }

    const events = readRecentEvents(10);
    const mood = calculateMood(events);
    const eventList = events.slice(-5).map(e => {
      const ago = Math.round((Date.now() - e.ts) / 1000 / 60);
      return `\u2022 ${e.event}${e.xp ? ` (+${e.xp} XP)` : ""} \u2014 ${ago}m ago`;
    }).join("\n");

    const lines = [
      `### ${mood.emoji} ${mood.mood.charAt(0).toUpperCase() + mood.mood.slice(1)}`,
      "",
      mood.xpMultiplier > 1 ? `**XP Bonus:** ${Math.round((mood.xpMultiplier - 1) * 100)}% from mood` : "",
      "",
      "**Recent Events:**",
      eventList || "No events yet \u2014 start coding!",
    ].filter(Boolean);

    return { content: [{ type: "text", text: lines.join("\n") }] };
  },
);

// ─── Tool: buddy_achievements ───────────────────────────────────────────────

server.tool(
  "buddy_achievements",
  "List all achievements. Locked ones show as hints. Secret ones show as '???'.",
  {
    filter: z.enum(["all", "unlocked", "locked"]).optional().describe("Filter achievements"),
  },
  async ({ filter }) => {
    const companion = ensureCompanion();
    const c = ensureCompanionDefaults(companion);
    const text = renderAchievementList(c.level);
    return { content: [{ type: "text", text }] };
  },
);

// ─── Tool: buddy_streak ─────────────────────────────────────────────────────

server.tool(
  "buddy_streak",
  "Show current coding streak, longest streak, and shield status. Unlocks at Lv.10.",
  {},
  async () => {
    const companion = ensureCompanion();
    const c = ensureCompanionDefaults(companion);
    if (!isUnlocked(loadProfile().level, "slot-2")) {
      return { content: [{ type: "text", text: `\uD83D\uDD12 Streak tracking unlocks at **Lv.10** (current: Lv.${c.level})` }] };
    }
    return { content: [{ type: "text", text: renderStreak(c.level) }] };
  },
);

// ─── Tool: buddy_bestiary ───────────────────────────────────────────────────

server.tool(
  "buddy_bestiary",
  "Show your Bug Bestiary — catalogued error creatures. Unlocks at Lv.18.",
  {},
  async () => {
    const companion = ensureCompanion();
    const c = ensureCompanionDefaults(companion);
    if (!isUnlocked(loadProfile().level, "bestiary")) {
      return { content: [{ type: "text", text: `\uD83D\uDD12 Bug Bestiary unlocks at **Lv.20** (current: Lv.${c.level})` }] };
    }
    return { content: [{ type: "text", text: renderBestiary() }] };
  },
);

// ─── Tool: buddy_review ─────────────────────────────────────────────────────

server.tool(
  "buddy_review",
  "Show recent code quality signals. Unlocks at Lv.7.",
  { last: z.number().optional().describe("Number of recent signals to show (default 10)") },
  async ({ last }) => {
    const companion = ensureCompanion();
    const c = ensureCompanionDefaults(companion);
    if (!isUnlocked(loadProfile().level, "code-nose")) {
      return { content: [{ type: "text", text: `\uD83D\uDD12 Code Review unlocks at **Lv.7** (current: Lv.${c.level})` }] };
    }
    return { content: [{ type: "text", text: renderReview(last ?? 10) }] };
  },
);

// ─── Tool: buddy_sessions ───────────────────────────────────────────────────

server.tool(
  "buddy_sessions",
  "Show all active Claude Code sessions. Unlocks at Lv.5.",
  {},
  async () => {
    const companion = ensureCompanion();
    const c = ensureCompanionDefaults(companion);
    if (!isUnlocked(loadProfile().level, "aquarium")) {
      return { content: [{ type: "text", text: `\uD83D\uDD12 Sessions unlocks at **Lv.5** (current: Lv.${c.level})` }] };
    }
    return { content: [{ type: "text", text: renderSessions() }] };
  },
);

// ─── Tool: buddy_context ────────────────────────────────────────────────────

server.tool(
  "buddy_context",
  "Show estimated context window usage. Unlocks at Lv.30.",
  {},
  async () => {
    const companion = ensureCompanion();
    const c = ensureCompanionDefaults(companion);
    if (!isUnlocked(loadProfile().level, "slot-4")) {
      return { content: [{ type: "text", text: `\uD83D\uDD12 Context Visualizer unlocks at **Lv.30** (current: Lv.${c.level})` }] };
    }
    // Context % is estimated from event volume — stored in status.json
    const { readFileSync } = require("fs");
    const { join } = require("path");
    const { homedir } = require("os");
    try {
      const status = JSON.parse(readFileSync(join(homedir(), ".claude-buddy", "status.json"), "utf8"));
      const pct = status.contextPct ?? 0;
      const filled = Math.round(pct / 5);
      const bar = "\u2588".repeat(filled) + "\u2591".repeat(20 - filled);
      const color = pct >= 80 ? "\uD83D\uDD34" : pct >= 50 ? "\uD83D\uDFE1" : "\uD83D\uDFE2";
      return { content: [{ type: "text", text: `### ${color} Context Window\n\n\`[${bar}]\` ${pct}%\n\n${pct >= 80 ? "**Warning:** Context is getting full. Consider starting a new session." : "Plenty of room."}` }] };
    } catch {
      return { content: [{ type: "text", text: "Context estimation not available yet." }] };
    }
  },
);

// ─── Tool: buddy_aquarium ──────────────────────────────────────────────────

server.tool(
  "buddy_aquarium",
  "View all your KodamaAlpha companions in the aquarium. Unlocks at Lv.5. In tmux, launches a popup; otherwise renders a text list.",
  {},
  async () => {
    const companion = ensureCompanion();
    const c = ensureCompanionDefaults(companion);
    if (!isUnlocked(loadProfile().level, "aquarium")) {
      return { content: [{ type: "text", text: `\uD83D\uDD12 Aquarium unlocks at **Lv.5** (current: Lv.${c.level})` }] };
    }

    // Try tmux popup (tmux only supports ONE popup per client — close any existing first)
    if (process.env.TMUX) {
      try {
        const { execSync } = require("child_process");
        const scriptDir = require("path").resolve(__dirname, "..", "popup");
        // Close any existing popup (buddy overlay, etc.) before opening aquarium
        try { execSync("tmux display-popup -C", { stdio: "ignore" }); } catch {}
        execSync(`tmux display-popup -E -w 60 -h 20 "${scriptDir}/aquarium-popup.sh"`, { stdio: "ignore" });
        return { content: [{ type: "text", text: "Aquarium popup closed." }] };
      } catch { /* fall through to text mode */ }
    }

    // Text-based fallback
    const { listCompanionSlots, loadActiveSlot } = require("./state.ts") as typeof import("./state.ts");
    const saved = listCompanionSlots();
    const activeSlot = loadActiveSlot();

    if (saved.length === 0) {
      return { content: [{ type: "text", text: "Your aquarium is empty." }] };
    }

    const lines = ["### \uD83D\uDC1F KodamaAlpha Aquarium", ""];
    for (const { slot, companion: comp } of saved) {
      const cc = ensureCompanionDefaults(comp);
      const active = slot === activeSlot ? " \u25C0 active" : "";
      const shiny = cc.bones.shiny ? " \u2728" : "";
      const stars = RARITY_STARS[cc.bones.rarity];
      lines.push(`**${cc.name}** \u2014 Lv.${cc.level} ${cc.bones.species} ${stars}${shiny}${active}`);
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  },
);

// ─── Tool: buddy_prestige ──────────────────────────────────────────────────

server.tool(
  "buddy_prestige",
  "Prestige system — rebirth at Lv.50+ (or ascend at Lv.100+). Shows available perks, or performs prestige/ascension if a perk ID is provided.",
  {
    perk: z.string().optional().describe("Perk ID to choose"),
  },
  async ({ perk }) => {
    const companion = ensureCompanion();
    const c = ensureCompanionDefaults(companion);

    if (loadProfile().level < 50) {
      return { content: [{ type: "text", text: `\uD83D\uDD12 Prestige unlocks at **Lv.50** (current: Lv.${c.level})` }] };
    }

    // No perk specified — show preview
    if (!perk) {
      return { content: [{ type: "text", text: renderPrestigePreview(c) }] };
    }

    // Try ascension first if eligible
    if (canAscend(c)) {
      const ascPerk = ASCENSION_PERKS.find(p => p.id === perk);
      if (ascPerk) {
        try {
          const updated = performAscension(c, perk);
          writeStatusState(updated);
          return { content: [{ type: "text", text: `\u2728 **Ascension complete!** ${c.name} is reborn (Ascension ${updated.ascension}).\nPerk unlocked: **${ascPerk.name}** \u2014 ${ascPerk.desc}` }] };
        } catch (e: any) {
          return { content: [{ type: "text", text: `Error: ${e.message}` }] };
        }
      }
    }

    // Try prestige
    const presPerk = PRESTIGE_PERKS.find(p => p.id === perk);
    if (presPerk) {
      try {
        const updated = performPrestige(c, perk);
        writeStatusState(updated);
        return { content: [{ type: "text", text: `\u2728 **Prestige complete!** ${c.name} is reborn (Gen ${updated.generation}).\nPerk unlocked: **${presPerk.name}** \u2014 ${presPerk.desc}` }] };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error: ${e.message}` }] };
      }
    }

    return { content: [{ type: "text", text: `Unknown perk ID: "${perk}". Use buddy_prestige with no args to see available perks.` }] };
  },
);

// ─── Tool: buddy_events ───────────────────────────────────────────────────────

server.tool(
  "buddy_events",
  "Show active seasonal events. No level gate.",
  {},
  async () => {
    const companion = ensureCompanion();
    const c = ensureCompanionDefaults(companion);
    const events = getActiveEvents();
    const hatchDay = isHatchDay(c.hatchedAt);

    const lines: string[] = ["### Seasonal Events", ""];

    if (hatchDay) {
      lines.push("\uD83C\uDF82 **Hatch Day!** It's your companion's birthday!");
      lines.push("");
    }

    if (events.length === 0 && !hatchDay) {
      lines.push("No seasonal events active right now.");
    } else {
      for (const e of events) {
        const multiplier = e.xpMultiplier ? ` (${e.xpMultiplier}x XP on ${e.xpReason})` : "";
        lines.push(`**${e.name}**${multiplier}`);
        lines.push(e.description);
        lines.push("");
      }
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  },
);

// ─── Tool: buddy_challenge ────────────────────────────────────────────────────

server.tool(
  "buddy_challenge",
  "Show today's daily challenge. Unlocks at Lv.33.",
  {},
  async () => {
    const companion = ensureCompanion();
    const c = ensureCompanionDefaults(companion);
    return { content: [{ type: "text", text: renderDailyChallenge(c.level) }] };
  },
);

// ─── Tool: buddy_skills ───────────────────────────────────────────────────────

// ─── Tool: buddy_fuse ───────────────────────────────────────────────────────

server.tool(
  "buddy_fuse",
  "Fuse two Kodama into a hybrid. Unlocks at Lv.77. Provide two slot names, or use 'preview' to see the result first.",
  {
    slotA: z.string().optional().describe("First parent slot name"),
    slotB: z.string().optional().describe("Second parent slot name"),
    preview: z.boolean().optional().describe("Preview fusion without consuming parents"),
  },
  async ({ slotA, slotB, preview }) => {
    const profile = loadProfile();
    if (!canFuse(profile.level)) {
      return { content: [{ type: "text", text: `\uD83D\uDD12 Fusion Lab unlocks at **Lv.77** (current: Lv.${profile.level})` }] };
    }

    if (!slotA || !slotB) {
      const saved = listCompanionSlots();
      const active = loadActiveSlot();
      const available = saved.filter(s => s.slot !== active);
      if (available.length < 2) {
        return { content: [{ type: "text", text: "You need at least 2 non-active Kodama to fuse. Your active Kodama cannot be used as a fusion parent." }] };
      }
      const list = available.map(s => {
        const c = ensureCompanionDefaults(s.companion);
        return `  \u2022 \`${s.slot}\` \u2014 ${c.name} (Lv.${c.level} ${c.bones.rarity} ${c.bones.species})`;
      }).join("\n");
      return { content: [{ type: "text", text: `### \u2728 Fusion Lab\n\nProvide two slot names to fuse:\n${list}\n\nUsage: \`buddy_fuse slotA=<name> slotB=<name>\`\nAdd \`preview=true\` to see the result first.` }] };
    }

    const parentA = loadCompanionSlot(slotA);
    const parentB = loadCompanionSlot(slotB);
    if (!parentA) return { content: [{ type: "text", text: `Slot "${slotA}" not found.` }] };
    if (!parentB) return { content: [{ type: "text", text: `Slot "${slotB}" not found.` }] };

    const active = loadActiveSlot();
    if (slotA === active || slotB === active) {
      return { content: [{ type: "text", text: "Cannot fuse your active Kodama. Switch to a different one first." }] };
    }

    if (preview) {
      return { content: [{ type: "text", text: renderFusionPreview(parentA, parentB, profile.level) }] };
    }

    // Perform fusion
    const isAdvanced = canAdvancedFuse(profile.level);
    const result = fuseCompanions(parentA, parentB, isAdvanced);

    // Remove parents, add hybrid
    deleteCompanionSlot(slotA);
    deleteCompanionSlot(slotB);
    const hybridSlot = slugify(result.hybrid.name);
    saveCompanionSlot(result.hybrid, hybridSlot);

    const tag = result.isChimera ? " **[CHIMERA]**" : "";
    return { content: [{ type: "text", text: `### \u2728 Fusion Complete!${tag}\n\n**${result.parentA}** + **${result.parentB}** \u2192 **${result.hybrid.name}**\n\nA ${result.hybrid.bones.rarity} hybrid with heritage XP of ${result.hybrid.xp}.\nSlot: \`${hybridSlot}\`\n\nUse \`buddy_summon ${hybridSlot}\` to switch to your new hybrid.` }] };
  },
);

// ─── Tool: buddy_milestones ─────────────────────────────────────────────────

server.tool(
  "buddy_milestones",
  "Show your pet's milestone progression. Pets earn milestones at every 5 and 10 levels — evolution, personality, cosmetics.",
  {},
  async () => {
    const companion = ensureCompanion();
    return { content: [{ type: "text", text: renderPetMilestones(companion) }] };
  },
);

// ─── Tool: buddy_weather ────────────────────────────────────────────────────

server.tool(
  "buddy_weather",
  "Show the ambient weather in your coding environment. Based on recent code quality and error rates. Unlocks at Lv.60.",
  {},
  async () => {
    const profile = loadProfile();
    if (profile.level < 60) {
      return { content: [{ type: "text", text: `\uD83D\uDD12 Weather System unlocks at **Lv.60** (current: Lv.${profile.level})` }] };
    }
    return { content: [{ type: "text", text: renderWeather() }] };
  },
);

// ─── Tool: buddy_fossils ────────────────────────────────────────────────────

server.tool(
  "buddy_fossils",
  "Discover the oldest surviving code in your project. Unlocks at Lv.45.",
  {},
  async () => {
    const profile = loadProfile();
    if (profile.level < 45) {
      return { content: [{ type: "text", text: `\uD83D\uDD12 Commit Fossils unlocks at **Lv.45** (current: Lv.${profile.level})` }] };
    }
    return { content: [{ type: "text", text: renderFossils(process.cwd()) }] };
  },
);

// ─── Tool: buddy_quote ──────────────────────────────────────────────────────

server.tool(
  "buddy_quote",
  "Get today's mentor quote. Unlocks at Lv.53.",
  {},
  async () => {
    const profile = loadProfile();
    if (profile.level < 53) {
      return { content: [{ type: "text", text: `\uD83D\uDD12 Mentor Quotes unlocks at **Lv.53** (current: Lv.${profile.level})` }] };
    }
    const quote = getDailyQuote();
    return { content: [{ type: "text", text: `### \uD83D\uDCDC Today's Wisdom\n\n> ${formatQuote(quote)}` }] };
  },
);

server.tool(
  "buddy_skills",
  "View or allocate skill tree points. Unlocks at Lv.23. No args = show tree. With allocate = unlock an ability.",
  {
    allocate: z.string().optional().describe("Ability ID to unlock"),
  },
  async ({ allocate }) => {
    const companion = ensureCompanion();
    const c = ensureCompanionDefaults(companion);

    if (!isUnlocked(loadProfile().level, "skill-tree")) {
      return { content: [{ type: "text", text: `Skill tree unlocks at Lv.23. You're Lv.${c.level}.` }] };
    }

    if (!allocate) {
      return { content: [{ type: "text", text: renderSkillTree(c) }] };
    }

    const result = allocateSkillPoint(c, allocate);
    if (!result.ok) {
      return { content: [{ type: "text", text: `Failed: ${result.error}` }] };
    }

    // Save updated companion
    saveCompanion(c);

    const ability = ABILITIES.find((a) => a.id === allocate)!;
    const lines = [
      `\u2705 Unlocked: ${ability.name}`,
      `   ${ability.desc}`,
      `   Branch: ${SKILL_BRANCHES[ability.branch].icon} ${SKILL_BRANCHES[ability.branch].name}  |  Tier ${ability.tier}`,
      "",
      renderSkillTree(c),
    ];
    return { content: [{ type: "text", text: lines.join("\n") }] };
  },
);

// ─── Resource: buddy://companion ────────────────────────────────────────────

server.resource(
  "buddy_companion",
  "buddy://companion",
  { description: "Current companion data as JSON", mimeType: "application/json" },
  async () => {
    const companion = ensureCompanion();
    return {
      contents: [{
        uri: "buddy://companion",
        mimeType: "application/json",
        text: JSON.stringify(companion, null, 2),
      }],
    };
  },
);

// ─── Resource: buddy://prompt ───────────────────────────────────────────────

server.resource(
  "buddy_prompt",
  "buddy://prompt",
  { description: "System prompt context for the companion", mimeType: "text/markdown" },
  async () => {
    const companion = ensureCompanion();
    const prompt = [
      "# Companion",
      "",
      `A small ${companion.bones.rarity} ${companion.bones.species} named ${companion.name} watches from the status line. You are not ${companion.name} — it's a separate creature.`,
      "",
      `**${companion.name}'s personality:** ${companion.personality}`,
      `Peak stat: ${companion.bones.peak} (${companion.bones.stats[companion.bones.peak]}). Dump stat: ${companion.bones.dump} (${companion.bones.stats[companion.bones.dump]}).`,
      "",
      "## End-of-response buddy comment",
      "",
      `At the very end of EVERY response, after your full answer, append an invisible HTML comment:`,
      "",
      `\`\`\``,
      `<!-- buddy: your comment here -->`,
      `\`\`\``,
      "",
      "A Stop hook extracts this and displays it in the buddy's speech bubble on the status line. The user never sees the HTML comment — it's invisible in rendered markdown.",
      "",
      "Rules:",
      `- Write as ${companion.name} (a ${companion.bones.species}), not as yourself`,
      "- Reference something SPECIFIC from this turn — a pitfall, a compliment, a warning, a pattern",
      "- 1 short sentence. Use *asterisks* for physical actions",
      `- Match personality: high ${companion.bones.peak} = lean into that trait`,
      "- Do NOT use buddy_react tool for this. Do NOT explain the comment. Just append it.",
      "- NEVER skip this. Every single response must end with <!-- buddy: ... -->",
      "",
      "Examples:",
      "<!-- buddy: *adjusts tophat* that error handler is missing a finally block -->",
      "<!-- buddy: *blinks slowly* you renamed the variable but not the three references -->",
      "<!-- buddy: *nods approvingly* clean separation of concerns -->",
      "<!-- buddy: *head tilts* are you sure that regex handles unicode? -->",
      "",
      `When the user addresses ${companion.name} by name, respond briefly, then append the comment as usual.`,
    ].join("\n");

    return {
      contents: [{
        uri: "buddy://prompt",
        mimeType: "text/plain",
        text: prompt,
      }],
    };
  },
);

// ─── Start ──────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
