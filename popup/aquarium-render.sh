#!/usr/bin/env bash
# kodama aquarium render — displays all companions in a grid
#
# Reads from ~/.claude-buddy/menagerie.json and sessions.json.
# Outputs ANSI-colored grid to stdout. Loops every 2s.

set -uo pipefail

BUDDY_STATE_DIR="${BUDDY_DIR:-$HOME/.claude-buddy}"
MENAGERIE="$BUDDY_STATE_DIR/menagerie.json"
SESSIONS="$BUDDY_STATE_DIR/sessions.json"
ACHIEVEMENTS="$BUDDY_STATE_DIR/achievements.json"
STATUS="$BUDDY_STATE_DIR/status.json"

RST=$'\e[0m'
BOLD=$'\e[1m'
DIM=$'\e[2m'
GREEN=$'\e[32m'
YELLOW=$'\e[33m'
CYAN=$'\e[36m'
RED=$'\e[31m'
MAGENTA=$'\e[35m'

PANE_W="${POPUP_INNER_W:-$(tput cols 2>/dev/null || echo 60)}"

draw() {
  local width=$((PANE_W - 2))
  local border
  border=$(printf '%*s' "$width" '' | tr ' ' '─')

  printf '\e[H\e[2J'  # clear screen
  echo "${CYAN}┌─${border}─┐${RST}"
  printf "${CYAN}│${RST} ${BOLD}%-*s${RST} ${CYAN}│${RST}\n" "$width" "kodama aquarium"
  echo "${CYAN}├─${border}─┤${RST}"

  if [ ! -f "$MENAGERIE" ]; then
    printf "${CYAN}│${RST} %-*s ${CYAN}│${RST}\n" "$width" "No menagerie found."
    echo "${CYAN}└─${border}─┘${RST}"
    return
  fi

  local active
  active=$(jq -r '.active // ""' "$MENAGERIE" 2>/dev/null)
  local slots
  slots=$(jq -r '.companions | keys[]' "$MENAGERIE" 2>/dev/null)

  if [ -z "$slots" ]; then
    printf "${CYAN}│${RST} %-*s ${CYAN}│${RST}\n" "$width" "Menagerie is empty."
    echo "${CYAN}└─${border}─┘${RST}"
    return
  fi

  # Render each companion
  while IFS= read -r slot; do
    local name species rarity level face shiny_mark marker
    name=$(jq -r ".companions[\"$slot\"].name // \"$slot\"" "$MENAGERIE" 2>/dev/null)
    species=$(jq -r ".companions[\"$slot\"].bones.species // \"?\"" "$MENAGERIE" 2>/dev/null)
    rarity=$(jq -r ".companions[\"$slot\"].bones.rarity // \"common\"" "$MENAGERIE" 2>/dev/null)
    level=$(jq -r ".companions[\"$slot\"].level // 1" "$MENAGERIE" 2>/dev/null)
    local is_shiny
    is_shiny=$(jq -r ".companions[\"$slot\"].bones.shiny // false" "$MENAGERIE" 2>/dev/null)
    shiny_mark=""
    [ "$is_shiny" = "true" ] && shiny_mark=" ✨"

    marker=" "
    [ "$slot" = "$active" ] && marker="${GREEN}►${RST}"

    # Mood dot color based on rarity
    local dot="${DIM}○${RST}"
    case "$rarity" in
      legendary) dot="${YELLOW}●${RST}" ;;
      epic)      dot="${MAGENTA}●${RST}" ;;
      rare)      dot="${CYAN}●${RST}" ;;
      uncommon)  dot="${GREEN}●${RST}" ;;
    esac

    printf "${CYAN}│${RST} %s ${BOLD}%-12s${RST} Lv.%-3s %s %s${DIM}%s${RST}%s" \
      "$marker" "$name" "$level" "$dot" "$species" "$shiny_mark" ""
    local pad=$(( width - 30 ))
    [ $pad -gt 0 ] && printf "%*s" "$pad" ""
    printf " ${CYAN}│${RST}\n"
  done <<< "$slots"

  echo "${CYAN}├─${border}─┤${RST}"

  # Recent achievement
  local ach_line="(none)"
  if [ -f "$ACHIEVEMENTS" ]; then
    ach_line=$(jq -r 'to_entries | map(select(.value.unlockedAt)) | sort_by(-.value.unlockedAt) | .[0].value.name // "(none)"' "$ACHIEVEMENTS" 2>/dev/null)
  fi
  printf "${CYAN}│${RST} ${YELLOW}🏆${RST} Recent: %-*s ${CYAN}│${RST}\n" $((width - 12)) "$ach_line"

  # Streak
  local streak=0
  if [ -f "$STATUS" ]; then
    streak=$(jq -r '.streak // 0' "$STATUS" 2>/dev/null)
  fi
  printf "${CYAN}│${RST} ${RED}🔥${RST} Streak: %-*s ${CYAN}│${RST}\n" $((width - 12)) "${streak} days"

  echo "${CYAN}└─${border}─┘${RST}"
  printf "${DIM}  q = close${RST}\n"
}

while true; do
  draw
  sleep 2
done
