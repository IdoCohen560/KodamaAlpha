#!/usr/bin/env bash
# KodamaAlpha composite status line
#
# Layout (top to bottom):
#   1. Addon (ruflo) — full width
#   2. Blank separator line
#   3. Kodama — full art with body, speech bubble, name, XP
#
# Both coexist vertically with clear separation.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUDDY_DIR="$HOME/.claude-buddy"
ADDONS_FILE="$BUDDY_DIR/statusline-addons.json"

export PATH="/home/cohedo/.local/bin:$PATH"

# Capture stdin once
STDIN_CACHE=$(cat)

NC=$'\033[0m'
DIM=$'\033[2m'

# ─── Addon output (ruflo) — top section ─────────────────────────────────────
if [ -f "$ADDONS_FILE" ]; then
    CMD=$(jq -r '.addons[0].command // ""' "$ADDONS_FILE" 2>/dev/null)
    ENABLED=$(jq -r '.addons[0].enabled // true' "$ADDONS_FILE" 2>/dev/null)
    if [ "$ENABLED" = "true" ] && [ -n "$CMD" ] && [ -f "$CMD" ]; then
        echo "$STDIN_CACHE" | bash "$CMD" 2>/dev/null
    fi
fi

# ─── Separator ───────────────────────────────────────────────────────────────
echo ""

# ─── Kodama — full art with body ────────────────────────────────────────────
echo "$STDIN_CACHE" | "$SCRIPT_DIR/buddy-status.sh" 2>/dev/null

exit 0
