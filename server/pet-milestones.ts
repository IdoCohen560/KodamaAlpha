/**
 * KodamaAlpha Pet Milestones — rewards at every pet level 5 and 10
 *
 * Pet milestones are cosmetic, personality, and reaction-based.
 * They make the pet more alive and expressive but don't gate features
 * (user level handles gating).
 */

import type { Companion } from "./engine.ts";

export type MilestoneType = "evolution" | "personality" | "cosmetic";

export interface PetMilestone {
  petLevel: number;
  id: string;
  name: string;
  desc: string;
  type: MilestoneType;
  effect: string;
}

export const PET_MILESTONES: PetMilestone[] = [
  { petLevel: 5,   id: "hatch",            name: "Hatch",              desc: "Egg breaks, species art appears",                                    type: "evolution",    effect: "evolution-2" },
  { petLevel: 10,  id: "first-word",       name: "First Word",         desc: "Reaction pool doubles from 4 to 8 per species/event",                type: "personality",  effect: "reaction-pool-expand-1" },
  { petLevel: 15,  id: "juvenile",         name: "Juvenile Form",      desc: "Bigger art with limbs, can equip accessories",                       type: "evolution",    effect: "evolution-3" },
  { petLevel: 20,  id: "mood-eyes",        name: "Mood Expressions",   desc: "Pet's face changes with mood (happy eyes, sad eyes, excited eyes)",  type: "cosmetic",     effect: "mood-face-swap" },
  { petLevel: 25,  id: "adult",            name: "Adult Form",         desc: "Full body art with dynamic status symbol",                           type: "evolution",    effect: "evolution-4" },
  { petLevel: 30,  id: "signature-move",   name: "Signature Move",     desc: "Pet gets 1 unique reaction generated from species+rarity+stats",     type: "personality",  effect: "unique-reaction" },
  { petLevel: 35,  id: "idle-anims",       name: "Idle Animations",    desc: "3 new idle frames (stretching, sleeping, playing)",                  type: "cosmetic",     effect: "extra-idle-frames" },
  { petLevel: 40,  id: "elder",            name: "Elder Form",         desc: "Glowing star elements in art",                                       type: "evolution",    effect: "evolution-5" },
  { petLevel: 45,  id: "error-memory",     name: "Memory",             desc: "Pet remembers your 3 most common errors, reacts specifically",       type: "personality",  effect: "error-memory" },
  { petLevel: 50,  id: "mythic-title",     name: "Mythic Form + Title",desc: "Mythic art + pet earns a title (e.g., 'the Vigilant')",              type: "evolution",    effect: "evolution-6-title" },
  { petLevel: 55,  id: "emote-set",        name: "Emote Set",          desc: "Pet can express 5 distinct emotions with unique art frames",         type: "cosmetic",     effect: "emote-frames" },
  { petLevel: 60,  id: "species-mastery",  name: "Species Mastery",    desc: "Reactions become more sophisticated and longer",                     type: "personality",  effect: "reaction-pool-expand-2" },
  { petLevel: 65,  id: "aura-eligible",    name: "Aura Eligible",      desc: "Pet can now display earned aura effects",                            type: "cosmetic",     effect: "aura-display" },
  { petLevel: 70,  id: "mentor-mode",      name: "Mentor Mode",        desc: "Pet occasionally quotes its species philosophy",                     type: "personality",  effect: "species-quotes" },
  { petLevel: 75,  id: "animated-idle",    name: "Animated Idle",      desc: "Art cycles through frames automatically even without events",        type: "cosmetic",     effect: "auto-animate" },
  { petLevel: 80,  id: "cosmic",           name: "Cosmic Form",        desc: "Animated Unicode art with particle effects",                         type: "evolution",    effect: "evolution-7" },
  { petLevel: 85,  id: "legacy-name",      name: "Legacy",             desc: "Pet's name appears in gold in aquarium",                             type: "cosmetic",     effect: "gold-name" },
  { petLevel: 90,  id: "ancient",          name: "Ancient",            desc: "Pet gets a 'lived through X sessions' counter displayed",            type: "personality",  effect: "session-counter" },
  { petLevel: 95,  id: "enlightened",      name: "Enlightened",        desc: "Pet reactions reference your actual code patterns",                  type: "personality",  effect: "code-aware-reactions" },
  { petLevel: 100, id: "eternal",          name: "Eternal",            desc: "Permanent crown + 'Eternal' prefix + never repeats reactions",       type: "evolution",    effect: "eternal-status" },
];

// ─── Signature move generation ──────────────────────────────────────────────

const SIGNATURE_TEMPLATES: Record<string, string[]> = {
  duck:     ["*executes the legendary Quack Attack*", "*performs the ancient waddle of wisdom*", "*deploys tactical bread crumbs*"],
  goose:    ["*unleashes the HONK OF DESTINY*", "*executes a perfect wing-span power move*", "*channels pure chaotic goose energy*"],
  blob:     ["*achieves maximum jiggle resonance*", "*splits into two blobs of pure focus*", "*absorbs the entire error into itself*"],
  cat:      ["*performs the legendary triple-paw bap*", "*executes the ancient nap-and-fix technique*", "*activates 'I meant to do that' mode*"],
  dragon:   ["*breathes the Flame of Refactoring*", "*executes the Claw of Compilation*", "*channels the ancient Dragon Debug*"],
  octopus:  ["*activates all 8 arms simultaneously*", "*performs the Ink Cloud of Clarity*", "*executes the Deep Sea Debug Dance*"],
  owl:      ["*performs the 360-degree Head Rotation of Judgment*", "*executes the Wisdom Screech*", "*activates Total Knowledge Mode*"],
  penguin:  ["*performs the Formal Bow of Approval*", "*executes the Antarctic Slide Fix*", "*channels Penguin Precision Protocol*"],
  turtle:   ["*performs the Shell Shield Technique*", "*executes the Ancient Slow Fix*", "*channels 1000 years of patience*"],
  snail:    ["*leaves a trail of golden slime*", "*performs the Spiral Shell Meditation*", "*achieves terminal velocity (0.03 mph)*"],
  ghost:    ["*phases through the entire call stack*", "*performs the Spectral Code Review*", "*haunts the bug out of existence*"],
  axolotl:  ["*regenerates the entire function*", "*performs the Gill Flutter of Joy*", "*activates Maximum Regeneration Mode*"],
  capybara:  ["*achieves a state of perfect chill*", "*performs the Unbothered Head Pat*", "*radiates calming aura in all directions*"],
  cactus:   ["*blooms with the force of a thousand suns*", "*performs the Thorn Shield Defense*", "*channels desert survival instincts*"],
  robot:    ["*EXECUTES PROTOCOL OMEGA*", "*ACTIVATES MAXIMUM COMPUTE MODE*", "*DEPLOYS EMERGENCY DEBUG SUBROUTINE*"],
  rabbit:   ["*performs the legendary Binky of Victory*", "*executes hyperspeed zoomies*", "*channels pure rabbit chaos energy*"],
  mushroom: ["*releases the Spore Cloud of Enlightenment*", "*performs the Mycelial Network Merge*", "*achieves fungal singularity*"],
  chonk:    ["*performs the Absolute Unit Sit*", "*executes the Chonk Roll of Power*", "*achieves Maximum Chonk State*"],
  fox:      ["*performs the Clever Shortcut Maneuver*", "*executes 'works on my machine' with confidence*", "*channels pure fox cunning*"],
  bat:      ["*performs the Ultrasonic Debug Scan*", "*executes the Dark Mode Power-Up*", "*echolocates every bug in the codebase*"],
  panda:    ["*performs the Bamboo Break Technique*", "*executes the Unbothered Roll*", "*achieves peak bamboo-zen state*"],
  phoenix:  ["*RISES FROM THE ASHES IN GOLDEN FLAME*", "*performs the Rebirth Protocol*", "*channels the eternal fire of persistence*"],
  wolf:     ["*performs the Alpha Howl of Victory*", "*executes the Pack Formation Debug*", "*channels the instinct of the hunt*"],
  slime:    ["*achieves Critical Mass Jiggle*", "*performs the Absorption Technique*", "*grows three sizes and engulfs the bug*"],
  crystal:  ["*resonates at the Perfect Frequency*", "*performs the Prismatic Analysis*", "*channels pure type-safe energy*"],
};

export function generateSignatureMove(species: string, rarity: string, peakStat: string): string {
  const pool = SIGNATURE_TEMPLATES[species] ?? SIGNATURE_TEMPLATES.blob;
  // Deterministic pick based on species+rarity+peakStat
  const hash = (species + rarity + peakStat).split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  return pool[Math.abs(hash) % pool.length];
}

// ─── Pet title generation ───────────────────────────────────────────────────

const TITLE_POOL: Record<string, string[]> = {
  DEBUGGING: ["the Debugger", "the Keen-Eyed", "the Bug Hunter", "the Vigilant"],
  PATIENCE:  ["the Patient", "the Steadfast", "the Enduring", "the Wise"],
  CHAOS:     ["the Chaotic", "the Unpredictable", "the Wild", "the Untamed"],
  WISDOM:    ["the Wise", "the Sage", "the All-Knowing", "the Enlightened"],
  SNARK:     ["the Snarky", "the Sharp-Tongued", "the Witty", "the Sardonic"],
};

export function generatePetTitle(species: string, peakStat: string): string {
  const pool = TITLE_POOL[peakStat] ?? TITLE_POOL.WISDOM;
  const hash = (species + peakStat).split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  return pool[Math.abs(hash) % pool.length];
}

// ─── Query functions ────────────────────────────────────────────────────────

export function getMilestoneAtLevel(petLevel: number): PetMilestone | undefined {
  return PET_MILESTONES.find(m => m.petLevel === petLevel);
}

export function getMilestonesUnlocked(petLevel: number): PetMilestone[] {
  return PET_MILESTONES.filter(m => m.petLevel <= petLevel);
}

export function getNextMilestone(petLevel: number): PetMilestone | undefined {
  return PET_MILESTONES.find(m => m.petLevel > petLevel);
}

export function hasMilestone(petLevel: number, milestoneId: string): boolean {
  const m = PET_MILESTONES.find(ms => ms.id === milestoneId);
  return m ? petLevel >= m.petLevel : false;
}

// ─── Render ─────────────────────────────────────────────────────────────────

export function renderPetMilestones(companion: Companion): string {
  const { ensureCompanionDefaults } = require("./engine.ts") as typeof import("./engine.ts");
  const c = ensureCompanionDefaults(companion);
  const unlocked = getMilestonesUnlocked(c.level);
  const next = getNextMilestone(c.level);

  const lines: string[] = [
    `### \uD83D\uDC3E ${c.name}'s Milestones (${unlocked.length}/${PET_MILESTONES.length})`,
    "",
  ];

  for (const m of PET_MILESTONES) {
    const isUnlocked = c.level >= m.petLevel;
    const icon = m.type === "evolution" ? "\uD83C\uDF1F" : m.type === "personality" ? "\uD83D\uDCAC" : "\uD83C\uDFA8";

    if (isUnlocked) {
      lines.push(`\u2705 **Lv.${m.petLevel}** ${icon} ${m.name} \u2014 ${m.desc}`);
    } else if (m === next) {
      lines.push(`\u27A1\uFE0F **Lv.${m.petLevel}** ${icon} ${m.name} \u2014 ${m.desc} *(next!)*`);
    } else {
      lines.push(`\u26AB **Lv.${m.petLevel}** \u2014 ???`);
    }
  }

  if (hasMilestone(c.level, "signature-move")) {
    const sig = generateSignatureMove(c.bones.species, c.bones.rarity, c.bones.peak);
    lines.push("");
    lines.push(`**Signature Move:** ${sig}`);
  }

  if (hasMilestone(c.level, "mythic-title")) {
    const title = generatePetTitle(c.bones.species, c.bones.peak);
    lines.push(`**Title:** ${c.name} ${title}`);
  }

  return lines.join("\n");
}
