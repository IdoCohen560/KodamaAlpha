#!/usr/bin/env bash
# KodamaAlpha composite status line — side-by-side: addon LEFT, Kodama RIGHT
#
# Both render on the SAME lines. Kodama keeps its full art (8 lines).
# Ruflo (or any addon) fills the left side. They coexist, not stack.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUDDY_DIR="$HOME/.claude-buddy"
ADDONS_FILE="$BUDDY_DIR/statusline-addons.json"

export PATH="/home/cohedo/.local/bin:$PATH"

# Capture stdin once (Claude Code pipes JSON context)
STDIN_CACHE=$(cat)

NC=$'\033[0m'
DIM=$'\033[2m'

# ─── Get terminal width ─────────────────────────────────────────────────────
COLS=${COLUMNS:-0}
[ "$COLS" -lt 40 ] && COLS=125

# ─── Collect Kodama output (full art, right side) ───────────────────────────
KODAMA_LINES=()
while IFS= read -r line; do
    KODAMA_LINES+=("$line")
done < <(echo "$STDIN_CACHE" | "$SCRIPT_DIR/buddy-status.sh" 2>/dev/null)
KODAMA_COUNT=${#KODAMA_LINES[@]}

# ─── Collect addon output (left side) ───────────────────────────────────────
ADDON_LINES=()
if [ -f "$ADDONS_FILE" ]; then
    ADDON_COUNT_CFG=$(jq -r '.addons | length' "$ADDONS_FILE" 2>/dev/null || echo 0)
    if [ "$ADDON_COUNT_CFG" -gt 0 ]; then
        CMD=$(jq -r ".addons[0].command // \"\"" "$ADDONS_FILE" 2>/dev/null)
        ENABLED=$(jq -r ".addons[0].enabled // true" "$ADDONS_FILE" 2>/dev/null)
        if [ "$ENABLED" = "true" ] && [ -n "$CMD" ] && [ -f "$CMD" ]; then
            while IFS= read -r line; do
                ADDON_LINES+=("$line")
            done < <(echo "$STDIN_CACHE" | bash "$CMD" 2>/dev/null)
        fi
    fi
fi
ADDON_COUNT=${#ADDON_LINES[@]}

# ─── Merge side by side ─────────────────────────────────────────────────────
# If both exist: addon on left, separator │, Kodama on right
# If only one: render it alone

MAX_LINES=$ADDON_COUNT
[ "$KODAMA_COUNT" -gt "$MAX_LINES" ] && MAX_LINES=$KODAMA_COUNT
[ "$MAX_LINES" -lt 1 ] && MAX_LINES=1

if [ "$ADDON_COUNT" -gt 0 ] && [ "$KODAMA_COUNT" -gt 0 ]; then
    # Side by side mode
    # Vertically center the shorter one
    KODAMA_START=$(( (MAX_LINES - KODAMA_COUNT) / 2 ))
    [ "$KODAMA_START" -lt 0 ] && KODAMA_START=0
    ADDON_START=$(( (MAX_LINES - ADDON_COUNT) / 2 ))
    [ "$ADDON_START" -lt 0 ] && ADDON_START=0

    for (( i=0; i<MAX_LINES; i++ )); do
        # Left side (addon)
        AI=$(( i - ADDON_START ))
        if [ "$AI" -ge 0 ] && [ "$AI" -lt "$ADDON_COUNT" ]; then
            LEFT="${ADDON_LINES[$AI]}"
        else
            LEFT=""
        fi

        # Right side (Kodama)
        KI=$(( i - KODAMA_START ))
        if [ "$KI" -ge 0 ] && [ "$KI" -lt "$KODAMA_COUNT" ]; then
            RIGHT="${KODAMA_LINES[$KI]}"
        else
            RIGHT=""
        fi

        if [ -n "$RIGHT" ]; then
            echo "${LEFT} ${DIM}│${NC} ${RIGHT}"
        else
            echo "${LEFT}"
        fi
    done
elif [ "$KODAMA_COUNT" -gt 0 ]; then
    # Kodama only
    for line in "${KODAMA_LINES[@]}"; do
        echo "$line"
    done
elif [ "$ADDON_COUNT" -gt 0 ]; then
    # Addon only
    for line in "${ADDON_LINES[@]}"; do
        echo "$line"
    done
fi

exit 0
