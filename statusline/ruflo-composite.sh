#!/usr/bin/env bash
# Full statusline: ruflo TUI (6) + separator (1) + kodama (8)
# Modes: STATUSLINE_MODE=ruflo|buddy|both (default: both)
# Each section works independently if the other's data is missing.
set -euo pipefail
cat >/dev/null 2>&1

MODE="${STATUSLINE_MODE:-both}"

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

    # Padding prefix for right-alignment
    P="                                        "

    # Species art (all 18 species from buddy)
    [ -n "$HL" ] && echo "${KC}${P}${HL}${R}"
    case "$SPECIES" in
      axolotl)
        echo "${KC}${P}}~(____)~{${R}"
        echo "${KC}${P}}~(${EYE}..${EYE})~{${R}"
        echo "${KC}${P} (.--.)"
        echo "${KC}${P} (_/\\_)${R}" ;;
      duck)
        echo "${KC}${P}   __${R}"
        echo "${KC}${P} <(${EYE} )___${R}"
        echo "${KC}${P}  (  ._>${R}"
        echo "${KC}${P}   \`--'${R}" ;;
      goose)
        echo "${KC}${P}  (${EYE}>${R}"
        echo "${KC}${P}   ||${R}"
        echo "${KC}${P} _(__)_${R}"
        echo "${KC}${P}  ^^^^${R}" ;;
      blob)
        echo "${KC}${P} .----.${R}"
        echo "${KC}${P}( ${EYE}  ${EYE} )${R}"
        echo "${KC}${P}(      )${R}"
        echo "${KC}${P} \`----'${R}" ;;
      cat)
        echo "${KC}${P} /\\_/\\${R}"
        echo "${KC}${P}( ${EYE}   ${EYE})${R}"
        echo "${KC}${P}(  ω  )${R}"
        echo "${KC}${P}(\")_(\")${R}" ;;
      dragon)
        echo "${KC}${P}/^\\  /^\\${R}"
        echo "${KC}${P}< ${EYE}  ${EYE} >${R}"
        echo "${KC}${P}(  ~~  )${R}"
        echo "${KC}${P} \`-vvvv-'${R}" ;;
      octopus)
        echo "${KC}${P} .----.${R}"
        echo "${KC}${P}( ${EYE}  ${EYE} )${R}"
        echo "${KC}${P}(______)${R}"
        echo "${KC}${P}/\\/\\/\\/\\${R}" ;;
      owl)
        echo "${KC}${P} /\\  /\\${R}"
        echo "${KC}${P}((${EYE})(${EYE}))${R}"
        echo "${KC}${P}(  ><  )${R}"
        echo "${KC}${P} \`----'${R}" ;;
      penguin)
        echo "${KC}${P} .---.${R}"
        echo "${KC}${P} (${EYE}>${EYE})${R}"
        echo "${KC}${P}/(   )\\${R}"
        echo "${KC}${P} \`---'${R}" ;;
      turtle)
        echo "${KC}${P} _,--._${R}"
        echo "${KC}${P}( ${EYE}  ${EYE} )${R}"
        echo "${KC}${P}[______]${R}"
        echo "${KC}${P}\`\`    \`\`${R}" ;;
      ghost)
        echo "${KC}${P} .----.${R}"
        echo "${KC}${P}/ ${EYE}  ${EYE} \\${R}"
        echo "${KC}${P}|      |${R}"
        echo "${KC}${P}~\`~\`\`~\`~${R}" ;;
      capybara)
        echo "${KC}${P}n______n${R}"
        echo "${KC}${P}( ${EYE}    ${EYE} )${R}"
        echo "${KC}${P}(  oo  )${R}"
        echo "${KC}${P}\`------'${R}" ;;
      robot)
        echo "${KC}${P} .[||].${R}"
        echo "${KC}${P}[ ${EYE}  ${EYE} ]${R}"
        echo "${KC}${P}[ ==== ]${R}"
        echo "${KC}${P}\`------'${R}" ;;
      rabbit)
        echo "${KC}${P} (\\__/)${R}"
        echo "${KC}${P}( ${EYE}  ${EYE} )${R}"
        echo "${KC}${P}=(  ..  )=${R}"
        echo "${KC}${P}(\")__(\")" ;;
      mushroom)
        echo "${KC}${P}-o-OO-o-${R}"
        echo "${KC}${P}(________)${R}"
        echo "${KC}${P}  |${EYE}${EYE}|${R}"
        echo "${KC}${P}  |__|${R}" ;;
      chonk)
        echo "${KC}${P}/\\    /\\${R}"
        echo "${KC}${P}( ${EYE}    ${EYE} )${R}"
        echo "${KC}${P}(  ..  )${R}"
        echo "${KC}${P}\`------'${R}" ;;
      cactus)
        echo "${KC}${P}n ____ n${R}"
        echo "${KC}${P}||${EYE}  ${EYE}||${R}"
        echo "${KC}${P}|_|  |_|${R}"
        echo "${KC}${P}  |  |${R}" ;;
      snail)
        echo "${KC}${P}${EYE}   .--.${R}"
        echo "${KC}${P}\\  ( @ )${R}"
        echo "${KC}${P} \\_\`--'${R}"
        echo "${KC}${P}~~~~~~~${R}" ;;
      *)
        echo "${KC}${P}(${EYE}${EYE})${R}"
        echo "${KC}${P}(  )${R}" ;;
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

    # Name + level + sound
    echo "${KC}${P}${B}${NAME}${R} ${D}Lv.${PET_LVL} ${PET_XP}/${PET_XPNEXT}xp${R} ${D}${SOUND}${R}"
    echo "${D}${P}You${R} ${D}Lv.${USR_LVL} ${USR_XP}/${USR_XPNEXT}xp${R}"
  fi
fi # end buddy_state
fi # end buddy mode
