# CLAUDE.md — rules for AI agents working in this repo

## Project

Mellorin is a desktop study companion built with Tauri. It wraps Claude Code as a subprocess so the user can chat with JERY (their personal AI assistant) through a native UI, while all data stays in local Markdown files.

## Stack

- Tauri (Rust backend, WebView frontend)
- React + TypeScript (UI)
- Claude Code CLI as subprocess (no direct API calls)
- Markdown files as the single source of truth

## Branch strategy

| Branch | Purpose |
|---|---|
| `main` | stable, tagged releases only |
| `develop` | integration branch, all PRs target this |
| `feature/<name>` | new features |
| `fix/<name>` | bug fixes |
| `release/<version>` | release preparation |

Never commit directly to `main` or `develop`.

## Commit conventions

Use Conventional Commits:

```
feat: add word card flip animation
fix: resolve subprocess stdout buffering
docs: update architecture diagram
style: format Rust files with rustfmt
refactor: extract chat message parser
test: add subprocess integration tests
chore: update Tauri to 2.1.0
perf: reduce re-renders in message list
```

No Claude attribution lines in commits. Author is always Gamid Uzalov.

## Versioning

Semantic versioning: `vMAJOR.MINOR.PATCH`

Special tags:
- `mvp` — first usable version
- `v0.x.x` — pre-stable

## Code rules

- Rust: follow `rustfmt` and `clippy` defaults
- TypeScript: strict mode, no `any`
- No hardcoded paths — use config
- All user data stays in the local vault directory, never sent anywhere except the Claude subprocess stdin

## What JERY does here

JERY is the AI persona that runs inside Mellorin. Start the CLI in the configured vault directory so it loads that vault's CLAUDE.md and project rules. Keep persona instructions in the user's vault rather than hardcoding them in the application. Use a temporary synthetic vault for development and tests.

## Issues and PRs

- One issue per problem or feature
- PRs reference their issue: `Closes #N`
- PR title follows commit convention: `feat: ...`
