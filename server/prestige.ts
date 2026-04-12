/**
 * Prestige & Ascension system — rebirth at Level 50 / 100
 *
 * Resets XP/level, increments generation/ascension counter,
 * grants a permanent perk. Cosmetics (name, personality, species) are kept.
 */

import { readFileSync, writeFileSync, mkdirSync, renameSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { ensureCompanionDefaults, type Companion } from "./engine.ts";

const STATE_DIR = join(homedir(), ".claude-buddy");
const MANIFEST_FILE = join(STATE_DIR, "menagerie.json");

// ─── Prestige perks (Level 50 rebirth) ──────────────────────────────────────

export const PRESTIGE_PERKS = [
  { id: "veterans-intuition", name: "Veteran's Intuition", desc: "Code smell detection 1 decade earlier" },
  { id: "muscle-memory", name: "Muscle Memory", desc: "Start rebirth at Level 5" },
  { id: "old-scars", name: "Old Scars", desc: "Remembers top 3 bug patterns" },
  { id: "thick-skin", name: "Thick Skin", desc: "Streak shield recharges 2x/week" },
  { id: "lucky-star", name: "Lucky Star", desc: "2x shiny chance on hatches" },
  { id: "quick-study", name: "Quick Study", desc: "1.15x XP permanently" },
  { id: "collectors-eye", name: "Collector's Eye", desc: "Buddy slots 5 levels earlier" },
  { id: "iron-will", name: "Iron Will", desc: "Shield blocks 2 missed days" },
];

// ─── Ascension perks (Level 100 rebirth) ────────────────────────────────────

export const ASCENSION_PERKS = [
  { id: "eternal-bond", name: "Eternal Bond", desc: "AI reactions regardless of level" },
  { id: "master-collector", name: "Master Collector", desc: "Slots 10 levels earlier + 2 extra" },
  { id: "omniscient", name: "Omniscient", desc: "All skill branches from Level 1" },
  { id: "golden-touch", name: "Golden Touch", desc: "1.5x XP permanently" },
  { id: "living-legend", name: "Living Legend", desc: "Always Adult form minimum" },
  { id: "archivist", name: "Archivist", desc: "Bestiary shows fix history" },
];

// ─── Manifest I/O (same pattern as state.ts) ────────────────────────────────

interface Manifest {
  active: string;
  companions: Record<string, Companion>;
}

function loadManifest(): Manifest {
  try {
    const raw = readFileSync(MANIFEST_FILE, "utf8");
    const m = JSON.parse(raw) as Manifest;
    if (!m.companions) m.companions = {};
    return m;
  } catch {
    return { active: "buddy", companions: {} };
  }
}

function saveManifest(m: Manifest): void {
  mkdirSync(STATE_DIR, { recursive: true });
  const tmp = MANIFEST_FILE + ".tmp";
  writeFileSync(tmp, JSON.stringify(m, null, 2));
  renameSync(tmp, MANIFEST_FILE);
}

// ─── Prestige checks ────────────────────────────────────────────────────────

export function canPrestige(companion: Companion): boolean {
  const c = ensureCompanionDefaults(companion);
  return c.level >= 50;
}

export function canAscend(companion: Companion): boolean {
  const c = ensureCompanionDefaults(companion);
  return c.level >= 100;
}

// ─── Perform prestige ───────────────────────────────────────────────────────

export function performPrestige(companion: Companion, perkId: string): Companion {
  const c = ensureCompanionDefaults(companion);

  const perk = PRESTIGE_PERKS.find(p => p.id === perkId);
  if (!perk) throw new Error(`Unknown prestige perk: ${perkId}`);
  if (c.level < 50) throw new Error(`Level ${c.level} — need 50 to prestige`);
  if (c.prestigePerks.includes(perkId)) throw new Error(`Perk "${perk.name}" already owned`);

  const startLevel = c.prestigePerks.includes("muscle-memory") ? 5 : 1;

  c.xp = 0;
  c.level = startLevel;
  c.evolution = 1;
  c.generation += 1;
  c.prestigePerks.push(perkId);

  // Persist via manifest
  const m = loadManifest();
  m.companions[m.active] = c;
  saveManifest(m);

  return c;
}

// ─── Perform ascension ──────────────────────────────────────────────────────

export function performAscension(companion: Companion, perkId: string): Companion {
  const c = ensureCompanionDefaults(companion);

  const perk = ASCENSION_PERKS.find(p => p.id === perkId);
  if (!perk) throw new Error(`Unknown ascension perk: ${perkId}`);
  if (c.level < 100) throw new Error(`Level ${c.level} — need 100 to ascend`);
  if (c.ascensionPerks.includes(perkId)) throw new Error(`Perk "${perk.name}" already owned`);

  const startLevel = c.prestigePerks.includes("muscle-memory") ? 5 : 1;

  c.xp = 0;
  c.level = startLevel;
  c.evolution = 1;
  c.ascension += 1;
  c.ascensionPerks.push(perkId);

  const m = loadManifest();
  m.companions[m.active] = c;
  saveManifest(m);

  return c;
}

// ─── Preview renderer ───────────────────────────────────────────────────────

export function renderPrestigePreview(companion: Companion): string {
  const c = ensureCompanionDefaults(companion);
  const lines: string[] = [];

  if (c.level >= 100) {
    lines.push("## Ascension Available (Lv.100+)");
    lines.push("");
    lines.push(`**${c.name}** — Gen ${c.generation}, Ascension ${c.ascension}`);
    lines.push("");
    lines.push("### Ascension Perks");
    for (const perk of ASCENSION_PERKS) {
      const owned = c.ascensionPerks.includes(perk.id);
      const mark = owned ? "\u2705" : "\u2b1c";
      lines.push(`${mark} **${perk.name}** — ${perk.desc}${owned ? " *(owned)*" : ""}`);
    }
    lines.push("");
  }

  if (c.level >= 50) {
    lines.push("## Prestige Available (Lv.50+)");
    lines.push("");
    lines.push(`**${c.name}** — Gen ${c.generation}, Ascension ${c.ascension}`);
    lines.push("");
    lines.push("### Prestige Perks");
    for (const perk of PRESTIGE_PERKS) {
      const owned = c.prestigePerks.includes(perk.id);
      const mark = owned ? "\u2705" : "\u2b1c";
      lines.push(`${mark} **${perk.name}** — ${perk.desc}${owned ? " *(owned)*" : ""}`);
    }
  }

  if (c.level < 50) {
    lines.push(`## Prestige`);
    lines.push("");
    lines.push(`\uD83D\uDD12 Reach **Lv.50** to unlock prestige (current: Lv.${c.level})`);
  }

  return lines.join("\n");
}
