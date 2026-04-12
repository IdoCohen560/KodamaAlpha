/**
 * Kodama session registry — tracks active Claude Code sessions
 *
 * Sessions self-register on every UserPromptSubmit via session-track.sh.
 * Stale sessions (>30min since last event) are pruned on read.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const STATE_DIR = join(homedir(), ".claude-buddy");
const SESSIONS_FILE = join(STATE_DIR, "sessions.json");
const STALE_MS = 30 * 60 * 1000; // 30 minutes

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SessionEntry {
  pid: number;
  cwd: string;
  task: string;
  companion: string;
  mood: string;
  moodColor: string;
  lastEvent: string;
  lastEventTs: number;
  startedAt: number;
  contextPct: number;
}

export interface SessionsFile {
  sessions: Record<string, SessionEntry>;
}

// ─── File I/O ───────────────────────────────────────────────────────────────

export function loadSessions(): SessionsFile {
  try {
    const data = JSON.parse(readFileSync(SESSIONS_FILE, "utf8"));
    return { sessions: data.sessions ?? {} };
  } catch {
    return { sessions: {} };
  }
}

function saveSessions(data: SessionsFile): void {
  mkdirSync(STATE_DIR, { recursive: true });
  const tmp = SESSIONS_FILE + ".tmp";
  writeFileSync(tmp, JSON.stringify(data, null, 2));
  const { renameSync } = require("fs");
  renameSync(tmp, SESSIONS_FILE);
}

// ─── Operations ─────────────────────────────────────────────────────────────

export function registerSession(sid: string, entry: Partial<SessionEntry>): void {
  const data = loadSessions();
  const existing = data.sessions[sid] ?? {};
  data.sessions[sid] = {
    pid: entry.pid ?? (existing as any).pid ?? process.pid,
    cwd: entry.cwd ?? (existing as any).cwd ?? process.cwd(),
    task: entry.task ?? (existing as any).task ?? "",
    companion: entry.companion ?? (existing as any).companion ?? "",
    mood: entry.mood ?? (existing as any).mood ?? "idle",
    moodColor: entry.moodColor ?? (existing as any).moodColor ?? "gray",
    lastEvent: entry.lastEvent ?? (existing as any).lastEvent ?? "",
    lastEventTs: entry.lastEventTs ?? Date.now(),
    startedAt: (existing as any).startedAt ?? Date.now(),
    contextPct: entry.contextPct ?? (existing as any).contextPct ?? 0,
  };
  pruneStale(data);
  saveSessions(data);
}

export function deregisterSession(sid: string): void {
  const data = loadSessions();
  delete data.sessions[sid];
  saveSessions(data);
}

export function pruneStale(data: SessionsFile): void {
  const now = Date.now();
  for (const [sid, entry] of Object.entries(data.sessions)) {
    if (now - entry.lastEventTs > STALE_MS) {
      delete data.sessions[sid];
    }
  }
}

export function getSessionCount(): number {
  const data = loadSessions();
  pruneStale(data);
  return Object.keys(data.sessions).length;
}

// ─── Render ─────────────────────────────────────────────────────────────────

const MOOD_EMOJI: Record<string, string> = {
  celebrating: "\uD83C\uDF89",
  happy: "\uD83D\uDE0A",
  focused: "\uD83D\uDCBB",
  stressed: "\uD83D\uDE30",
  idle: "\uD83D\uDECC",
};

export function renderSessions(): string {
  const data = loadSessions();
  pruneStale(data);
  const entries = Object.entries(data.sessions);

  if (entries.length === 0) {
    return "No active sessions detected.";
  }

  const lines = [`### Active Sessions (${entries.length})\n`];

  for (const [sid, s] of entries) {
    const emoji = MOOD_EMOJI[s.mood] ?? "\u2753";
    const ago = Math.round((Date.now() - s.lastEventTs) / 1000 / 60);
    const dir = s.cwd.replace(homedir(), "~");
    lines.push(`**Session ${sid}** ${emoji} ${s.companion || "?"}`);
    lines.push(`  \u{1F4C2} ${dir}`);
    if (s.task) lines.push(`  \u{1F4DD} "${s.task}"`);
    lines.push(`  Last activity: ${ago}m ago${s.contextPct > 0 ? ` \u2022 ctx: ${s.contextPct}%` : ""}`);
    lines.push("");
  }

  return lines.join("\n");
}
