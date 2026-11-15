# Configuration reference

## Where settings live

Mellorin reads `mellorin.toml` from the Tauri application config directory. On macOS with the identifier `dev.mellorin.app`:

```
~/Library/Application Support/dev.mellorin.app/mellorin.toml
```

The file is created with defaults on first launch. Most keys can be changed in **Settings** (<kbd>⌘</kbd><kbd>,</kbd>); editing the file by hand also works while the app is closed. Unknown keys are ignored and missing keys fall back to defaults.

## Keys

| Key | Type | Default | Description |
|---|---|---|---|
| `vault_path` | string | `~/MellorinVault` | Folder of Markdown files. The agent runs here and the app reads it. `~` is expanded. |
| `claude_path` | string | `claude` | The Claude Code CLI executable (name on `PATH` or absolute path). |
| `theme` | string | `light` | Visual theme. Only the light cream theme is implemented. |
| `text_size` | integer | `14` | Base text size in pixels. |
| `jery_can_edit_vault` | boolean | `true` | When `true` the CLI starts in `acceptEdits` mode so the agent can create and edit files **inside the vault**. Shell commands, network tools and writes outside the vault stay denied. |
| `jery_ticktick` | `"full"` \| `"read"` \| `"off"` | `"full"` | TickTick tools the agent may call through your Claude account connector. `read` allows only reading tools; `off` adds no TickTick permission. |

Example:

```toml
vault_path = "~/Developer/vaults/MainStorage-copy"
claude_path = "claude"
theme = "light"
text_size = 14
jery_can_edit_vault = true
jery_ticktick = "full"
```

## What the app adds to your vault

| Path | Written by | Purpose |
|---|---|---|
| `.mellorin/state.json`, `.mellorin/today.json` | the agent | Dashboard state: progress, tasks, dates. The app only reads them. |
| `.mellorin/README.md` | the app | Describes the state schema and the reply protocol for the agent. |
| `formats/<subject>-<skill>.json` | the agent, after your Apply | Lesson formats. See [formats](formats.md). |
| `formats/.history/` | the app | Versions before each applied change, used for rollback. |
| `app-requests/YYYY-MM-DD-<block>.md` | the agent or the renderer | Requests for blocks the app does not have. |
| `vocabulary/mywords-list.md` | the app (word status) and the agent | Appended to or edited line by line in its existing format. |

The app never moves, renames or edits your own service files: `CLAUDE.md` files, `.claude/`, `.obsidian/`, `JERY/`, `Templates/`.

## Command-line flags the app passes to Claude Code

For transparency, the chat subprocess starts in the vault directory with streaming JSON input and output. With `jery_can_edit_vault = true` it adds `--permission-mode acceptEdits`. With `jery_ticktick` other than `off` it adds an allow rule for the TickTick connector (`mcp__claude_ai_TickTick`, or only its read tools in `read` mode). No permission-bypass flag is ever used.

## Environment

| Variable | Used by | Meaning |
|---|---|---|
| `MELLORIN_VAULT` | `scripts/` | Default vault for the helper scripts |
| `MELLORIN_MOCKUPS` | `scripts/visual-qa.mjs` | Folder with design mockups for visual comparison |

See also: [vault permissions](vault-permissions.md), [state schema](state.schema.json), [today schema](today.schema.json).
