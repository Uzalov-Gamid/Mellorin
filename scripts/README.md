# scripts

Helpers for keeping a learning vault safe while Mellorin and its agent work on it.
They are plain Bash, read-only unless stated, and never delete data.

| Script | What it does |
|---|---|
| `vault-backup.sh [VAULT] [BACKUP_DIR]` | Timestamped `.tar.gz` snapshot of a vault. Verifies the archive. Refuses to write inside the vault or overwrite an existing archive. |
| `vault-diff.sh [COPY] [ORIGINAL]` | Read-only comparison of the working copy with the original vault. Ignores `.git`, `.DS_Store`, `.mellorin`, `formats`. Exit code 1 when they differ. |
| `vault-history.sh log \| show \| restore` | Inspect and undo changes in the vault copy (a local git repository). A restore is recorded as a new commit, so it can be undone too. |

Defaults: the working vault is `$MELLORIN_VAULT` or `~/Developer/vaults/MainStorage-copy`.

## Typical use

```bash
scripts/vault-backup.sh                       # snapshot before a risky session
scripts/vault-diff.sh                         # what changed against the original?
scripts/vault-history.sh log 10               # what did the agent change?
scripts/vault-history.sh restore abc1234 Learning/English/vocabulary/mywords-list.md
```
