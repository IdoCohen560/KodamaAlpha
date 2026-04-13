#!/usr/bin/env bash
# Track session costs from Claude Code usage
# Called by Stop hook to accumulate spend estimate
# Pricing: Opus input=$15/MTok, output=$75/MTok, cache_read=$1.50/MTok
COST_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude-flow/metrics/session-cost.json"
mkdir -p "$(dirname "$COST_FILE")"

# Read current totals
if [ -f "$COST_FILE" ]; then
  TOTAL=$(jq -r '.totalCost // 0' "$COST_FILE" 2>/dev/null || echo 0)
  TURNS=$(jq -r '.turns // 0' "$COST_FILE" 2>/dev/null || echo 0)
else
  TOTAL=0
  TURNS=0
fi

# Estimate cost per turn: ~$0.02-0.08 for Opus depending on context
# Conservative estimate: $0.04 per turn average
TURN_COST="0.04"
TOTAL=$(awk "BEGIN{printf \"%.2f\", $TOTAL + $TURN_COST}")
TURNS=$((TURNS + 1))

cat > "$COST_FILE" << ENDJSON
{
  "totalCost": "$TOTAL",
  "turns": $TURNS,
  "avgPerTurn": "$(awk "BEGIN{printf \"%.3f\", $TOTAL / $TURNS}")",
  "lastUpdated": "$(date -Iseconds)"
}
ENDJSON
