# Changelog

All notable changes to Mellorin are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-11-15

The second release: from a chat and a reading tab to a study workspace whose screens are described by formats in the user's vault.

### Added

- **Shell.** Window without a title bar (macOS window buttons inside the sidebar), a collapsible sidebar with a day ring, week dots, a trail per subject and a collapsed form (⌘B), and a bottom strip for the agent with thinking, limit and interrupted states (⌘J expands the conversation).
- **Screens.** Home (today's tasks, nearest dates, progress by subject, repeats, week, tails and mistakes), English Reading (numbered sentences, phrase breakdown, word card with pronunciation and vocabulary status), Words, Listening (transcript hidden until its step), Writing, Grammar, a Notes reader for real vault notes, and Settings.
- **Formats and blocks.** Lesson formats as `formats/<subject>-<skill>.json`, a validated block library, a streaming reply protocol with fenced `mellorin` blocks, and an inbox for block requests in `app-requests/`.
- **Change proposals.** `mellorin-change` proposals with a before and after preview, explicit Apply, atomic writes, version snapshots in `formats/.history/` and rollback from Settings.
- **Agent access.** `jery_can_edit_vault` (edits inside the vault via `acceptEdits`) and `jery_ticktick` (`full`, `read`, `off`) for tasks and calendar through the user's Claude account.
- **Vault state.** `.mellorin/state.json` and `today.json`, written by the agent from the user's real notes and read by the app.
- **Tooling.** `scripts/vault-backup.sh`, `vault-diff.sh`, `vault-history.sh`, and `scripts/visual-qa.mjs` for side-by-side comparison of screens with design mockups and an overflow audit.
- **Documentation.** A rewritten README (English and Russian), a user guide, configuration reference, glossary, FAQ, design previews and a security policy.

### Changed

- New application icon: a square spiral around a pixel letter m, in 8-bit RGBA.
- The visual language: light cream palette, SF Mono Bold as the base weight and Heavy for emphasis.
- The top bar carries no buttons; actions are requested from the agent. Home has one quiet refresh icon.
- The collapsed sidebar is 80 px wide so the window buttons have room.
- Format history with rollback moved into Settings.
- **License:** the source is now published under an all-rights-reserved notice: readable on GitHub, any other use requires written permission. Earlier versions remain MIT. See [docs/LICENSING.md](docs/LICENSING.md).

### Fixed

- A startup crash on macOS caused by 16-bit PNG icons.
- Streaming of partial assistant output and handling of failed results in the chat subprocess.
- Races in the chat and word popup lifecycles.

## [0.1.0] - 2026-11-15

First usable version ("mvp"): a Tauri 2 desktop shell, a chat with the Claude Code CLI as a subprocess, an English reading workspace with contextual word translation, and word capture into `vocabulary/mywords-list.md`. Published under the MIT License.

[0.2.0]: https://github.com/Uzalov-Gamid/Mellorin/releases/tag/v0.2.0
[0.1.0]: https://github.com/Uzalov-Gamid/Mellorin/releases/tag/v0.1.0
