# Contributing

## Setup

Requirements: Rust (stable), Node.js 20+, npm, and the [Tauri 2 platform prerequisites](https://tauri.app/start/prerequisites/). The Tauri CLI is a project development dependency.

For native chat and translation, install and authenticate Claude Code CLI and configure a disposable synthetic vault as described in the [README quickstart](README.md#quickstart) before launching.

```bash
npm ci
npm run tauri -- dev
```

## Workflow

1. Pick or create an issue
2. Branch from `develop`: `git checkout -b feature/your-name develop`
3. Commit using Conventional Commits (see CLAUDE.md)
4. Open a PR targeting `develop`
5. PR merges after review and CI passes

## Releases

1. Branch `release/vX.Y.Z` from `develop`
2. Bump version in `src-tauri/Cargo.toml`, `package.json`, and `src-tauri/tauri.conf.json`; update the corresponding package versions in both lockfiles
3. PR to `main`, then tag: `git tag vX.Y.Z`
4. Special milestone tags (e.g. `mvp`) applied manually

## CI

GitHub Actions runs on every PR to `develop` and `main`:
- `cargo fmt --check`
- `cargo clippy`
- `cargo test`
- `npm run typecheck`
- `npm run test`
