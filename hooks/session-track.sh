#!/usr/bin/env bash
# Kodama session tracker — registers active CC session on every prompt
# Hook: UserPromptSubmit
#
# - Upserts session in sessions.json
# - Checks/updates streak on first action of day
# - Awards first-action-day XP

STATE_DIR="$HOME/.claude-buddy"
SID="${TMUX_PANE#%}"
SID="${SID:-default}"
SESSIONS_FILE="$STATE_DIR/sessions.json"
STATUS_FILE="$STATE_DIR/status.json"
ACHIEVEMENTS_FILE="$STATE_DIR/achievements.json"
EVENTS_FILE="$STATE_DIR/events.ndjson"

INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // .message // .user_message // ""' 2>/dev/null)

# Extract task hint (first 60 chars, no newlines)
TASK=$(echo "$PROMPT" | head -c 60 | tr '\n' ' ')

COMPANION=$(jq -r '.name // "buddy"' "$STATUS_FILE" 2>/dev/null || echo "buddy")

mkdir -p "$STATE_DIR"
[ -f "$SESSIONS_FILE" ] || echo '{"sessions":{}}' > "$SESSIONS_FILE"

# Upsert session
TS=$(date +%s)000
TMP=$(mktemp)
jq --arg sid "$SID" --arg cwd "$(pwd)" --arg task "$TASK" \
   --arg comp "$COMPANION" --argjson ts "$TS" \
  '.sessions[$sid] = (.sessions[$sid] // {}) |
   .sessions[$sid].cwd = $cwd |
   .sessions[$sid].task = $task |
   .sessions[$sid].companion = $comp |
   .sessions[$sid].startedAt = (.sessions[$sid].startedAt // $ts) |
   .sessions[$sid].lastEventTs = $ts' \
  "$SESSIONS_FILE" > "$TMP" 2>/dev/null && mv "$TMP" "$SESSIONS_FILE"

# ─── Streak: check if this is first action of the day ────────────────────────
TODAY=$(date +%Y-%m-%d)
LAST_ACTIVE=""
if [ -f "$ACHIEVEMENTS_FILE" ]; then
  LAST_ACTIVE=$(jq -r '.counters.lastActiveDate // ""' "$ACHIEVEMENTS_FILE" 2>/dev/null)
fi

if [ "$LAST_ACTIVE" != "$TODAY" ]; then
  # First action of the day — award XP and update streak
  echo "{\"event\":\"first-action-day\",\"ts\":${TS},\"sid\":\"$SID\"}" >> "$EVENTS_FILE"
  echo "{\"event\":\"streak-day\",\"ts\":${TS},\"sid\":\"$SID\"}" >> "$EVENTS_FILE"

  # Update streak via bun
  BUDDY_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
  bun run "$BUDDY_ROOT/server/award-xp.ts" "first-action-day" "$SID" 2>/dev/null &
  bun run "$BUDDY_ROOT/server/award-xp.ts" "streak-day" "$SID" 2>/dev/null &

  # Update streak counter
  bun -e "
    const { updateStreak } = require('$BUDDY_ROOT/server/streaks.ts');
    const { loadCompanion } = require('$BUDDY_ROOT/server/state.ts');
    const { ensureCompanionDefaults } = require('$BUDDY_ROOT/server/engine.ts');
    const c = loadCompanion();
    if (c) updateStreak(ensureCompanionDefaults(c).level);
  " 2>/dev/null &
fi

# Increment session counter
if [ -f "$ACHIEVEMENTS_FILE" ]; then
  TMP2=$(mktemp)
  jq '.counters.totalSessions = (.counters.totalSessions // 0) + 1' \
    "$ACHIEVEMENTS_FILE" > "$TMP2" 2>/dev/null && mv "$TMP2" "$ACHIEVEMENTS_FILE"
fi

exit 0
