#!/usr/bin/env bash
# Snapshot a vault into a timestamped .tar.gz. Read-only for the vault; never deletes anything.
# Usage: scripts/vault-backup.sh [VAULT_DIR] [BACKUP_DIR]
#   VAULT_DIR   default: $MELLORIN_VAULT or ~/Developer/vaults/MainStorage-copy
#   BACKUP_DIR  default: ~/Developer/backups
set -euo pipefail

vault="${1:-${MELLORIN_VAULT:-$HOME/Developer/vaults/MainStorage-copy}}"
dest="${2:-$HOME/Developer/backups}"

if [ ! -d "$vault" ]; then
  echo "vault-backup: vault not found: $vault" >&2
  exit 1
fi

vault="$(cd "$vault" && pwd)"

# check the destination BEFORE creating anything, so nothing is ever created inside the vault
case "$dest" in
  /*) dest_abs="$dest" ;;
  *) dest_abs="$PWD/$dest" ;;
esac
case "$dest_abs/" in
  "$vault"/*)
    echo "vault-backup: backup folder must not be inside the vault: $dest_abs" >&2
    exit 1
    ;;
esac

mkdir -p "$dest"
dest="$(cd "$dest" && pwd)"

name="$(basename "$vault")"
stamp="$(date +%Y%m%d-%H%M%S)"
archive="$dest/$name-$stamp.tar.gz"

if [ -e "$archive" ]; then
  echo "vault-backup: refusing to overwrite existing archive: $archive" >&2
  exit 1
fi

tar -czf "$archive" -C "$(dirname "$vault")" "$name"

# verify the archive is readable and holds the same number of files
files_in_vault="$(find "$vault" -type f | wc -l | tr -d ' ')"
files_in_archive="$(tar -tzf "$archive" | grep -vc '/$' || true)"
if [ "$files_in_vault" != "$files_in_archive" ]; then
  echo "vault-backup: file count mismatch (vault $files_in_vault, archive $files_in_archive): $archive" >&2
  exit 1
fi

size="$(du -h "$archive" | cut -f1)"
echo "backup ok: $archive ($size, $files_in_archive files)"
