#!/usr/bin/env bash
# KodamaAlpha composite status line — side-by-side: addon LEFT, Kodama RIGHT
#
# Renders Kodama compact (no right-alignment padding) alongside addons.

BUDDY_DIR="$HOME/.claude-buddy"
ADDONS_FILE="$BUDDY_DIR/statusline-addons.json"
STATE="$BUDDY_DIR/status.json"

export PATH="/home/cohedo/.local/bin:$PATH"

STDIN_CACHE=$(cat)

NC=$'\033[0m'
DIM=$'\033[2m'
BOLD=$'\033[1m'

[ -f "$STATE" ] || exit 0

# ─── Read Kodama state ───────────────────────────────────────────────────────
NAME=$(jq -r '.name // ""' "$STATE" 2>/dev/null)
[ -z "$NAME" ] && exit 0
MUTED=$(jq -r '.muted // false' "$STATE" 2>/dev/null)
SPECIES=$(jq -r '.species // ""' "$STATE" 2>/dev/null)
RARITY=$(jq -r '.rarity // "common"' "$STATE" 2>/dev/null)
E=$(jq -r '.eye // "°"' "$STATE" 2>/dev/null)
HAT=$(jq -r '.hat // "none"' "$STATE" 2>/dev/null)
USER_LV=$(jq -r '.userLevel // 1' "$STATE" 2>/dev/null)
USER_XP=$(jq -r '.userXp // 0' "$STATE" 2>/dev/null)
USER_XP_NEXT=$(jq -r '.userXpNext // 800' "$STATE" 2>/dev/null)
PET_LV=$(jq -r '.level // 1' "$STATE" 2>/dev/null)
STARS=$(jq -r '.stars // ""' "$STATE" 2>/dev/null)
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

# Species face
case "$SPECIES" in
  duck)     FACE="<(${E} )>" ;;
  goose)    FACE="(${E}>)" ;;
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
  blob)     FACE="(${E} ${E})" ;;
  penguin)  FACE="(${E}>${E})" ;;
  turtle)   FACE="[${E}_${E}]" ;;
  snail)    FACE="${E}(@)" ;;
  capybara) FACE="(${E}oo${E})" ;;
  cactus)   FACE="|${E} ${E}|" ;;
  rabbit)   FACE="(${E}..${E})" ;;
  mushroom) FACE="|${E} ${E}|" ;;
  chonk)    FACE="(${E}.${E})" ;;
  *)        FACE="(${E}.${E})" ;;
esac

# Hat symbol
HAT_SYM=""
case "$HAT" in
  crown)     HAT_SYM="♛" ;;
  tophat)    HAT_SYM="⌐" ;;
  propeller) HAT_SYM="⊕" ;;
  wizard)    HAT_SYM="☆" ;;
  halo)      HAT_SYM="○" ;;
  viking)    HAT_SYM="⍟" ;;
  detective) HAT_SYM="🔍" ;;
  pirate)    HAT_SYM="☠" ;;
  chef)      HAT_SYM="👨‍🍳" ;;
esac

# Trim reaction
SHORT_REACT=""
if [ "$MUTED" != "true" ] && [ -n "$REACTION" ] && [ "$REACTION" != "null" ]; then
    SHORT_REACT=$(echo "$REACTION" | head -c 30)
fi

# ─── Build Kodama lines (compact, no padding) ───────────────────────────────
K_LINES=()
K_LINES+=("${C}${HAT_SYM} ${FACE}${NC} ${BOLD}${NAME}${NC} ${C}${STARS}${NC}")
K_LINES+=("${DIM}You Lv.${USER_LV}  ${USER_XP}/${USER_XP_NEXT}xp${NC}")
K_LINES+=("${DIM}Pet Lv.${PET_LV}${NC}")
[ -n "$SHORT_REACT" ] && K_LINES+=("${DIM}${SHORT_REACT}${NC}")
K_COUNT=${#K_LINES[@]}

# ─── Build addon lines ──────────────────────────────────────────────────────
A_LINES=()
if [ -f "$ADDONS_FILE" ]; then
    CMD=$(jq -r '.addons[0].command // ""' "$ADDONS_FILE" 2>/dev/null)
    ENABLED=$(jq -r '.addons[0].enabled // true' "$ADDONS_FILE" 2>/dev/null)
    if [ "$ENABLED" = "true" ] && [ -n "$CMD" ] && [ -f "$CMD" ]; then
        while IFS= read -r line; do
            A_LINES+=("$line")
        done < <(echo "$STDIN_CACHE" | bash "$CMD" 2>/dev/null)
    fi
fi
A_COUNT=${#A_LINES[@]}

# ─── Output: side by side ───────────────────────────────────────────────────
MAX=$A_COUNT
[ "$K_COUNT" -gt "$MAX" ] && MAX=$K_COUNT

# Center Kodama vertically
K_START=$(( (MAX - K_COUNT) / 2 ))
[ "$K_START" -lt 0 ] && K_START=0

if [ "$A_COUNT" -gt 0 ]; then
    for (( i=0; i<MAX; i++ )); do
        LEFT=""
        [ "$i" -lt "$A_COUNT" ] && LEFT="${A_LINES[$i]}"

        KI=$(( i - K_START ))
        RIGHT=""
        [ "$KI" -ge 0 ] && [ "$KI" -lt "$K_COUNT" ] && RIGHT="${K_LINES[$KI]}"

        if [ -n "$RIGHT" ]; then
            echo "${LEFT} ${DIM}│${NC} ${RIGHT}"
        else
            echo "${LEFT}"
        fi
    done
else
    # No addon, just Kodama
    for line in "${K_LINES[@]}"; do
        echo "$line"
    done
fi

exit 0
