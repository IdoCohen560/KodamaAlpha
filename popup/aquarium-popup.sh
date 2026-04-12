#!/usr/bin/env bash
# kodama aquarium popup entry point -- runs INSIDE the tmux popup
#
# Architecture (mirrors buddy-popup.sh):
#   - Render loop runs in BACKGROUND (only writes to stdout)
#   - Input forwarder runs in FOREGROUND (owns stdin)
#   - 'q' quits the popup

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

BUDDY_SID="${BUDDY_SID:-${1:-default}}"

# On tmux 3.2-3.3, env vars are passed via file
ENV_FILE="${HOME}/.claude-buddy/popup-env.$BUDDY_SID"
if [ -z "${CC_PANE:-}" ] && [ -f "$ENV_FILE" ]; then
  . "$ENV_FILE"
fi

if [ -z "${CC_PANE:-}" ]; then
  echo "Error: CC_PANE not set" >&2
  sleep 2
  exit 1
fi

# ─── Cleanup on exit ─────────────────────────────────────────────────────────
cleanup() {
  [ -n "${RENDER_PID:-}" ] && kill "$RENDER_PID" 2>/dev/null
  tput cnorm 2>/dev/null
  stty sane 2>/dev/null
}
trap cleanup EXIT INT TERM HUP

# Hide cursor
tput civis 2>/dev/null

# ─── Render loop in BACKGROUND ──────────────────────────────────────────────
"$SCRIPT_DIR/aquarium-render.sh" </dev/null &
RENDER_PID=$!

# ─── Input forwarder in FOREGROUND ──────────────────────────────────────────
stty raw -echo 2>/dev/null

exec perl -e '
  use Fcntl qw(F_GETFL F_SETFL O_NONBLOCK);
  my $pane = $ENV{CC_PANE};
  while (1) {
    my $buf;
    my $n = sysread(STDIN, $buf, 1);
    last unless $n;
    # Non-blocking drain for paste batching
    my $flags = fcntl(STDIN, F_GETFL, 0);
    fcntl(STDIN, F_SETFL, $flags | O_NONBLOCK);
    while (sysread(STDIN, my $more, 4096)) {
      $buf .= $more;
    }
    fcntl(STDIN, F_SETFL, $flags);

    # q = close aquarium popup
    if ($buf eq "q" || $buf eq "Q") {
      exit 0;
    }

    system("tmux", "send-keys", "-t", $pane, "-l", "--", $buf);
  }
'
