/**
 * Daily challenge generator.
 * Rotates one optional challenge per day based on day-of-year.
 */

import { isUnlocked } from "./unlocks.ts";

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  check: string;
}

const CHALLENGES: DailyChallenge[] = [
  { id: "clean-code", title: "Clean Machine", description: "10 consecutive tool uses with no code smells", xpReward: 15, check: "Auto-tracked via clean streak counter" },
  { id: "test-first", title: "Test First", description: "Write a test before implementing a feature", xpReward: 15, check: "Self-reported via /buddy challenge done" },
  { id: "refactor", title: "Refactor One", description: "Refactor a function to be under 30 lines", xpReward: 15, check: "Self-reported" },
  { id: "document", title: "Document It", description: "Add a doc comment to a public function", xpReward: 15, check: "Self-reported" },
  { id: "old-bug", title: "Archaeology", description: "Fix a bug in a file you haven't touched in 2+ weeks", xpReward: 15, check: "Self-reported" },
  { id: "no-errors", title: "Zero Tolerance", description: "Complete a session with zero errors", xpReward: 15, check: "Auto-tracked via session events" },
  { id: "five-commits", title: "Ship Ship Ship", description: "Make 5 commits today", xpReward: 15, check: "Auto-tracked via commit counter" },
];

export function getDailyChallenge(): DailyChallenge {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return CHALLENGES[dayOfYear % CHALLENGES.length];
}

export function renderDailyChallenge(level: number): string {
  if (!isUnlocked(level, "daily-challenge")) {
    return `\uD83D\uDD12 Daily Challenges unlock at **Lv.33** (current: Lv.${level})`;
  }

  const challenge = getDailyChallenge();
  const lines = [
    `### \uD83C\uDFAF Daily Challenge`,
    "",
    `**${challenge.title}**`,
    challenge.description,
    "",
    `**Reward:** +${challenge.xpReward} XP`,
    `**Tracking:** ${challenge.check}`,
  ];
  return lines.join("\n");
}
