# Mellorin

A desktop learning companion that gives every subject its own visual layer.

Chat with JERY — your personal AI assistant — and get interactive diagrams for Kubernetes, clickable text for English, memory visualizations for C, and more. All backed by your local Markdown vault.

## Status

> Pre-alpha. Architecture and MVP in design.

## Concept

```
┌─────────────────────────────────────────────────────┐
│  You ask or paste something in the Chat             │
│                      ↓                              │
│  JERY understands the subject and renders it        │
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
```

Each subject's rules live in your vault (the same Markdown files JERY already reads). No hardcoded logic — add a new subject by writing its rules.

## Stack

- **Desktop**: Tauri 2 (Rust + WebView)
- **UI**: React + TypeScript
- **AI**: Claude Code subprocess — uses your subscription, not an API key
- **Storage**: local Markdown files, compatible with Obsidian

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch strategy, commit conventions, and setup instructions.

## Docs

- [Architecture](docs/architecture.md)
- [MVP scope](docs/mvp.md)
