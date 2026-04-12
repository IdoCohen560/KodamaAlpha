/**
 * KodamaAlpha Legacy Titles — earned titles displayed under buddy name
 *
 * Unlocks at Level 57. Title is based on the skill branch the user invested most in.
 */

import type { SkillBranch } from "./skills.ts";

export interface LegacyTitle {
  title: string;
  branch: SkillBranch;
  minPoints: number;
  desc: string;
}

export const LEGACY_TITLES: LegacyTitle[] = [
  // Sentinel titles
  { title: "Watchguard", branch: "sentinel", minPoints: 1, desc: "Beginning the path of vigilance" },
  { title: "Code Warden", branch: "sentinel", minPoints: 3, desc: "Protector of quality" },
  { title: "Iron Sentinel", branch: "sentinel", minPoints: 5, desc: "Unyielding guardian" },
  { title: "The Unbreakable", branch: "sentinel", minPoints: 7, desc: "Capstone: nothing gets past you" },

  // Navigator titles
  { title: "Pathfinder", branch: "navigator", minPoints: 1, desc: "Beginning the path of discovery" },
  { title: "Wayfinder", branch: "navigator", minPoints: 3, desc: "Sees the paths between files" },
  { title: "Cartographer", branch: "navigator", minPoints: 5, desc: "Maps the unknown" },
  { title: "The Oracle", branch: "navigator", minPoints: 7, desc: "Capstone: sees before it happens" },

  // Bard titles
  { title: "Scribe", branch: "bard", minPoints: 1, desc: "Beginning the path of words" },
  { title: "Chronicler", branch: "bard", minPoints: 3, desc: "Records the journey" },
  { title: "Lorekeeper", branch: "bard", minPoints: 5, desc: "Preserves knowledge" },
  { title: "The Diplomat", branch: "bard", minPoints: 7, desc: "Capstone: words that build bridges" },
];

export function getLegacyTitle(allocatedSkills: string[]): LegacyTitle | null {
  // Count points per branch
  const { ABILITIES } = require("./skills.ts") as typeof import("./skills.ts");
  const counts: Record<SkillBranch, number> = { sentinel: 0, navigator: 0, bard: 0 };

  for (const skillId of allocatedSkills) {
    const ability = ABILITIES.find((a: any) => a.id === skillId);
    if (ability) counts[ability.branch]++;
  }

  // Find the branch with most points
  let topBranch: SkillBranch = "sentinel";
  let topCount = 0;
  for (const [branch, count] of Object.entries(counts)) {
    if (count > topCount) {
      topBranch = branch as SkillBranch;
      topCount = count;
    }
  }

  if (topCount === 0) return null;

  // Find highest title earned in that branch
  const branchTitles = LEGACY_TITLES
    .filter(t => t.branch === topBranch && topCount >= t.minPoints)
    .sort((a, b) => b.minPoints - a.minPoints);

  return branchTitles[0] ?? null;
}

export function renderTitle(allocatedSkills: string[]): string {
  const title = getLegacyTitle(allocatedSkills);
  if (!title) return "";
  const { SKILL_BRANCHES } = require("./skills.ts") as typeof import("./skills.ts");
  const branch = SKILL_BRANCHES[title.branch];
  return `${branch.icon} ${title.title} \u2014 *${title.desc}*`;
}
