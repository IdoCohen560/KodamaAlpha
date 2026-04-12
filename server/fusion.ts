/**
 * KodamaAlpha Fusion System — combine two Kodama into a hybrid
 *
 * Fusion Lab unlocks at Level 77 (user level). Buddy Fusion unlock at L93.
 *
 * How it works:
 * - Pick two owned Kodama (neither can be the active one)
 * - The fusion consumes both and creates a new hybrid
 * - The hybrid inherits traits from both parents:
 *   - Species: one parent's species with the other's eye character
 *   - Rarity: the higher rarity of the two parents
 *   - Stats: averaged stats with a bonus based on parent levels
 *   - Hat: inherited from the higher-level parent
 *   - Shiny: if either parent was shiny, 25% chance hybrid is shiny (vs normal 1%)
 *   - Personality: blended from both parents
 *   - XP: starts at 0 but gets a "heritage bonus" (10% of combined parent XP)
 *
 * Fusion produces a UNIQUE companion that can't be hatched normally.
 * The hybrid's species name is a portmanteau: "drag-owl" (dragon + owl).
 *
 * Evolution through fusion:
 * - Basic Fusion (L77): combine any 2 Kodama
 * - Advanced Fusion (L93): combine a hybrid with another Kodama for a "tier 2" hybrid
 *   Tier 2 hybrids get a special "Chimera" tag and boosted stats
 */

import type { Companion, BuddyBones, BuddyStats, Species, Rarity, Eye, Hat } from "./engine.ts";
import { ensureCompanionDefaults, SPECIES, RARITIES, RARITY_WEIGHTS, SHINY_COLORS } from "./engine.ts";

// ─── Portmanteau names ──────────────────────────────────────────────────────

function portmanteau(a: string, b: string): string {
  // Take first half of species A, second half of species B
  const midA = Math.ceil(a.length / 2);
  const midB = Math.floor(b.length / 2);
  return a.slice(0, midA) + b.slice(midB);
}

// ─── Rarity comparison ──────────────────────────────────────────────────────

const RARITY_ORDER: Record<Rarity, number> = {
  common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4,
};

function higherRarity(a: Rarity, b: Rarity): Rarity {
  return RARITY_ORDER[a] >= RARITY_ORDER[b] ? a : b;
}

// ─── Stat averaging with bonus ──────────────────────────────────────────────

function fuseStats(a: BuddyStats, b: BuddyStats, bonusPct: number): BuddyStats {
  const stats = {} as BuddyStats;
  const keys: (keyof BuddyStats)[] = ["DEBUGGING", "PATIENCE", "CHAOS", "WISDOM", "SNARK"];
  for (const key of keys) {
    const avg = Math.floor((a[key] + b[key]) / 2);
    const bonus = Math.floor(avg * bonusPct / 100);
    stats[key] = Math.min(100, avg + bonus);
  }
  return stats;
}

// ─── Fusion ─────────────────────────────────────────────────────────────────

export interface FusionResult {
  hybrid: Companion;
  parentA: string;  // name
  parentB: string;  // name
  hybridSpeciesName: string;
  isChimera: boolean;
}

export function canFuse(userLevel: number): boolean {
  return userLevel >= 77;
}

export function canAdvancedFuse(userLevel: number): boolean {
  return userLevel >= 93;
}

export function fuseCompanions(
  parentA: Companion,
  parentB: Companion,
  isAdvanced: boolean = false,
): FusionResult {
  const a = ensureCompanionDefaults(parentA);
  const b = ensureCompanionDefaults(parentB);

  // Guard: cannot fuse a companion with itself
  if (a.name === b.name && a.hatchedAt === b.hatchedAt) {
    throw new Error("Cannot fuse a Kodama with itself");
  }

  // Species portmanteau
  const hybridSpeciesName = portmanteau(a.bones.species, b.bones.species);

  // Inherit traits
  const higherParent = a.level >= b.level ? a : b;
  const lowerParent = a.level >= b.level ? b : a;

  // Stat bonus: 5% per combined parent level, capped at 20%
  const bonusPct = Math.min(20, Math.floor((a.level + b.level) * 5 / 10));

  // Shiny: 25% if either parent is shiny, else 1%
  const shinyChance = (a.bones.shiny || b.bones.shiny) ? 0.25 : 0.01;
  const isShiny = Math.random() < shinyChance;
  const shinyColor = isShiny ? SHINY_COLORS[Math.floor(Math.random() * SHINY_COLORS.length)] : undefined;

  // Heritage XP: 10% of combined parent XP
  const heritageXP = Math.floor((a.xp + b.xp) * 0.1);

  const fusedStats = fuseStats(a.bones.stats, b.bones.stats, bonusPct);

  // Find peak and dump stats
  const statKeys: (keyof BuddyStats)[] = ["DEBUGGING", "PATIENCE", "CHAOS", "WISDOM", "SNARK"];
  let peak = statKeys[0], dump = statKeys[0];
  for (const k of statKeys) {
    if (fusedStats[k] > fusedStats[peak]) peak = k;
    if (fusedStats[k] < fusedStats[dump]) dump = k;
  }

  const bones: BuddyBones = {
    rarity: higherRarity(a.bones.rarity, b.bones.rarity),
    species: higherParent.bones.species,  // primary species from higher-level parent
    eye: lowerParent.bones.eye,           // eyes from other parent
    hat: higherParent.bones.hat,
    shiny: isShiny,
    shinyColor,
    stats: fusedStats,
    peak: peak as any,
    dump: dump as any,
  };

  const isChimera = isAdvanced;

  const hybrid: Companion = {
    bones,
    name: hybridSpeciesName.charAt(0).toUpperCase() + hybridSpeciesName.slice(1),
    personality: isChimera
      ? `A chimera born from ${a.name} and ${b.name}. Contains multitudes. Twice-fused, it radiates ancient power.`
      : `A hybrid of ${a.name} (${a.bones.species}) and ${b.name} (${b.bones.species}). Inherits the best of both spirits.`,
    hatchedAt: Date.now(),
    userId: a.userId,
    xp: heritageXP,
    level: 1,
    evolution: 1,
    totalCommits: 0,
    totalTestsPassed: 0,
    totalErrors: 0,
    totalSessionMinutes: 0,
    generation: 0,
    ascension: 0,
    prestigePerks: [],
    ascensionPerks: [],
    allocatedSkills: [],
  };

  return {
    hybrid,
    parentA: a.name,
    parentB: b.name,
    hybridSpeciesName,
    isChimera,
  };
}

// ─── Render ─────────────────────────────────────────────────────────────────

export function renderFusionPreview(a: Companion, b: Companion, userLevel: number): string {
  const ca = ensureCompanionDefaults(a);
  const cb = ensureCompanionDefaults(b);
  const hybridName = portmanteau(ca.bones.species, cb.bones.species);
  const resultRarity = higherRarity(ca.bones.rarity, cb.bones.rarity);
  const bonusPct = Math.min(20, Math.floor((ca.level + cb.level) * 5 / 10));
  const heritageXP = Math.floor((ca.xp + cb.xp) * 0.1);
  const isAdvanced = canAdvancedFuse(userLevel);
  const shinyChance = (ca.bones.shiny || cb.bones.shiny) ? "25%" : "1%";

  const lines = [
    `### \u2728 Fusion Preview`,
    "",
    `**Parent A:** ${ca.name} (Lv.${ca.level} ${ca.bones.rarity} ${ca.bones.species})`,
    `**Parent B:** ${cb.name} (Lv.${cb.level} ${cb.bones.rarity} ${cb.bones.species})`,
    "",
    `\u27A1\uFE0F **Result:** ${hybridName} (${resultRarity} hybrid)`,
    `  \u2022 Species art from ${ca.level >= cb.level ? ca.name : cb.name}, eyes from ${ca.level >= cb.level ? cb.name : ca.name}`,
    `  \u2022 Stats: averaged with +${bonusPct}% fusion bonus`,
    `  \u2022 Heritage XP: ${heritageXP}`,
    `  \u2022 Shiny chance: ${shinyChance}`,
    isAdvanced ? `  \u2022 **CHIMERA** tag (tier 2 fusion)` : "",
    "",
    `\u26A0\uFE0F **Warning:** Both parents will be consumed. This cannot be undone.`,
  ].filter(Boolean);

  return lines.join("\n");
}
