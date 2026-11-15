# Contributing

## Setup

Requirements: Rust (stable), Node.js 20+, pnpm, Tauri CLI.

```bash
pnpm install
cargo tauri dev
```

## Workflow

1. Pick or create an issue
2. Branch from `develop`: `git checkout -b feature/your-name develop`
3. Commit using Conventional Commits (see CLAUDE.md)
4. Open a PR targeting `develop`
5. PR merges after review and CI passes

## Releases

1. Branch `release/vX.Y.Z` from `develop`
2. Bump version in `Cargo.toml` and `package.json`
3. PR to `main`, then tag: `git tag vX.Y.Z`
4. Special milestone tags (e.g. `mvp`) applied manually

## CI

GitHub Actions runs on every PR to `develop` and `main`:
- `cargo fmt --check`
- `cargo clippy`
- `cargo test`
- `pnpm typecheck`
- `pnpm test`
