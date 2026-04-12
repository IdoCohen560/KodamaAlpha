/**
 * claude-den skill tree — unlocks at Level 23
 *
 * 3 branches (sentinel, navigator, bard), 7 abilities each.
 * 7 total skill points (L23, L27, L33, L37, L43, L47, L50).
 * Second branch unlocks at L70, third at L85.
 */

import type { Companion } from "./engine.ts";
import { ensureCompanionDefaults } from "./engine.ts";
import { skillPointsAvailable } from "./unlocks.ts";

export type SkillBranch = "sentinel" | "navigator" | "bard";

export interface SkillAbility {
  id: string;
  name: string;
  desc: string;
  branch: SkillBranch;
  tier: number; // 1-7, must unlock in order within branch
  effect: string; // what it actually does (for system reference)
}

export const SKILL_BRANCHES: Record<SkillBranch, { name: string; desc: string; icon: string }> = {
  sentinel: { name: "The Sentinel", desc: "Quality & Safety — guards your code", icon: "\u{1F6E1}\u{FE0F}" },
  navigator: { name: "The Navigator", desc: "Productivity & Context — finds the way", icon: "\u{1F9ED}" },
  bard: { name: "The Bard", desc: "Communication & Collaboration — tells the story", icon: "\u{1F4DC}" },
};

export const ABILITIES: SkillAbility[] = [
  // Sentinel (Quality & Safety)
  { id: "smell-sensitivity", name: "Code Smell Sensitivity +1", desc: "Detects more subtle code smells", branch: "sentinel", tier: 1, effect: "Lowers code smell detection threshold" },
  { id: "auto-lint-remind", name: "Auto-Lint Reminder", desc: "Nudges before commit if lint hasn't run", branch: "sentinel", tier: 2, effect: "PostToolUse checks for lint in session" },
  { id: "security-scan", name: "Security Scan Trigger", desc: "Flags common vulnerabilities inline", branch: "sentinel", tier: 3, effect: "Detects hardcoded secrets, SQL injection patterns" },
  { id: "coverage-track", name: "Test Coverage Tracker", desc: "Ambient display of coverage delta", branch: "sentinel", tier: 4, effect: "Tracks coverage % changes across sessions" },
  { id: "guardian-angel", name: "Guardian Angel", desc: "Warns before push to main without tests", branch: "sentinel", tier: 5, effect: "Detects git push to main/master in PostToolUse" },
  { id: "dep-audit", name: "Dependency Audit", desc: "Flags outdated/vulnerable packages weekly", branch: "sentinel", tier: 6, effect: "Checks package.json age on SessionStart" },
  { id: "the-wall", name: "The Wall", desc: "Pre-commit hook blocks commits below coverage threshold", branch: "sentinel", tier: 7, effect: "Capstone: configurable coverage gate" },

  // Navigator (Productivity & Context)
  { id: "session-memory", name: "Session Memory +5", desc: "Remembers 10 sessions instead of 5", branch: "navigator", tier: 1, effect: "Increases event history buffer" },
  { id: "file-predict", name: "File Prediction", desc: "Suggests next file to open", branch: "navigator", tier: 2, effect: "Tracks file access patterns" },
  { id: "context-snapshot", name: "Context Snapshot", desc: "Saves/restores working context per branch", branch: "navigator", tier: 3, effect: "Git branch context persistence" },
  { id: "refactor-planner", name: "Refactor Planner", desc: "Maps affected files for a rename/move", branch: "navigator", tier: 4, effect: "Dependency graph analysis" },
  { id: "time-machine", name: "Time Machine", desc: "Visual diff of any file at any point", branch: "navigator", tier: 5, effect: "Git history exploration helper" },
  { id: "cross-repo", name: "Cross-Repo Memory", desc: "Remembers patterns across projects", branch: "navigator", tier: 6, effect: "Shared pattern store across cwds" },
  { id: "oracle", name: "The Oracle", desc: "Predicts which tests will fail based on changes", branch: "navigator", tier: 7, effect: "Capstone: test impact analysis" },

  // Bard (Communication & Collaboration)
  { id: "commit-suggest", name: "Commit Message Suggestions", desc: "Auto-suggests commit messages from diff", branch: "bard", tier: 1, effect: "Analyses diff and generates message" },
  { id: "pr-draft", name: "PR Description Draft", desc: "Auto-generates PR description from commits", branch: "bard", tier: 2, effect: "Summarizes commit history for PR" },
  { id: "doc-comment", name: "Code Comment Generator", desc: "Suggests doc comments for public APIs", branch: "bard", tier: 3, effect: "Detects uncommented exports" },
  { id: "changelog-auto", name: "Changelog Auto-update", desc: "Maintains CHANGELOG.md from commits", branch: "bard", tier: 4, effect: "Appends to changelog on commit" },
  { id: "translator", name: "Translator", desc: "Explains code changes in plain English", branch: "bard", tier: 5, effect: "Generates non-technical summaries" },
  { id: "onboard-gen", name: "Onboarding Guide Generator", desc: "Creates walkthroughs for new contributors", branch: "bard", tier: 6, effect: "Generates README-style guides" },
  { id: "diplomat", name: "The Diplomat", desc: "Drafts tactful code review comments", branch: "bard", tier: 7, effect: "Capstone: tone-adjusted review feedback" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function abilitiesForBranch(branch: SkillBranch): SkillAbility[] {
  return ABILITIES.filter((a) => a.branch === branch).sort((a, b) => a.tier - b.tier);
}

function findAbility(id: string): SkillAbility | undefined {
  return ABILITIES.find((a) => a.id === id);
}

/** Which branches the companion can invest in based on level */
function availableBranches(level: number): SkillBranch[] {
  const branches: SkillBranch[] = [];
  // First branch at L23 (any branch)
  if (level >= 23) branches.push("sentinel", "navigator", "bard");
  return branches;
}

/** Which branches the companion has actually started (has at least 1 point in) */
function startedBranches(allocated: string[]): SkillBranch[] {
  const branches = new Set<SkillBranch>();
  for (const id of allocated) {
    const ability = findAbility(id);
    if (ability) branches.add(ability.branch);
  }
  return [...branches];
}

/** Max number of branches allowed based on level */
function maxBranches(level: number): number {
  if (level >= 85) return 3;
  if (level >= 70) return 2;
  return 1;
}

/** Highest unlocked tier in a branch */
function highestTier(allocated: string[], branch: SkillBranch): number {
  let max = 0;
  for (const id of allocated) {
    const ability = findAbility(id);
    if (ability && ability.branch === branch && ability.tier > max) max = ability.tier;
  }
  return max;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface SkillPointInfo {
  allocated: Record<string, boolean>;
  availablePoints: number;
  branches: SkillBranch[];
}

export function loadSkillPoints(companion: Companion): SkillPointInfo {
  const c = ensureCompanionDefaults(companion);
  const allocated: Record<string, boolean> = {};
  for (const id of c.allocatedSkills) {
    allocated[id] = true;
  }
  const totalPoints = skillPointsAvailable(c.level);
  const usedPoints = c.allocatedSkills.length;
  return {
    allocated,
    availablePoints: totalPoints - usedPoints,
    branches: availableBranches(c.level),
  };
}

export function allocateSkillPoint(
  companion: Companion,
  abilityId: string,
): { ok: boolean; error?: string } {
  const c = ensureCompanionDefaults(companion);
  const info = loadSkillPoints(c);

  // Validate ability exists
  const ability = findAbility(abilityId);
  if (!ability) return { ok: false, error: `Unknown ability: "${abilityId}"` };

  // Already allocated?
  if (info.allocated[abilityId]) return { ok: false, error: `Already unlocked: "${ability.name}"` };

  // Has points?
  if (info.availablePoints <= 0) return { ok: false, error: "No skill points available" };

  // Branch access check
  const started = startedBranches(c.allocatedSkills);
  const max = maxBranches(c.level);
  const alreadyInBranch = started.includes(ability.branch);
  if (!alreadyInBranch && started.length >= max) {
    if (max === 1) return { ok: false, error: `You can only invest in 1 branch until Lv.70. You've already started ${SKILL_BRANCHES[started[0]].name}.` };
    if (max === 2) return { ok: false, error: `You can invest in 2 branches until Lv.85. Third branch unlocks at Lv.85.` };
  }

  // Tier order check
  const currentHighest = highestTier(c.allocatedSkills, ability.branch);
  if (ability.tier !== currentHighest + 1) {
    return { ok: false, error: `Must unlock tier ${currentHighest + 1} in ${SKILL_BRANCHES[ability.branch].name} before tier ${ability.tier}` };
  }

  // All checks passed — allocate
  c.allocatedSkills.push(abilityId);
  return { ok: true };
}

export function getActiveAbilities(companion: Companion): SkillAbility[] {
  const c = ensureCompanionDefaults(companion);
  const result: SkillAbility[] = [];
  for (const id of c.allocatedSkills) {
    const ability = findAbility(id);
    if (ability) result.push(ability);
  }
  return result;
}

export function hasAbility(companion: Companion, abilityId: string): boolean {
  const c = ensureCompanionDefaults(companion);
  return c.allocatedSkills.includes(abilityId);
}

export function renderSkillTree(companion: Companion): string {
  const c = ensureCompanionDefaults(companion);
  const info = loadSkillPoints(c);
  const started = startedBranches(c.allocatedSkills);
  const max = maxBranches(c.level);

  const lines: string[] = [];
  lines.push("╔══════════════════════════════════════════════╗");
  lines.push("║            \u2605 SKILL TREE \u2605                   ║");
  lines.push("╚══════════════════════════════════════════════╝");
  lines.push("");
  lines.push(`  Skill Points: ${info.availablePoints} available  |  ${c.allocatedSkills.length} allocated  |  ${skillPointsAvailable(c.level)} total`);
  lines.push(`  Branches: ${started.length}/${max} active  (2nd at Lv.70, 3rd at Lv.85)`);
  lines.push("");

  const allBranches: SkillBranch[] = ["sentinel", "navigator", "bard"];
  for (const branch of allBranches) {
    const meta = SKILL_BRANCHES[branch];
    const abilities = abilitiesForBranch(branch);
    const isStarted = started.includes(branch);
    const canStart = !isStarted && started.length < max;
    const locked = !isStarted && !canStart;

    lines.push(`  ${meta.icon} ${meta.name}  —  ${meta.desc}`);
    if (locked) {
      lines.push(`     \u{1F512} Locked (need ${max === 1 ? "Lv.70 for 2nd branch" : "Lv.85 for 3rd branch"})`);
    } else {
      for (const a of abilities) {
        const unlocked = info.allocated[a.id];
        const icon = unlocked ? "\u2705" : "\u2B1C";
        const tag = unlocked ? "" : ` [tier ${a.tier}]`;
        lines.push(`     ${icon} ${a.name}  —  ${a.desc}${tag}`);
      }
    }
    lines.push("");
  }

  if (info.availablePoints > 0) {
    lines.push("  \u{1F4A1} Use /buddy skills <ability-id> to allocate a point.");
    lines.push("     IDs: " + ABILITIES.map((a) => a.id).join(", "));
  }

  return lines.join("\n");
}
