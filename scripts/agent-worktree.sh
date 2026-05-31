#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# agent-worktree.sh — bootstrap an isolated git worktree for a Claude
# (or any AI/human) coding session. ELIMINATES the shared-tree race
# that produced this session's 3 incidents:
#   1. catalog file content corruption (concurrent Edit on shared file)
#   2. commit absorption (`fatal: cannot lock ref HEAD` mid-commit)
#   3. branch chaos (one session's checkout swept the other's edits)
#
# Doctrine: ONE worktree + ONE branch per active session. Sessions
# never share an index. Integration is via PR to main.
#
# Usage:
#   scripts/agent-worktree.sh <slug>            # branch  agent/<slug>-YYYY-MM-DD
#   scripts/agent-worktree.sh <slug> --from <ref>  # branch off a specific ref
#   scripts/agent-worktree.sh --list            # show active worktrees
#   scripts/agent-worktree.sh --prune <slug>    # remove a finished worktree
#
# Examples:
#   scripts/agent-worktree.sh measures-pdf
#   scripts/agent-worktree.sh security-audit --from origin/main
#   scripts/agent-worktree.sh --list
#
# The worktree lives at ../alawael-agent-<slug>/ (sibling to this repo).
# Start the Claude session by `cd`-ing into the new worktree path it prints.
# ════════════════════════════════════════════════════════════════════
set -e

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$REPO_ROOT" ]; then
  echo "❌ not inside a git repo" >&2
  exit 1
fi
cd "$REPO_ROOT"

usage() {
  sed -n '/^# Usage:/,/^# ═══/p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

case "${1:-}" in
  ""|--help|-h) usage 0 ;;
  --list)
    echo "Active worktrees:"
    git worktree list
    exit 0
    ;;
  --prune)
    SLUG="${2:?--prune needs a slug}"
    WT_PATH="../alawael-agent-$SLUG"
    if ! git worktree list --porcelain | grep -q "$WT_PATH"; then
      echo "❌ no worktree at $WT_PATH" >&2; exit 1
    fi
    git worktree remove "$WT_PATH" --force
    echo "✅ removed worktree $WT_PATH (branch left intact — delete via 'git branch -D' if done)"
    exit 0
    ;;
esac

SLUG="$1"
shift || true
FROM_REF="origin/main"
while [ $# -gt 0 ]; do
  case "$1" in
    --from) FROM_REF="${2:?--from needs a ref}"; shift 2 ;;
    *) echo "❌ unknown flag: $1" >&2; usage 1 ;;
  esac
done

# Reject names that would clash with git refs or paths.
if ! echo "$SLUG" | grep -qE '^[a-z0-9][a-z0-9-]{1,40}$'; then
  echo "❌ slug must be 2-41 chars of [a-z0-9-] and start alphanumeric" >&2; exit 1
fi

DATE_STAMP="$(date -u +%Y-%m-%d)"
BRANCH="agent/${SLUG}-${DATE_STAMP}"
WT_PATH="../alawael-agent-${SLUG}"

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  echo "❌ branch $BRANCH already exists — pick another slug or 'git branch -D $BRANCH' first" >&2
  exit 1
fi
if [ -e "$WT_PATH" ]; then
  echo "❌ path $WT_PATH already exists" >&2; exit 1
fi

echo "▶ fetching $FROM_REF (so the worktree starts from latest)..."
case "$FROM_REF" in
  origin/*) git fetch origin "${FROM_REF#origin/}" --quiet ;;
esac

echo "▶ creating worktree:"
echo "   path:   $WT_PATH"
echo "   branch: $BRANCH"
echo "   from:   $FROM_REF"
git worktree add -b "$BRANCH" "$WT_PATH" "$FROM_REF"

cat <<NEXT

✅ Worktree ready.

  cd "$WT_PATH"          # start the Claude session HERE
  # work, commit, push:
  git push -u origin "$BRANCH"
  # then open a PR on GitHub against main.

When the session is done:
  $(realpath "$0") --prune "$SLUG"

Running sessions in parallel? Spawn another worktree:
  $(realpath "$0") <other-slug>

The two sessions will NEVER share an index → no commit races, no catalog
corruption, no "cannot lock ref HEAD" failures.
NEXT
