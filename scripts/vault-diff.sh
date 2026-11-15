#!/usr/bin/env bash
# Read-only comparison of the working vault copy with the original vault.
# Nothing is changed anywhere. App-owned additions (.mellorin, formats) and noise
# (.git, .DS_Store, iCloud placeholders) are ignored.
# Usage: scripts/vault-diff.sh [COPY_DIR] [ORIGINAL_DIR]
#   COPY_DIR      default: $MELLORIN_VAULT or ~/Developer/vaults/MainStorage-copy
#   ORIGINAL_DIR  default: the iCloud Obsidian MainStorage
# Exit code: 0 identical, 1 differences found, 2 usage or path error.
set -euo pipefail

copy="${1:-${MELLORIN_VAULT:-$HOME/Developer/vaults/MainStorage-copy}}"
orig="${2:-$HOME/Library/Mobile Documents/iCloud~md~obsidian/Documents/MainStorage}"

for dir in "$copy" "$orig"; do
  if [ ! -d "$dir" ]; then
    echo "vault-diff: folder not found: $dir" >&2
    exit 2
  fi
done

out="$(diff -rq \
  --exclude='.git' --exclude='.DS_Store' --exclude='.mellorin' --exclude='formats' \
  --exclude='*.icloud' "$orig" "$copy" || true)"

if [ -z "$out" ]; then
  echo "identical: copy and original have the same content"
  exit 0
fi

only_orig="$(printf '%s\n' "$out" | grep -c "^Only in $orig" || true)"
only_copy="$(printf '%s\n' "$out" | grep -c "^Only in $copy" || true)"
differs="$(printf '%s\n' "$out" | grep -c '^Files .* differ$' || true)"

echo "original: $orig"
echo "copy:     $copy"
echo "only in original: $only_orig | only in copy: $only_copy | content differs: $differs"
echo
printf '%s\n' "$out"
exit 1
