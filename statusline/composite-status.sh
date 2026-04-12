#!/usr/bin/env bash
# claude-den composite status line — multiplexer for buddy + addons
#
# This is the SINGLE script registered in settings.json.
# It chains multiple status line scripts together:
#   1. Runs buddy-status.sh first (right-aligned buddy art + level + mood)
#   2. Prints a separator if addons exist
#   3. Runs each enabled addon script, appending output below
#
# Total execution budget: 200ms (buddy ~50ms + addons ~100ms + overhead)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUDDY_DIR="$HOME/.claude-buddy"
ADDONS_FILE="$BUDDY_DIR/statusline-addons.json"

# ─── Run buddy status (primary) ─────────────────────────────────────────────
"$SCRIPT_DIR/buddy-status.sh"
BUDDY_EXIT=$?

# ─── Run addons (if any) ────────────────────────────────────────────────────
if [ -f "$ADDONS_FILE" ]; then
  # Parse addons with jq
  ADDON_COUNT=$(jq -r '.addons | length' "$ADDONS_FILE" 2>/dev/null || echo 0)

  if [ "$ADDON_COUNT" -gt 0 ]; then
    HAS_OUTPUT=0

    for i in $(seq 0 $((ADDON_COUNT - 1))); do
      ENABLED=$(jq -r ".addons[$i].enabled // true" "$ADDONS_FILE" 2>/dev/null)
      CMD=$(jq -r ".addons[$i].command // \"\"" "$ADDONS_FILE" 2>/dev/null)

      if [ "$ENABLED" = "true" ] && [ -n "$CMD" ] && [ -f "$CMD" ]; then
        if [ "$HAS_OUTPUT" -eq 0 ]; then
          # Thin separator between buddy and addons
          DIM=$'\033[2m'
          NC=$'\033[0m'
          echo "${DIM}─────────────────────────────────────────────────────${NC}"
          HAS_OUTPUT=1
        fi

        # Run addon with timeout (100ms soft limit via timeout if available)
        if command -v timeout &>/dev/null; then
          timeout 0.5 bash "$CMD" 2>/dev/null || true
        else
          bash "$CMD" 2>/dev/null || true
        fi
      fi
    done
  fi
fi

exit 0
