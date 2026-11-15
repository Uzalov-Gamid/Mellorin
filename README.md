# Mellorin

[![CI](https://github.com/Uzalov-Gamid/Mellorin/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/Uzalov-Gamid/Mellorin/actions/workflows/ci.yml)
![Tauri](https://img.shields.io/badge/Tauri-2-blue?logo=tauri)
![Rust](https://img.shields.io/badge/Rust-stable-orange?logo=rust)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)
![Status](https://img.shields.io/badge/status-pre--alpha-yellow)

A desktop learning companion that gives every subject its own visual layer.

Chat with your AI assistant and get interactive diagrams for Kubernetes, clickable text for English, memory visualizations for C, and more. All backed by your local Markdown vault.

---

## What it does

- **Chat** — talk to your AI assistant with full context from your personal knowledge vault
- **Text viewer** — click any sentence to break it into words, click words for definitions, mark unknowns to build vocabulary
- **Visual subjects** — each subject gets its own interactive layer: K8s cluster diagrams, memory layout for C, table diagrams for SQL
- **Vocabulary** — unknown words collected automatically, study cards built in

The app runs entirely on your machine. No data leaves the device except through the AI subprocess you configure.

## Concept

\`\`\`
┌─────────────────────────────────────────────────────┐
│  You ask or paste something in the Chat             │
│                      ↓                              │
│  The AI understands the subject and renders it      │
│  in the Visual Panel using the right module         │
│                                                     │
│  English  → clickable text, word cards              │
│  Docker   → layer diagram, container lifecycle      │
│  K8s      → live cluster topology: pod↔node↔master  │
│  C        → memory layout, call stack, pointers     │
│  SQL      → table diagram, query result view        │
│  Arabic   → letter cards, ayah breakdown            │
│  ...any subject → its own rules, its own components │
└─────────────────────────────────────────────────────┘
\`\`\`

Each subject's rules live in your vault. No hardcoded logic — add a new subject by writing its rules.

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

\`\`\`bash
git clone https://github.com/Uzalov-Gamid/Mellorin.git
cd Mellorin
npm install
cargo tauri dev
\`\`\`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch strategy, commit conventions, and the full development workflow.

## Docs

- [Architecture](docs/architecture.md)
- [MVP scope](docs/mvp.md)

## License

MIT
