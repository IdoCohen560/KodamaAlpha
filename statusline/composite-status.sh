#!/usr/bin/env bash
# KodamaAlpha composite status line — side-by-side Kodama + addons
#
# Layout: Kodama pet (right side) | Addon like ruflo (left side)
# Both on the SAME lines, not stacked.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUDDY_DIR="$HOME/.claude-buddy"
ADDONS_FILE="$BUDDY_DIR/statusline-addons.json"
STATE="$BUDDY_DIR/status.json"

export PATH="/home/cohedo/.local/bin:$PATH"

# Capture stdin once
STDIN_CACHE=$(cat)

NC=$'\033[0m'
DIM=$'\033[2m'
BOLD=$'\033[1m'
B=$'\xe2\xa0\x80'  # Braille Blank U+2800

# ─── Get terminal width ─────────────────────────────────────────────────────
COLS=${COLUMNS:-0}
[ "$COLS" -lt 40 ] && COLS=125

# ─── Build Kodama compact (right side, ~25 chars wide) ───────────────────────
KODAMA_LINES=()

if [ -f "$STATE" ]; then
    MUTED=$(jq -r '.muted // false' "$STATE" 2>/dev/null)
    NAME=$(jq -r '.name // ""' "$STATE" 2>/dev/null)
    SPECIES=$(jq -r '.species // ""' "$STATE" 2>/dev/null)
    RARITY=$(jq -r '.rarity // "common"' "$STATE" 2>/dev/null)
    E=$(jq -r '.eye // "°"' "$STATE" 2>/dev/null)
    HAT=$(jq -r '.hat // "none"' "$STATE" 2>/dev/null)
    USER_LV=$(jq -r '.userLevel // 1' "$STATE" 2>/dev/null)
    USER_XP=$(jq -r '.userXp // 0' "$STATE" 2>/dev/null)
    USER_XP_NEXT=$(jq -r '.userXpNext // 800' "$STATE" 2>/dev/null)
    PET_LV=$(jq -r '.level // 1' "$STATE" 2>/dev/null)
    REACTION=$(jq -r '.reaction // ""' "$STATE" 2>/dev/null)

    # Rarity color
    case "$RARITY" in
      common)    C=$'\033[38;2;153;153;153m' ;;
      uncommon)  C=$'\033[38;2;78;186;101m'  ;;
      rare)      C=$'\033[38;2;177;185;249m' ;;
      epic)      C=$'\033[38;2;175;135;255m' ;;
      legendary) C=$'\033[38;2;255;193;7m'   ;;
      *)         C=$'\033[0m' ;;
    esac

    # Compact species face (1 line)
    case "$SPECIES" in
      duck)     FACE="<(${E} )>" ;;
      cat)      FACE="=${E}w${E}=" ;;
      dragon)   FACE="<${E}~${E}>" ;;
      owl)      FACE="(${E})(${E})" ;;
      axolotl)  FACE="}${E}.${E}{" ;;
      robot)    FACE="[${E} ${E}]" ;;
      ghost)    FACE="/${E} ${E}\\" ;;
      phoenix)  FACE="<${E}^${E}>" ;;
      wolf)     FACE="/${E}w${E}\\" ;;
      panda)    FACE="(${E}o${E})" ;;
      fox)      FACE="(${E}w${E})>" ;;
      crystal)  FACE="<${E}|${E}>" ;;
      bat)      FACE="\\(${E}v${E})/" ;;
      slime)    FACE=".(${E}${E})." ;;
      *)        FACE="(${E}.${E})" ;;
    esac

    # Hat prefix
    HAT_STR=""
    case "$HAT" in
      crown)     HAT_STR="♛ " ;;
      tophat)    HAT_STR="⌐ " ;;
      propeller) HAT_STR="⊕ " ;;
      wizard)    HAT_STR="☆ " ;;
      halo)      HAT_STR="○ " ;;
      *) ;;
    esac

    # Trim reaction to 25 chars
    if [ -n "$REACTION" ] && [ "$REACTION" != "null" ] && [ "$MUTED" != "true" ]; then
        SHORT_REACT=$(echo "$REACTION" | head -c 25)
        [ ${#REACTION} -gt 25 ] && SHORT_REACT="${SHORT_REACT}…"
    else
        SHORT_REACT=""
    fi

    # Build compact Kodama lines (4-5 lines, right-aligned)
    KODAMA_LINES+=("${C}${HAT_STR}${FACE}${NC} ${BOLD}${NAME}${NC}")
    KODAMA_LINES+=("${DIM}You Lv.${USER_LV} ${USER_XP}/${USER_XP_NEXT}xp${NC}")
    KODAMA_LINES+=("${DIM}Pet Lv.${PET_LV}${NC}")
    [ -n "$SHORT_REACT" ] && KODAMA_LINES+=("${DIM}${SHORT_REACT}${NC}")
fi

KODAMA_COUNT=${#KODAMA_LINES[@]}
KODAMA_W=30  # visual width reserved for kodama

# ─── Build addon output (left side) ─────────────────────────────────────────
ADDON_LINES=()
if [ -f "$ADDONS_FILE" ]; then
    ADDON_COUNT=$(jq -r '.addons | length' "$ADDONS_FILE" 2>/dev/null || echo 0)
    if [ "$ADDON_COUNT" -gt 0 ]; then
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
# Left = addon (ruflo), Right = Kodama
# Pad addon lines to fill left side, then append Kodama on right

MAX_LINES=$ADDON_COUNT
[ "$KODAMA_COUNT" -gt "$MAX_LINES" ] && MAX_LINES=$KODAMA_COUNT
[ "$MAX_LINES" -lt 1 ] && MAX_LINES=1

LEFT_W=$(( COLS - KODAMA_W - 2 ))  # -2 for separator
[ "$LEFT_W" -lt 40 ] && LEFT_W=40

# Vertical center Kodama on the right
KODAMA_START=$(( (MAX_LINES - KODAMA_COUNT) / 2 ))
[ "$KODAMA_START" -lt 0 ] && KODAMA_START=0

for (( i=0; i<MAX_LINES; i++ )); do
    # Left side (addon)
    if [ "$i" -lt "$ADDON_COUNT" ]; then
        LEFT="${ADDON_LINES[$i]}"
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

    # Output: left content + separator + right content
    if [ -n "$LEFT" ] && [ -n "$RIGHT" ]; then
        echo "${LEFT} ${DIM}│${NC} ${RIGHT}"
    elif [ -n "$LEFT" ]; then
        echo "${LEFT}"
    elif [ -n "$RIGHT" ]; then
        printf "%*s${DIM}│${NC} %s\n" "$LEFT_W" "" "$RIGHT"
    fi
done

# If no addon, just show Kodama lines
if [ "$ADDON_COUNT" -eq 0 ] && [ "$KODAMA_COUNT" -eq 0 ]; then
    echo "${DIM}KodamaAlpha — no status data yet${NC}"
fi

exit 0
