# Mellorin

[![CI](https://github.com/Uzalov-Gamid/Mellorin/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/Uzalov-Gamid/Mellorin/actions/workflows/ci.yml)
![Tauri](https://img.shields.io/badge/Tauri-2-blue?logo=tauri)
![Rust](https://img.shields.io/badge/Rust-stable-orange?logo=rust)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)
![Status](https://img.shields.io/badge/status-pre--alpha-yellow)

A desktop learning companion. Work with texts, study vocabulary, chat with your AI assistant, and visualize subjects — all in one native app backed by local Markdown files.

---

## What it does

Mellorin replaces scattered tools with a single focused workspace:

- **Chat** — talk to your AI assistant with full context from your personal knowledge vault
- **Text viewer** — click any sentence to break it into words, click words for definitions, mark unknowns to build vocabulary
- **Visual subjects** — each subject gets its own interactive layer: Kubernetes cluster diagrams for DevOps, memory layout for C, table diagrams for SQL
- **Vocabulary** — unknown words collected automatically, study cards built in

The app runs entirely on your machine. No data leaves the device except through the AI subprocess you configure.

## Stack

| Layer | Technology |
|---|---|
| Desktop | [Tauri 2](https://tauri.app) (Rust + WebView) |
| Frontend | React 18 + TypeScript 5 |
| AI | Claude Code CLI (subprocess — uses your own subscription) |
| Storage | Local Markdown files (Obsidian-compatible vault) |

## Status

Pre-alpha — architecture and MVP scope defined, scaffold in place, core features not yet built.

Roadmap to MVP:
- [ ] Claude Code subprocess integration
- [ ] Chat UI
- [ ] Text viewer with word interaction
- [x] Tauri + React scaffold
- [ ] README with screenshots
- [ ] Docker dev environment

## Getting started

Requirements: [Rust](https://rustup.rs) stable, [Node.js](https://nodejs.org) 20+, [Tauri CLI](https://tauri.app/start/prerequisites/)

```bash
git clone https://github.com/Uzalov-Gamid/Mellorin.git
cd Mellorin
npm install
cargo tauri dev
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch strategy, commit conventions, and the full development workflow.

## Docs

- [Architecture](docs/architecture.md)
- [MVP scope](docs/mvp.md)

## License

MIT
