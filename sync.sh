#!/bin/bash
# ──────────────────────────────────────────────────────────────
#  ./sync.sh   —  "has Sahera changed anything?"
#
#  Run this before we start editing, so we never work on a stale
#  copy and hit a merge conflict later.
#
#  It only reads and pulls. It never pushes, so it cannot break
#  the live site.
#
#  Note: the repo is private, and the terminal has no GitHub login
#  (GitHub Desktop keeps its own). So press "Fetch origin" in
#  GitHub Desktop first, then run this.
# ──────────────────────────────────────────────────────────────
cd "$(dirname "$0")" || exit 1

# try to refresh from GitHub; fall back to the last fetch if we cannot
if git fetch --quiet origin 2>/dev/null; then
  FRESH="just now"
else
  FRESH="last time GitHub Desktop fetched"
  printf '\n  (Terminal has no GitHub login, so using %s.\n   For an up-to-the-second check, press "Fetch origin" in GitHub Desktop.)\n' "$FRESH"
fi

BEHIND=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo 0)
AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)
DIRTY=$(git status --porcelain | wc -l | tr -d ' ')

printf '\n  Compared against GitHub as of %s:\n\n' "$FRESH"

if [ "$BEHIND" = "0" ]; then
  echo "  ✓ Nothing new from her."
else
  echo "  She published $BEHIND change(s):"
  echo
  git log --pretty='    · %s   (%cr)' HEAD..origin/main
  echo
  if [ "$DIRTY" != "0" ]; then
    echo "  ⚠  You have $DIRTY uncommitted file(s), so nothing was pulled."
    echo "     Commit them in GitHub Desktop first, then run this again."
    exit 1
  fi
  if git merge --ff-only origin/main --quiet 2>/dev/null; then
    echo "  ✓ Pulled her changes down."
    node build.js >/dev/null 2>&1 && echo "  ✓ Rebuilt the pages locally."
  else
    echo "  ⚠  Could not pull automatically."
    echo "     Open GitHub Desktop and press 'Pull origin'."
    exit 1
  fi
fi

[ "$DIRTY" != "0" ] && echo "  · $DIRTY file(s) changed locally, not yet committed."
[ "$AHEAD" != "0" ] && echo "  · $AHEAD commit(s) ready to push from GitHub Desktop."
printf '\n'
