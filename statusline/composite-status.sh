#!/usr/bin/env bash
# KodamaAlpha composite status line — multiplexer for buddy + addons
#
# This is the SINGLE script registered in settings.json.
# It chains multiple status line scripts together:
#   1. Captures Claude Code's JSON stdin once
#   2. Runs buddy-status.sh first (right-aligned buddy art + level + mood)
#   3. Prints a separator if addons exist
#   4. Runs each enabled addon script, piping the same stdin to each
#
# This ensures both Kodama and ruflo (or any addon) receive the
# Claude Code context and can render simultaneously.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUDDY_DIR="$HOME/.claude-buddy"
ADDONS_FILE="$BUDDY_DIR/statusline-addons.json"

# Capture stdin once (Claude Code pipes JSON context)
STDIN_CACHE=$(cat)

# ─── Run buddy status (primary) ─────────────────────────────────────────────
echo "$STDIN_CACHE" | "$SCRIPT_DIR/buddy-status.sh"

# ─── Run addons (if any) ────────────────────────────────────────────────────
if [ -f "$ADDONS_FILE" ]; then
  ADDON_COUNT=$(jq -r '.addons | length' "$ADDONS_FILE" 2>/dev/null || echo 0)

  if [ "$ADDON_COUNT" -gt 0 ]; then
    HAS_OUTPUT=0

    for i in $(seq 0 $((ADDON_COUNT - 1))); do
      ENABLED=$(jq -r ".addons[$i].enabled // true" "$ADDONS_FILE" 2>/dev/null)
      CMD=$(jq -r ".addons[$i].command // \"\"" "$ADDONS_FILE" 2>/dev/null)

      if [ "$ENABLED" = "true" ] && [ -n "$CMD" ] && [ -f "$CMD" ]; then
        if [ "$HAS_OUTPUT" -eq 0 ]; then
          DIM=$'\033[2m'
          NC=$'\033[0m'
          echo "${DIM}─────────────────────────────────────────────────────${NC}"
          HAS_OUTPUT=1
        fi

        # Pipe the same stdin to each addon so it gets Claude Code context
        if command -v timeout &>/dev/null; then
          echo "$STDIN_CACHE" | timeout 2 bash "$CMD" 2>/dev/null || true
        else
          echo "$STDIN_CACHE" | bash "$CMD" 2>/dev/null || true
        fi
      fi
    done
  fi
fi

exit 0
