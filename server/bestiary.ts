/**
 * Kodama Bug Bestiary — catalogue errors as collectible creatures
 *
 * Unlocks at Level 18. Every unique error type becomes a named creature
 * with rarity, catch count, and fastest fix time.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { createHash } from "crypto";

const STATE_DIR = join(homedir(), ".claude-buddy");
const BESTIARY_FILE = join(STATE_DIR, "bestiary.json");

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BestiaryEntry {
  id: string;
  name: string;
  errorType: string;
  signature: string;
  firstSeen: number;
  timesCaught: number;
  fastestFix: number;   // ms, 0 = never fixed
  rarity: "common" | "uncommon" | "rare" | "legendary";
}

export interface BestiaryFile {
  entries: Record<string, BestiaryEntry>;
  lastErrorTs: number;
  lastErrorSig: string;
}

// ─── Error-to-creature naming ───────────────────────────────────────────────

const ERROR_NAMES: Record<string, { name: string; rarity: BestiaryEntry["rarity"] }> = {
  "TypeError":        { name: "Type Phantom",        rarity: "common" },
  "ReferenceError":   { name: "Null Wraith",         rarity: "common" },
  "SyntaxError":      { name: "Grammar Goblin",      rarity: "common" },
  "RangeError":       { name: "Bounds Specter",      rarity: "uncommon" },
  "URIError":         { name: "Path Poltergeist",     rarity: "uncommon" },
  "EvalError":        { name: "Eval Demon",           rarity: "rare" },
  "ENOENT":           { name: "Lost File Spirit",     rarity: "common" },
  "ECONNREFUSED":     { name: "Connection Specter",   rarity: "uncommon" },
  "EACCES":           { name: "Permission Wraith",    rarity: "uncommon" },
  "ETIMEDOUT":        { name: "Timeout Shade",        rarity: "uncommon" },
  "ENOMEM":           { name: "Memory Leviathan",     rarity: "rare" },
  "ENOSPC":           { name: "Disk Devourer",        rarity: "rare" },
  "SIGKILL":          { name: "Process Reaper",       rarity: "rare" },
  "SIGSEGV":          { name: "Core Dump Dragon",     rarity: "legendary" },
  "OOM":              { name: "Memory Leviathan",     rarity: "rare" },
  "exit code 137":    { name: "OOM Killer",           rarity: "rare" },
  "exit code 139":    { name: "Segfault Serpent",     rarity: "legendary" },
  "DEADLOCK":         { name: "Deadlock Hydra",       rarity: "legendary" },
  "race condition":   { name: "Phantom Thread",       rarity: "legendary" },
  "stack overflow":   { name: "Stack Overflow Titan", rarity: "rare" },
  "heap":             { name: "Heap Corruption Imp",  rarity: "rare" },
  "undefined":        { name: "Void Walker",          rarity: "common" },
  "null":             { name: "Null Specter",         rarity: "common" },
  "NaN":              { name: "NaN Ghost",            rarity: "uncommon" },
  "infinite loop":    { name: "Ouroboros",            rarity: "rare" },
  "cors":             { name: "CORS Hydra",           rarity: "uncommon" },
  "404":              { name: "Missing Route Phantom", rarity: "common" },
  "500":              { name: "Server Crash Golem",    rarity: "uncommon" },
  "401":              { name: "Auth Gate Keeper",      rarity: "common" },
  "403":              { name: "Forbidden Shade",       rarity: "uncommon" },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeError(errorText: string): { type: string; signature: string } {
  const lower = errorText.toLowerCase();

  // Try to match known error types
  for (const key of Object.keys(ERROR_NAMES)) {
    if (lower.includes(key.toLowerCase())) {
      return { type: key, signature: key };
    }
  }

  // Extract generic error pattern
  const match = errorText.match(/(\w+Error):/);
  if (match) return { type: match[1], signature: match[1] };

  // Exit code
  const exitMatch = errorText.match(/exit code (\d+)/);
  if (exitMatch) return { type: `exit code ${exitMatch[1]}`, signature: `exit-${exitMatch[1]}` };

  return { type: "unknown", signature: "unknown-error" };
}

function hashSignature(sig: string): string {
  return createHash("sha256").update(sig).digest("hex").slice(0, 12);
}

function generateCreatureName(errorType: string): string {
  const known = ERROR_NAMES[errorType];
  if (known) return known.name;
  // Generate from error type
  const words = errorType.replace(/([A-Z])/g, " $1").trim().split(/\s+/);
  const adjectives = ["Shadow", "Dark", "Phantom", "Ghost", "Spectral", "Void", "Glitch"];
  const adj = adjectives[Math.abs(hashCode(errorType)) % adjectives.length];
  return `${adj} ${words[0] ?? "Bug"}`;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

function getCreatureRarity(errorType: string): BestiaryEntry["rarity"] {
  return ERROR_NAMES[errorType]?.rarity ?? "common";
}

// ─── File I/O ───────────────────────────────────────────────────────────────

export function loadBestiary(): BestiaryFile {
  try {
    const data = JSON.parse(readFileSync(BESTIARY_FILE, "utf8"));
    return {
      entries: data.entries ?? {},
      lastErrorTs: data.lastErrorTs ?? 0,
      lastErrorSig: data.lastErrorSig ?? "",
    };
  } catch {
    return { entries: {}, lastErrorTs: 0, lastErrorSig: "" };
  }
}

function saveBestiary(data: BestiaryFile): void {
  mkdirSync(STATE_DIR, { recursive: true });
  const tmp = BESTIARY_FILE + ".tmp";
  writeFileSync(tmp, JSON.stringify(data, null, 2));
  const { renameSync } = require("fs");
  renameSync(tmp, BESTIARY_FILE);
}

// ─── Catalogue an error ─────────────────────────────────────────────────────

export interface CatalogueResult {
  isNew: boolean;
  entry: BestiaryEntry;
}

export function catalogueError(errorText: string): CatalogueResult {
  const { type, signature } = normalizeError(errorText);
  const id = hashSignature(signature);
  const bestiary = loadBestiary();

  const existing = bestiary.entries[id];
  if (existing) {
    existing.timesCaught++;
    bestiary.lastErrorTs = Date.now();
    bestiary.lastErrorSig = id;
    saveBestiary(bestiary);
    return { isNew: false, entry: existing };
  }

  const entry: BestiaryEntry = {
    id,
    name: generateCreatureName(type),
    errorType: type,
    signature,
    firstSeen: Date.now(),
    timesCaught: 1,
    fastestFix: 0,
    rarity: getCreatureRarity(type),
  };

  bestiary.entries[id] = entry;
  bestiary.lastErrorTs = Date.now();
  bestiary.lastErrorSig = id;
  saveBestiary(bestiary);
  return { isNew: true, entry };
}

/** Record a fix for the most recent error */
export function recordFix(): void {
  const bestiary = loadBestiary();
  if (!bestiary.lastErrorSig || !bestiary.lastErrorTs) return;

  const entry = bestiary.entries[bestiary.lastErrorSig];
  if (!entry) return;

  const fixTime = Date.now() - bestiary.lastErrorTs;
  if (entry.fastestFix === 0 || fixTime < entry.fastestFix) {
    entry.fastestFix = fixTime;
  }

  bestiary.lastErrorSig = "";
  saveBestiary(bestiary);
}

// ─── Render ─────────────────────────────────────────────────────────────────

const RARITY_DOT: Record<string, string> = {
  common: "\u26AA",
  uncommon: "\uD83D\uDFE2",
  rare: "\uD83D\uDD35",
  legendary: "\uD83D\uDFE1",
};

export function renderBestiary(): string {
  const bestiary = loadBestiary();
  const entries = Object.values(bestiary.entries).sort((a, b) => b.timesCaught - a.timesCaught);

  if (entries.length === 0) {
    return "Your bestiary is empty. Encounter some errors to start collecting!";
  }

  const lines = [`### Bug Bestiary (${entries.length} species catalogued)\n`];

  for (const e of entries) {
    const dot = RARITY_DOT[e.rarity] ?? "\u26AA";
    const fix = e.fastestFix > 0
      ? `\u26A1 ${Math.round(e.fastestFix / 1000)}s`
      : "\u2014";
    lines.push(`${dot} **${e.name}** (\`${e.errorType}\`) \u2014 caught ${e.timesCaught}x, fastest fix: ${fix}`);
  }

  return lines.join("\n");
}
