#!/usr/bin/env bash
# Look at and undo changes made inside the vault copy (it is a local git repository).
# Restoring never rewrites history: it records the restore as a NEW commit, so the
# state before the restore can always be brought back as well.
#
# Usage:
#   scripts/vault-history.sh log [N]                 last N commits (default 15) with changed files
#   scripts/vault-history.sh show <rev>              what a commit changed
#   scripts/vault-history.sh restore <rev> [path...] bring files back to their state at <rev>
#                                                    (no path: the whole vault)
# Vault: $MELLORIN_VAULT or ~/Developer/vaults/MainStorage-copy
set -euo pipefail

vault="${MELLORIN_VAULT:-$HOME/Developer/vaults/MainStorage-copy}"
if [ ! -d "$vault/.git" ]; then
  echo "vault-history: $vault is not a git repository" >&2
  exit 2
fi
git_v() { git -C "$vault" "$@"; }

cmd="${1:-log}"
case "$cmd" in
  log)
    git_v log --stat --date=format:'%Y-%m-%d %H:%M' --format='%n%h  %ad  %s' -n "${2:-15}"
    ;;
  show)
    rev="${2:?usage: vault-history.sh show <rev>}"
    git_v show --stat --format='%h  %ad  %s' --date=format:'%Y-%m-%d %H:%M' "$rev"
    ;;
  restore)
    rev="${2:?usage: vault-history.sh restore <rev> [path...]}"
    shift 2
    # resolve the revision first: the safety snapshot below would move HEAD
    rev="$(git_v rev-parse --verify --short "$rev^{commit}")"
    if [ -n "$(git_v status --porcelain)" ]; then
      echo "vault-history: uncommitted changes exist; committing them first so nothing is lost"
      git_v add -A
      git_v -c user.name="Gamid Uzalov" -c user.email="uzalovgamid@gmail.com" \
        commit -q -m "chore: snapshot before restore"
    fi
    if [ "$#" -eq 0 ]; then
      git_v checkout "$rev" -- .
    else
      git_v checkout "$rev" -- "$@"
    fi
    git_v add -A
    if git_v diff --cached --quiet; then
      echo "nothing to restore: the files already match $rev"
      exit 0
    fi
    git_v -c user.name="Gamid Uzalov" -c user.email="uzalovgamid@gmail.com" \
      commit -q -m "chore: restore ${*:-vault} to $rev"
    echo "restored to $rev as a new commit:"
    git_v log -1 --stat --format='%h  %s'
    ;;
  *)
    echo "usage: vault-history.sh log [N] | show <rev> | restore <rev> [path...]" >&2
    exit 2
    ;;
esac
