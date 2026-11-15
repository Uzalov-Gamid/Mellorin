# MVP scope

## Goal

A working desktop app where Gamid can chat with JERY and work with English texts — replacing the current Claude Code terminal workflow for those two use cases.

## In scope

### 1. Chat with JERY
- Message input + scrollable thread
- Claude Code subprocess integration (uses Claude subscription)
- Streams responses in real time
- System prompt loaded from vault CLAUDE.md
- Vault path passed to Claude so it can read/write files

### 2. Text viewer (English listening/reading)
- Paste or load a text
- Click a sentence → split into phrases and words
- Click a word → show translation (via Claude)
- Mark word as unknown → appended to `vocabulary/mywords-list.md`

### 3. Config
- `pulse.toml` with vault path, Claude binary path, theme
- Dark theme only for MVP

## Out of scope for MVP

- Word study cards (phase 2)
- Mind maps / visual knowledge graphs (phase 2)
- Other subjects beyond English text (phase 2)
- Multiple LLM support (phase 3)
- Mobile / web version

## Done when

Gamid can open Pulse, chat with JERY about a DevOps topic, and work through an ELLLO listening text — without opening Claude Code terminal or Obsidian manually.
