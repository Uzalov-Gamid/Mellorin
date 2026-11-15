# Architecture

## Overview

```
┌─────────────────────────────────────────┐
│                  Pulse                  │
│  ┌─────────────────┐  ┌──────────────┐  │
│  │   Chat (JERY)   │  │  Visual UI   │  │
│  │  React/TS       │  │  panels,     │  │
│  │  message list   │  │  cards,      │  │
│  │  input          │  │  texts       │  │
│  └────────┬────────┘  └──────┬───────┘  │
│           │                  │          │
│           └──────┬───────────┘          │
│                  ▼                      │
│           Tauri IPC layer               │
│                  │                      │
│           Rust backend                  │
│        ┌─────────┴──────────┐           │
│        │  vault reader/     │           │
│        │  writer (md files) │           │
│        │  subprocess mgr    │           │
│        └─────────┬──────────┘           │
└──────────────────┼──────────────────────┘
                   │
         ┌─────────┴──────────┐
         │  Local filesystem  │
         │  MainStorage vault │
         │  (md files)        │
         └─────────┬──────────┘
                   │
         ┌─────────┴──────────┐
         │  Claude Code CLI   │
         │  subprocess        │
         │  (uses subscription│
         │   not API)         │
         └────────────────────┘
```

## Key components

### Tauri backend (Rust)

- **SubprocessManager** — spawns and manages `claude` CLI process, handles stdin/stdout streaming
- **VaultReader** — reads Markdown files from the vault directory
- **VaultWriter** — writes updated Markdown back (vocabulary, notes, progress)
- **ConfigManager** — loads `pulse.toml` from the vault or app config dir

### Frontend (React/TypeScript)

- **ChatPanel** — message thread with JERY, streams Claude output
- **TextViewer** — renders text with clickable sentences/words, inline translation
- **WordStudy** — card-based vocabulary review (flip, sentence, dictation modes)
- **SettingsPanel** — UI over `pulse.toml`

## Data flow: chat message

```
User types → ChatPanel → Tauri IPC → SubprocessManager
  → claude subprocess stdin
  → stdout stream → Tauri IPC → ChatPanel renders
  → if file change needed → VaultWriter
```

## Configuration

`pulse.toml` lives in the vault root or `~/.config/pulse/pulse.toml`.

```toml
[vault]
path = "~/Library/Mobile Documents/iCloud~md~obsidian/Documents/MainStorage"

[claude]
binary = "claude"          # path to claude CLI
model = "claude-opus-4-5"  # optional override

[ui]
theme = "dark"
font_size = 14
```

## AI: how JERY runs inside Pulse

The Claude subprocess is started with `--system-prompt` pointing to the vault's `CLAUDE.md`. This means JERY has the same rules and context as in a normal Claude Code session. The vault path is injected so Claude can read and write files directly.
