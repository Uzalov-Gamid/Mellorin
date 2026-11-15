# Glossary

| Term | Meaning |
|---|---|
| **Agent / JERY** | The assistant that does the content work. Technically the Claude Code CLI started in your vault; "JERY" is the persona defined by your own `CLAUDE.md` and rules. |
| **App** | Mellorin, the desktop program. It visualizes the vault and helps study methods; it does not author content. |
| **Vault** | The folder of Markdown files that holds your notes, texts, words, plans and Mellorin's data. An Obsidian vault works as is. |
| **Service files** | Files that configure the agent and your editor: `CLAUDE.md` files, `.claude/`, `.obsidian/`, `JERY/`, `Templates/`. The app never edits them. |
| **Subject** | A top-level area of study (English, DevOps, Arabic, C, SQL…), a folder under `Learning/`. |
| **Skill** | A kind of study inside a subject: reading, listening, words, speaking, writing, grammar, notes, overview. |
| **Trail** | The sidebar's vertical line of a subject's skills with their state (passed, current, upcoming). |
| **Strip** | The one-line agent bar at the bottom: last message and input. |
| **Format** | A JSON file `formats/<subject>-<skill>.json` that describes a lesson: ordered steps and blocks. Data only. |
| **Block** | A unit of interface the app can render: text, quiz, table, audio player, timer… Blocks come in three levels (see below). |
| **Primitive (level 1)** | Always-available block: heading, text, list, table, card, columns, chips, progress, quote, code. |
| **Smart block (level 2)** | A block with state or interaction: clickable-word text, sentence numbering, quiz, flashcards, audio player, code or query field, timer, checklist, collapsible answers. |
| **Request (level 3)** | A note in `app-requests/` asking for a block that does not exist yet. |
| **Semantic role** | A meaning such as accent, success, warning, danger, muted, highlight. Formats use roles; the app maps them to the palette. |
| **Reply protocol** | The fenced `mellorin` and `mellorin-change` sections the agent can put in a reply. See [jery-protocol.md](jery-protocol.md). |
| **Proposal** | A `mellorin-change` section: a suggested format change with before and after. Never applied automatically. |
| **Apply / Rollback** | Accepting a proposal (an atomic write plus a version snapshot) and undoing it from the workshop. |
| **Workshop** | The Settings section that lists format changes with rollback and shows open block requests. |
| **State files** | `.mellorin/state.json` and `today.json`, written by the agent from your real files and read by the app for Home and the sidebar. |
| **Tail** | Unfinished study work carried to the next session. |
| **Day ring** | The ring in the sidebar showing tasks done today out of today's tasks. |
| **Synthetic vault** | An invented vault used for tests and screenshots, never real notes. |
