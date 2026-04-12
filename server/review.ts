/**
 * Kodama code review system — ring buffer of code quality signals
 *
 * Code Nose unlocks at Level 7. Senior Dev mode at Level 25.
 * Detects: long functions, hardcoded values, missing error handling.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const STATE_DIR = join(homedir(), ".claude-buddy");
const REVIEW_FILE = join(STATE_DIR, "review.json");
const MAX_SIGNALS = 20;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ReviewSignal {
  ts: number;
  session: string;
  type: "long-function" | "hardcoded-value" | "missing-error-handling" | "no-types" | "deep-nesting";
  detail: string;
  severity: "info" | "warn" | "error";
}

export interface ReviewFile {
  signals: ReviewSignal[];
}

// ─── Species-specific review commentary ─────────────────────────────────────

const REVIEW_REACTIONS: Record<string, Record<string, string[]>> = {
  owl: {
    "long-function":           ["*peers over spectacles* That function is... extensive.", "*hoots disapprovingly* I count too many lines."],
    "hardcoded-value":         ["*taps clipboard* Magic numbers are not wisdom.", "*head tilts* Constants exist for a reason."],
    "missing-error-handling":  ["*unblinking stare* Where is your try-catch?", "The tests will find what you didn't handle."],
  },
  capybara: {
    "long-function":           ["*chews* it's fine, probably.", "*stretches* maybe split it later?"],
    "hardcoded-value":         ["*yawns* constants are nice... when you get to it.", "*unbothered* it works though, right?"],
    "missing-error-handling":  ["*blinks slowly* errors happen.", "chill. it'll probably be fine."],
  },
  dragon: {
    "long-function":           ["*smoke from nostril* I've seen scrolls shorter than this function.", "REFACTOR. OR BURN."],
    "hardcoded-value":         ["*eyes narrow* Hardcoded values? In MY codebase?", "*flame flicker* Cowardice."],
    "missing-error-handling":  ["*growls* Unguarded code is weak code.", "The error will find you. It always does."],
  },
  crystal: {
    "long-function":           ["*resonates discordantly* The structure is... overloaded.", "Refactor for clarity. Precision demands it."],
    "hardcoded-value":         ["*cracks slightly* Type-unsafe literals detected.", "Constants are the backbone of order."],
    "missing-error-handling":  ["*dims* Unhandled paths create fractures.", "Every edge case is a potential shattering."],
  },
  wolf: {
    "long-function":           ["*growls* The pack doesn't hunt in formations this large.", "*ears flatten* Split the pack. Divide the function."],
    "hardcoded-value":         ["*sniffs* I smell something hardcoded.", "The trail is clearer with named constants."],
    "missing-error-handling":  ["*hackles rise* Exposed flank. Add error handling.", "A lone wolf without armor. Dangerous."],
  },
  // Default for unlisted species
  _default: {
    "long-function":           ["That function is getting long...", "Consider breaking this into smaller pieces."],
    "hardcoded-value":         ["Spotted a hardcoded value.", "Consider extracting that to a constant."],
    "missing-error-handling":  ["No error handling detected.", "Consider adding a try-catch here."],
  },
};

export function getReviewReaction(species: string, signalType: string): string {
  const speciesReactions = REVIEW_REACTIONS[species] ?? REVIEW_REACTIONS._default;
  const pool = speciesReactions[signalType] ?? REVIEW_REACTIONS._default[signalType] ?? ["*notices something*"];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── File I/O ───────────────────────────────────────────────────────────────

export function loadReview(): ReviewFile {
  try {
    const data = JSON.parse(readFileSync(REVIEW_FILE, "utf8"));
    return { signals: data.signals ?? [] };
  } catch {
    return { signals: [] };
  }
}

function saveReview(data: ReviewFile): void {
  mkdirSync(STATE_DIR, { recursive: true });
  // Ring buffer: keep last MAX_SIGNALS
  data.signals = data.signals.slice(-MAX_SIGNALS);
  writeFileSync(REVIEW_FILE, JSON.stringify(data, null, 2));
}

// ─── Add signal ─────────────────────────────────────────────────────────────

export function addReviewSignal(signal: ReviewSignal): void {
  const data = loadReview();
  data.signals.push(signal);
  saveReview(data);
}

// ─── Analyse bash output for code quality signals ───────────────────────────

export function analyseOutput(output: string, session: string): ReviewSignal[] {
  const signals: ReviewSignal[] = [];

  // Long function: count added lines in diff output
  const addedLines = (output.match(/^\+/gm) || []).length;
  if (addedLines > 80) {
    signals.push({
      ts: Date.now(), session,
      type: "long-function",
      detail: `${addedLines} lines added in one diff`,
      severity: "warn",
    });
  }

  // Hardcoded values: URLs, IPs, ports in diffs
  if (/^\+.*["'](https?:\/\/|[0-9]+\.[0-9]+\.[0-9]+|localhost:[0-9]+)/m.test(output)) {
    signals.push({
      ts: Date.now(), session,
      type: "hardcoded-value",
      detail: "URL, IP, or port literal in diff",
      severity: "info",
    });
  }

  // Missing error handling: catch without try
  if (/^\+.*(\.catch\(|catch\s*\{)/m.test(output) && !/^\+.*(try\s*\{|\.try)/m.test(output)) {
    signals.push({
      ts: Date.now(), session,
      type: "missing-error-handling",
      detail: "catch without corresponding try",
      severity: "warn",
    });
  }

  for (const signal of signals) {
    addReviewSignal(signal);
  }

  return signals;
}

// ─── Render ─────────────────────────────────────────────────────────────────

export function renderReview(last: number = 10): string {
  const data = loadReview();
  const signals = data.signals.slice(-last);

  if (signals.length === 0) {
    return "No code quality signals detected. Your code is clean!";
  }

  const lines = [`### Code Review (last ${signals.length} signals)\n`];

  for (const s of signals) {
    const icon = s.severity === "error" ? "\u{1F534}" : s.severity === "warn" ? "\u{1F7E1}" : "\u{1F535}";
    const ago = Math.round((Date.now() - s.ts) / 1000 / 60);
    lines.push(`${icon} **${s.type}** \u2014 ${s.detail} (${ago}m ago)`);
  }

  return lines.join("\n");
}
