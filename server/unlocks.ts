/**
 * claude-den unlock system — level-gated features, cosmetics, and progression
 *
 * Unlocks happen ONLY at levels 3, 5, 7, 10 within each decade (4 per 10 levels).
 * All other levels are "quiet" — XP earned but nothing new unlocks.
 */

export interface Unlock {
  id: string;
  name: string;
  desc: string;
  category: "core" | "feature" | "collection" | "cosmetic" | "progression";
}

export const UNLOCKS: Record<number, Unlock[]> = {
  // Decade 1: Foundations
  1:  [{ id: "hatch",           name: "Hatch",                    desc: "Egg appears in status line",                        category: "core" }],
  3:  [{ id: "mood",            name: "Mood Ring",                desc: "Buddy color reflects session health",               category: "feature" }],
  5:  [{ id: "aquarium",        name: "Aquarium + Hatchling",     desc: "Egg hatches. Aquarium popup available.",            category: "feature" }],
  7:  [{ id: "code-nose",       name: "Code Nose",                desc: "Code smell detection with species quips",           category: "feature" }],
  10: [{ id: "slot-2",          name: "2nd Buddy + Streaks",      desc: "Hatch second companion. Streak tracking.",          category: "collection" }],

  // Decade 2: Growth
  13: [{ id: "streak-shield",   name: "Streak Shield + Tophat",   desc: "1 streak-freeze/week. Tophat hat.",                 category: "feature" }],
  15: [{ id: "evo-3",           name: "Juvenile Form",            desc: "Bigger art, limbs, can equip accessories",          category: "cosmetic" }],
  17: [{ id: "custom-eyes",     name: "Custom Eyes + Diamond",    desc: "Change eyes. Diamond eye unlocked.",                category: "cosmetic" }],
  20: [{ id: "slot-3",          name: "3rd Buddy + Bestiary",     desc: "New companion. Bug Bestiary activated.",            category: "collection" }],

  // Decade 3: Specialization
  23: [{ id: "skill-tree",      name: "Skill Tree + Wizard Hat",  desc: "Choose branch. Wizard hat. Skill point 1.",        category: "progression" }],
  25: [{ id: "senior-dev",      name: "Senior Dev + Adult Form",  desc: "Code reviews. Full-body art.",                      category: "feature" }],
  27: [{ id: "bestiary-lore",   name: "Lore + Wand + SP2",       desc: "Bestiary flavor text. Wand accessory. Skill pt 2.", category: "feature" }],
  30: [{ id: "slot-4",          name: "4th Buddy + Context Viz",  desc: "New companion. Context usage bar.",                 category: "collection" }],

  // Decade 4: Mastery
  33: [{ id: "daily-challenge", name: "Challenges + Viking + SP3",desc: "Daily challenges. Viking hat. Skill point 3.",      category: "feature" }],
  35: [{ id: "war-room",        name: "War Room + Mood Speech",   desc: "Cross-session view. Mood affects reactions.",       category: "feature" }],
  37: [{ id: "rare-spawns",     name: "Rare Spawns + \u2299 Eye + SP4", desc: "Seasonal bugs. Target eye. Skill point 4.",  category: "feature" }],
  40: [{ id: "slot-5",          name: "5th Buddy + Elder Form",   desc: "New companion. Glowing star art.",                  category: "collection" }],

  // Decade 5: Endgame
  43: [{ id: "detective-hat",   name: "Detective + Flame + SP5",  desc: "Detective hat. Flame aura eligible. Skill pt 5.",   category: "cosmetic" }],
  45: [{ id: "hatch-day",       name: "Hatch Day + Fossils",      desc: "Anniversary events. Code fossils.",                 category: "feature" }],
  47: [{ id: "aquarium-themes", name: "Themes + Compass + SP6",   desc: "Aquarium themes. Compass accessory. Skill pt 6.",  category: "cosmetic" }],
  50: [{ id: "prestige",        name: "Prestige + Mythic + SP7",  desc: "Rebirth. Mythic art. Capstone skill.",              category: "feature" }],

  // Decade 6: Post-Prestige
  53: [{ id: "slot-6",          name: "6th Buddy + Mentor Quotes",desc: "New companion. Famous programmer quotes.",          category: "collection" }],
  55: [{ id: "auto-items",      name: "Auto-Context Items",       desc: "Accessories change based on current task",          category: "feature" }],
  57: [{ id: "legacy-titles",   name: "Legacy Titles + Reactions",desc: "Title from skill branch. 30 new reactions.",        category: "cosmetic" }],
  60: [{ id: "slot-7",          name: "7th Buddy + Weather",      desc: "New companion. Aquarium weather system.",           category: "collection" }],

  // Decade 7: Veteran
  63: [{ id: "ai-personality",  name: "Buddy Personality AI",     desc: "AI-generated unique reactions per buddy",           category: "feature" }],
  65: [{ id: "cross-project",   name: "Cross-Project Memory",     desc: "Buddy remembers patterns across projects",          category: "feature" }],
  67: [{ id: "showcase",        name: "Showcase + Bestiary %",    desc: "Badge showcase. Bestiary completion tracker.",       category: "feature" }],
  70: [{ id: "slot-8",          name: "8th Buddy + 2nd Branch",   desc: "New companion. Second skill tree.",                 category: "collection" }],

  // Decades 8-10: Infinite Prestige
  73: [{ id: "aquarium-anim",   name: "Aquarium Animations",      desc: "Buddies move and interact",                         category: "cosmetic" }],
  75: [{ id: "perk-upgrade",    name: "Prestige Perk Upgrade",    desc: "Enhanced prestige perk effects",                    category: "progression" }],
  77: [{ id: "fusion-lab",      name: "Fusion Lab",               desc: "Combine two Kodama into a hybrid species",          category: "feature" }],
  80: [{ id: "slot-9",          name: "9th Buddy + Cosmic Form",  desc: "New companion. Animated cosmic art.",               category: "collection" }],
  83: [{ id: "custom-species",  name: "Custom Species Creator",   desc: "Design your own buddy species",                     category: "cosmetic" }],
  85: [{ id: "third-branch",    name: "Third Skill Branch",       desc: "Can invest in all three skill trees",               category: "progression" }],
  87: [{ id: "boss-bugs",       name: "Bestiary Boss Encounters", desc: "Special boss bugs after 50+ catalogued",            category: "feature" }],
  90: [{ id: "slot-10",         name: "10th Buddy + Legacy Aqua", desc: "New companion. Prestige gen history.",              category: "collection" }],
  93: [{ id: "buddy-fusion",    name: "Buddy Fusion",             desc: "Combine two buddies into hybrid species",           category: "feature" }],
  95: [{ id: "infinite-auras",  name: "Infinite Auras",           desc: "Stack multiple aura effects",                       category: "cosmetic" }],
  97: [{ id: "custom-react",    name: "Custom Reactions",         desc: "Write your own reaction pool entries",              category: "cosmetic" }],
  100:[{ id: "ascension",       name: "Ascension",                desc: "Super-rebirth. Ascension perk + Centurion title.",  category: "feature" }],
};

// ─── Query functions ────────────────────────────────────────────────────────

export function getUnlocksAtLevel(level: number): Unlock[] {
  return UNLOCKS[level] ?? [];
}

export function isUnlocked(level: number, unlockId: string): boolean {
  for (const [lvl, unlocks] of Object.entries(UNLOCKS)) {
    if (unlocks.some((u) => u.id === unlockId)) return level >= Number(lvl);
  }
  return false;
}

export function nextUnlockLevel(currentLevel: number): number | undefined {
  const levels = Object.keys(UNLOCKS).map(Number).sort((a, b) => a - b);
  return levels.find((l) => l > currentLevel);
}

export function allUnlockedAt(level: number): Unlock[] {
  const result: Unlock[] = [];
  for (const [lvl, unlocks] of Object.entries(UNLOCKS)) {
    if (Number(lvl) <= level) result.push(...unlocks);
  }
  return result;
}

export function maxBuddySlots(level: number): number {
  let slots = 1;
  const slotLevels = [10, 20, 30, 40, 50, 53, 60, 70, 80, 90];
  for (const l of slotLevels) {
    if (level >= l) slots++;
  }
  return slots;
}

/** Max Kodama visible in aquarium at once. Users can own more but switch between them. */
export const AQUARIUM_DISPLAY_LIMIT = 3;

// ─── Skill points available ─────────────────────────────────────────────────

const SKILL_POINT_LEVELS = [23, 27, 33, 37, 43, 47, 50];

export function skillPointsAvailable(level: number): number {
  return SKILL_POINT_LEVELS.filter((l) => level >= l).length;
}
