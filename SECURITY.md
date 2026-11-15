# Security

## Reporting a vulnerability

Please report security problems **privately** through GitHub's "Report a vulnerability" feature on this repository (Security tab), or by contacting [Gamid Uzalov](https://github.com/Uzalov-Gamid) through GitHub. Do not open a public issue for a vulnerability. You will get an acknowledgement as soon as possible.

## Scope

Mellorin is a desktop application that starts the Claude Code CLI in a folder you choose and renders Markdown-based lesson formats. In scope: the application code in this repository, the way it starts and constrains the CLI, how it reads and writes inside the vault, and the validation of formats and agent replies.

## Security model

| Area | Design |
|---|---|
| Credentials | Mellorin stores no API keys or passwords. The CLI uses your own login. TickTick is reached through the connector in your Claude account. |
| Agent permissions | With `jery_can_edit_vault = true` the CLI runs with `--permission-mode acceptEdits`: edits inside the vault directory are approved. Shell commands, network tools and writes outside the vault remain denied. No permission-bypass mode is used. |
| Vault boundary | Reads and writes by the app are limited to the vault; paths are canonicalized and traversal (`..`, symlinks leaving the vault) is rejected. Writes are atomic (temporary file and rename). |
| Formats and replies | Data only, with hard limits (256 KiB, depth 8, bounded counts and lengths). No HTML, scripts, expressions or file paths. Audio URLs must be absolute `http` or `https`. Invalid input is rejected and the last valid format is kept. |
| Changes | A proposed change is previewed and applied only by an explicit click, snapshotted in `formats/.history/`, and reversible. |
| Service files | `CLAUDE.md` files, `.claude/`, `.obsidian/`, `JERY/` and `Templates/` are never edited by the app. |
| Logging | By design the app does not write note contents, task titles or vocabulary to logs. Do not include them in bug reports or commits. |

## Known limitations

- Builds are **unsigned and not notarized**.
- The agent's own behavior is governed by your `CLAUDE.md` and Claude Code's permission system; Mellorin constrains capabilities but cannot make a model's output correct.
- `jery_can_edit_vault` allows the agent to change any file inside the vault. Use a git-backed copy (see `scripts/vault-history.sh`) while evaluating.
- Windows and Linux builds are not verified in this release.

## Supported versions

Only the latest release receives security fixes.
