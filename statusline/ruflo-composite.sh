#!/usr/bin/env bash
# Full statusline: ruflo TUI (6) + separator (1) + kodama (8)
# Modes: STATUSLINE_MODE=ruflo|buddy|both (default: both)
# Each section works independently if the other's data is missing.
set -euo pipefail
cat >/dev/null 2>&1

MODE="${STATUSLINE_MODE:-both}"

# --- Terminal width detection (from buddy-status.sh) ---
BB=$'\xe2\xa0\x80'  # Braille Blank U+2800 — survives JS .trim()
COLS=0
_PID=$$
for _ in 1 2 3 4 5; do
    _PID=$(ps -o ppid= -p "$_PID" 2>/dev/null | tr -d ' ')
    [ -z "$_PID" ] || [ "$_PID" = "1" ] && break
    _PTY=$(readlink "/proc/${_PID}/fd/0" 2>/dev/null)
    if [ -c "$_PTY" ] 2>/dev/null; then
        COLS=$(stty size < "$_PTY" 2>/dev/null | awk '{print $2}' || echo 0)
        COLS="${COLS:-0}"
        [ "${COLS}" -gt 40 ] 2>/dev/null && break
    fi
done
[ "${COLS:-0}" -lt 40 ] 2>/dev/null && COLS=${COLUMNS:-0}
[ "${COLS:-0}" -lt 40 ] 2>/dev/null && COLS=125

# Colors
R=$'\033[0m' B=$'\033[1m' D=$'\033[2m'
PU=$'\033[1;35m' CY=$'\033[1;36m' BL=$'\033[1;34m' GR=$'\033[1;32m'
YE=$'\033[1;33m' RD=$'\033[1;31m' WH=$'\033[1;37m' MG=$'\033[0;36m'

# --- Data collection ---
PROJECT_DIR=$(pwd)
V3M="${PROJECT_DIR}/.claude-flow/metrics/v3-progress.json"
BRANCH=$(git branch --show-current 2>/dev/null || echo "")
USER_CACHE="/tmp/.gh-user-cache"
GH_USER="user"
if [ -f "$USER_CACHE" ]; then
  _c=$(cat "$USER_CACHE" 2>/dev/null)
  case "$_c" in *"{"*|"") ;; *) GH_USER="$_c" ;; esac
fi

AGENTS=0 CVES_F=0 CVES_T=3 DDD=0 SEC="PENDING" DOM=0
if [ -f "$V3M" ]; then
  AGENTS=$(jq -r '.swarm.activeAgents // 0' "$V3M" 2>/dev/null || echo 0)
  CVES_F=$(jq -r '.security.cvesFixed // 0' "$V3M" 2>/dev/null || echo 0)
  CVES_T=$(jq -r '.security.totalCves // 3' "$V3M" 2>/dev/null || echo 3)
  DDD=$(jq -r '.ddd.progress // 0' "$V3M" 2>/dev/null || echo 0)
  SEC=$(jq -r '.security.status // "PENDING"' "$V3M" 2>/dev/null || echo "PENDING")
fi

# Live agents
SA="${PROJECT_DIR}/.claude-flow/metrics/swarm-activity.json"
[ -f "$SA" ] && { _a=$(jq -r '.swarm.agent_count // 0' "$SA" 2>/dev/null || echo 0); [ "$_a" -gt "$AGENTS" ] 2>/dev/null && AGENTS="$_a"; }

# Memory
MEM=$(node -e "console.log(Math.round(process.memoryUsage().rss/1048576))" 2>/dev/null || echo "?")

# Context & Intelligence
CTX=0 INTEL=0
AP="${PROJECT_DIR}/.claude-flow/data/autopilot-state.json"
[ -f "$AP" ] && CTX=$(awk "BEGIN{printf \"%.0f\", $(jq -r '.lastPercentage // 0' "$AP" 2>/dev/null || echo 0) * 100}" 2>/dev/null || echo 0)
LM="${PROJECT_DIR}/.claude-flow/metrics/learning.json"
[ -f "$LM" ] && INTEL=$(jq -r '.intelligence.score // 0' "$LM" 2>/dev/null | cut -d. -f1 || echo 0)

# Domain dots
DOTS="○○○○○"
[ -d "src/domains/task-management" ] && DOM=$((DOM+1))
[ -d "src/domains/session-management" ] && DOM=$((DOM+1))
[ -d "src/domains/health-monitoring" ] && DOM=$((DOM+1))

# Agent/Security colors
AC="$D"; [ "$AGENTS" -gt 0 ] && AC="$YE"; [ "$AGENTS" -ge 8 ] && AC="$GR"
SC="$RD"; [ "$SEC" = "CLEAN" ] && SC="$GR"; [ "$CVES_F" -gt 0 ] && [ "$SEC" != "CLEAN" ] && SC="$YE"
AI="${GR}◉${R}"; [ "$AGENTS" -eq 0 ] && AI="${D}○${R}"

# --- Ruflo TUI (6 lines) ---
if [ "$MODE" = "both" ] || [ "$MODE" = "ruflo" ]; then
echo "${B}${PU}▊ RuFlo V3${R} ${CY}● ${GH_USER}${R}  ${D}│${R}  ${BL}⎇ ${BRANCH}${R}"
echo "${D}─────────────────────────────────────────────────────${R}"
echo "${CY}🏗️  DDD Domains${R}    [${D}${DOTS}${R}]  ${RD}${DOM}${R}/${WH}5${R}    ${YE}⚡ target: 150x-12500x${R}"
# Session cost tracking — check multiple locations
COST="0.00"
for _cf in \
  "${PROJECT_DIR}/.claude-flow/metrics/session-cost.json" \
  "$HOME/ruflo/.claude-flow/metrics/session-cost.json" \
  "$HOME/.claude-flow/metrics/session-cost.json"; do
  if [ -f "$_cf" ]; then
    COST=$(jq -r '.totalCost // "0.00"' "$_cf" 2>/dev/null || echo "0.00")
    [ "$COST" != "0.00" ] && [ "$COST" != "0" ] && break
  fi
done

printf "${YE}🤖 Swarm${R}  ${AI} [${AC}%2d${R}/${WH}15${R}]  ${D}👥 0${R}    ${SC}CVE ${CVES_F}${R}/${WH}${CVES_T}${R}    ${CY}💾 ${MEM}MB${R}    📂 %3d%%    🧠 %3d%%    ${GR}\$${COST}${R}\n" "$AGENTS" "$CTX" "$INTEL"
echo "${PU}🔧 Architecture${R}    ${MG}DDD${R} ${RD}●${DDD}%${R}  ${D}│${R}  ${MG}Security${R} ${SC}●${SEC}${R}  ${D}│${R}  ${MG}Memory${R} ${GR}●AgentDB${R}"
echo "${D}─────────────────────────────────────────────────────${R}"
fi # end ruflo

# --- Separator ---
if [ "$MODE" = "both" ]; then echo ""; fi

# --- Kodama ---
if [ "$MODE" = "both" ] || [ "$MODE" = "buddy" ]; then
BUDDY_STATE="$HOME/.claude-buddy/status.json"
if [ -f "$BUDDY_STATE" ]; then
  _bdata=$(cat "$BUDDY_STATE" 2>/dev/null)
  NAME=$(echo "$_bdata" | jq -r '.name // ""')
  SPECIES=$(echo "$_bdata" | jq -r '.species // "blob"')
  RARITY=$(echo "$_bdata" | jq -r '.rarity // "common"')
  REACTION=$(echo "$_bdata" | jq -r '.reaction // ""')
  MUTED=$(echo "$_bdata" | jq -r '.muted // false')
  EYE=$(echo "$_bdata" | jq -r '.eye // "°"')
  HAT=$(echo "$_bdata" | jq -r '.hat // "none"')
  PET_LVL=$(echo "$_bdata" | jq -r '.level // 1')
  PET_XP=$(echo "$_bdata" | jq -r '.xp // 0')
  PET_XPNEXT=$(echo "$_bdata" | jq -r '.xpNext // 800')
  USR_LVL=$(echo "$_bdata" | jq -r '.userLevel // 1')
  USR_XP=$(echo "$_bdata" | jq -r '.userXp // 0')
  USR_XPNEXT=$(echo "$_bdata" | jq -r '.userXpNext // 800')

  if [ "$MUTED" != "true" ] && [ -n "$NAME" ]; then
    # Rarity color
    KC="$D"
    case "$RARITY" in
      uncommon)  KC=$'\033[38;2;78;186;101m' ;;
      rare)      KC=$'\033[38;2;177;185;249m' ;;
      epic)      KC=$'\033[38;2;175;135;255m' ;;
      legendary) KC=$'\033[38;2;255;193;7m' ;;
    esac

    # Hat
    HL=""
    case "$HAT" in
      crown)     HL=" \\^^^/" ;;
      tophat)    HL=" [___]" ;;
      propeller) HL="  -+-" ;;
      halo)      HL=" (   )" ;;
      wizard)    HL="  /^\\" ;;
    esac

    # --- Species art as variables (composable for both render paths) ---
    L0="" # hat line
    [ -n "$HL" ] && L0="$HL"
    case "$SPECIES" in
      axolotl)   L1="}~(____)~{";  L2="}~(${EYE}..${EYE})~{"; L3=" (.--.)" ;  L4=" (_/\\_)" ;;
      duck)      L1="   __";       L2=" <(${EYE} )___";       L3="  (  ._>";   L4="   \`--'" ;;
      goose)     L1="  (${EYE}>";  L2="   ||";                L3=" _(__)_";    L4="  ^^^^" ;;
      blob)      L1=" .----.";     L2="( ${EYE}  ${EYE} )";   L3="(      )";   L4=" \`----'" ;;
      cat)       L1=" /\\_/\\";    L2="( ${EYE}   ${EYE})";    L3="(  ω  )";    L4="(\")_(\")";;
      dragon)    L1="/^\\  /^\\";  L2="< ${EYE}  ${EYE} >";    L3="(  ~~  )";   L4=" \`-vvvv-'" ;;
      octopus)   L1=" .----.";     L2="( ${EYE}  ${EYE} )";   L3="(______)";   L4="/\\/\\/\\/\\" ;;
      owl)       L1=" /\\  /\\";   L2="((${EYE})(${EYE}))";   L3="(  ><  )";   L4=" \`----'" ;;
      penguin)   L1=" .---.";      L2=" (${EYE}>${EYE})";     L3="/(   )\\";   L4=" \`---'" ;;
      turtle)    L1=" _,--._";     L2="( ${EYE}  ${EYE} )";   L3="[______]";   L4="\`\`    \`\`" ;;
      ghost)     L1=" .----.";     L2="/ ${EYE}  ${EYE} \\";   L3="|      |";   L4="~\`~\`\`~\`~" ;;
      capybara)  L1="n______n";    L2="( ${EYE}    ${EYE} )";  L3="(  oo  )";   L4="\`------'" ;;
      robot)     L1=" .[||].";     L2="[ ${EYE}  ${EYE} ]";   L3="[ ==== ]";   L4="\`------'" ;;
      rabbit)    L1=" (\\__/)";    L2="( ${EYE}  ${EYE} )";    L3="=(  ..  )="; L4="(\")__(\")" ;;
      mushroom)  L1="-o-OO-o-";    L2="(________)";           L3="  |${EYE}${EYE}|"; L4="  |__|" ;;
      chonk)     L1="/\\    /\\";  L2="( ${EYE}    ${EYE} )";  L3="(  ..  )";   L4="\`------'" ;;
      cactus)    L1="n ____ n";    L2="||${EYE}  ${EYE}||";    L3="|_|  |_|";   L4="  |  |" ;;
      snail)     L1="${EYE}   .--."; L2="\\  ( @ )";           L3=" \\_\`--'";   L4="~~~~~~~" ;;
      *)         L1="(${EYE}${EYE})"; L2="(  )";              L3=""; L4="" ;;
    esac

    # Signature species sound
    SOUND=""
    case "$SPECIES" in
      axolotl)  SOUND="~blub blub~" ;;
      duck)     SOUND="~quack~" ;;
      goose)    SOUND="~HONK~" ;;
      cat)      SOUND="~prrrrr~" ;;
      blob)     SOUND="~splorch~" ;;
      dragon)   SOUND="~grrrumble~" ;;
      octopus)  SOUND="~splish~" ;;
      owl)      SOUND="~hoo hoo~" ;;
      penguin)  SOUND="~noot noot~" ;;
      turtle)   SOUND="~click click~" ;;
      ghost)    SOUND="~wooooo~" ;;
      capybara) SOUND="~ok~" ;;
      robot)    SOUND="~beep boop~" ;;
      rabbit)   SOUND="~thump thump~" ;;
      mushroom) SOUND="~poof~" ;;
      chonk)    SOUND="~mrrrp~" ;;
      cactus)   SOUND="~...~" ;;
      snail)    SOUND="~schlurp~" ;;
      *)        SOUND="~...~" ;;
    esac

    # --- Collect art lines into array ---
    ART=()
    [ -n "$L0" ] && ART+=("$L0")
    ART+=("$L1" "$L2")
    [ -n "$L3" ] && ART+=("$L3")
    [ -n "$L4" ] && ART+=("$L4")
    ART_COUNT=${#ART[@]}
    ART_W=14

    # --- Render based on mode ---
    if [ "$MODE" = "buddy" ]; then
      # ── Buddy-only: right-aligned art with speech bubble to the left ──
      INNER_W=28
      BOX_W=$(( INNER_W + 4 ))
      GAP=2
      TOTAL_W=$(( BOX_W + GAP + ART_W ))
      MARGIN=4
      DYN_PAD=$(( COLS - TOTAL_W - MARGIN ))
      [ "$DYN_PAD" -lt 0 ] && DYN_PAD=0
      SPACER=$(printf "${BB}%${DYN_PAD}s" "")

      # Build bubble from SOUND + name/level info
      BTEXT="$SOUND"
      NAME_LINE="${NAME} Lv.${PET_LVL} ${PET_XP}/${PET_XPNEXT}xp"
      USER_LINE="You Lv.${USR_LVL} ${USR_XP}/${USR_XPNEXT}xp"
      BUBBLE_LINES=("$BTEXT" "" "$NAME_LINE" "$USER_LINE")
      BUBBLE_COUNT=${#BUBBLE_LINES[@]}

      # Border
      BORDER=$(printf '%*s' "$(( BOX_W - 2 ))" '' | tr ' ' '-')

      # Full box: top border, text rows, bottom border
      BOX=()
      BOX+=(".${BORDER}.")
      for bl in "${BUBBLE_LINES[@]}"; do
        _pad=$(( INNER_W - ${#bl} ))
        [ "$_pad" -lt 0 ] && _pad=0
        _pstr=$(printf '%*s' "$_pad" '')
        BOX+=("| ${bl}${_pstr} |")
      done
      BOX+=("+${BORDER}+")
      BOX_COUNT=${#BOX[@]}

      # Vertically center bubble on art
      BUBBLE_START=0
      if [ "$BOX_COUNT" -lt "$ART_COUNT" ]; then
        BUBBLE_START=$(( (ART_COUNT - BOX_COUNT) / 2 ))
      fi

      # Connector on middle box line
      CONN_IDX=$(( BOX_COUNT / 2 ))

      # Max lines = max of art, box
      MAX_LINES=$ART_COUNT
      [ "$BOX_COUNT" -gt "$((MAX_LINES - BUBBLE_START))" ] && MAX_LINES=$(( BUBBLE_START + BOX_COUNT ))

      EMPTY_BOX=$(printf '%*s' "$BOX_W" '')

      for (( i=0; i<MAX_LINES; i++ )); do
        # Art part
        if [ "$i" -lt "$ART_COUNT" ]; then
          _art="${KC}${ART[$i]}${R}"
        else
          _art=""
        fi

        # Bubble part
        bi=$(( i - BUBBLE_START ))
        if [ "$bi" -ge 0 ] && [ "$bi" -lt "$BOX_COUNT" ]; then
          _box="${BOX[$bi]}"
          if [ "$bi" -eq "$CONN_IDX" ]; then
            _gap="${KC}--${R} "
          else
            _gap="   "
          fi
          # Color the box borders
          echo "${SPACER}${KC}${_box}${R}${_gap}${_art}"
        else
          echo "${SPACER}${EMPTY_BOX}   ${_art}"
        fi
      done

    else
      # ── Both mode: static padding, simple output ──
      P="                                        "
      for _line in "${ART[@]}"; do
        echo "${KC}${P}${_line}${R}"
      done
      echo "${KC}${P}${B}${NAME}${R} ${D}Lv.${PET_LVL} ${PET_XP}/${PET_XPNEXT}xp${R} ${D}${SOUND}${R}"
      echo "${D}${P}You${R} ${D}Lv.${USR_LVL} ${USR_XP}/${USR_XPNEXT}xp${R}"
    fi
  fi
fi # end buddy_state
fi # end buddy mode
