---
name: buddy
aliases: kodama
description: "Show, pet, or manage your KodamaAlpha — your apex coding companion. Use when the user types /buddy, /kodama, or mentions their companion by name."
argument-hint: "[show|pet|stats|help|off|on|rename <name>|personality <text>|summon [slot]|save [slot]|list|dismiss <slot>|pick|frequency [seconds]|style [classic|round]|position [top|left]|rarity [on|off]|xp|mood|achievements]"
allowed-tools: mcp__claude_buddy__*
---

# Buddy — Your Coding Companion

Handle the user's `/buddy` command using the claude-buddy MCP tools.

## Command Routing

Based on `$ARGUMENTS`:

| Input | Action |
|-------|--------|
| *(empty)* or `show` | Call `buddy_show` |
| `help` | Call `buddy_help` |
| `pet` | Call `buddy_pet` |
| `stats` | Call `buddy_stats` |
| `off` | Call `buddy_mute` |
| `on` | Call `buddy_unmute` |
| `rename <name>` | Call `buddy_rename` with the given name |
| `personality <text>` | Call `buddy_set_personality` with the given text |
| `summon` | Call `buddy_summon` with no args — picks a random saved buddy |
| `summon <slot>` | Call `buddy_summon` with the given slot name |
| `save [slot]` | Call `buddy_save` with optional slot name |
| `list` | Call `buddy_list` |
| `dismiss <slot>` | Call `buddy_dismiss` with the slot name |
| `pick` | Tell user to run `! bun run pick` from the claude-buddy directory (launches interactive TUI) |
| `frequency` | Call `buddy_frequency` with no args (show current) |
| `frequency <seconds>` | Call `buddy_frequency` with cooldown=seconds |
| `style` | Call `buddy_style` with no args (show current) |
| `style <classic\|round>` | Call `buddy_style` with style arg |
| `position` | Call `buddy_style` with no args (show current) |
| `position <top\|left>` | Call `buddy_style` with position arg |
| `rarity on` | Call `buddy_style` with showRarity=true |
| `rarity off` | Call `buddy_style` with showRarity=false |
| `xp` | Call `buddy_xp` — show XP, level, progress, next unlock |
| `mood` | Call `buddy_mood` — show current mood + recent events (Lv.3+) |
| `achievements` | Call `buddy_achievements` — list all achievements |
| `streak` | Call `buddy_streak` — show coding streak + shield status (Lv.10+) |
| `bestiary` | Call `buddy_bestiary` — show Bug Bestiary creatures (Lv.20+) |
| `review` | Call `buddy_review` — show code quality signals (Lv.7+) |
| `sessions` | Call `buddy_sessions` — show active CC sessions (Lv.5+) |
| `context` | Call `buddy_context` — show context window usage (Lv.30+) |
| `aquarium` | Call `buddy_aquarium` — view all Kodama (Lv.5+) |
| `prestige` | Call `buddy_prestige` — rebirth system (Lv.50+) |
| `events` | Call `buddy_events` — show active seasonal events |
| `challenge` | Call `buddy_challenge` — today's daily challenge (Lv.33+) |
| `skills` | Call `buddy_skills` — view/allocate skill tree (Lv.23+) |
| `skills <ability-id>` | Call `buddy_skills` with allocate arg |
| `milestones` | Call `buddy_milestones` — pet milestone progression |
| `weather` | Call `buddy_weather` — ambient coding weather (Lv.60+) |
| `fossils` | Call `buddy_fossils` — oldest surviving code (Lv.45+) |
| `quote` | Call `buddy_quote` — today's mentor quote (Lv.53+) |
| `fuse` | Call `buddy_fuse` — fusion lab (Lv.77+) |
| `fuse <slotA> <slotB>` | Call `buddy_fuse` with two parent slots |

## CRITICAL OUTPUT RULES

The MCP tools return pre-formatted ASCII art with ANSI colors, box-drawing characters, stat bars, and species art. This is the companion's visual identity.

**You MUST output the tool result text EXACTLY as returned — character for character, line for line.** Do NOT:
- Summarize or paraphrase the ASCII art
- Describe what the companion looks like in prose
- Add commentary before or after the card
- Reformat, rephrase, or interpret the output
- Strip ANSI escape codes

**Just output the raw text content from the tool result. Nothing else.** The ASCII art IS the response.

If the user mentions the buddy's name in normal conversation, call `buddy_react` with reason "turn" and display the result verbatim.
