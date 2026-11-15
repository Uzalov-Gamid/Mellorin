# Implemented architecture

Mellorin uses a React/TypeScript frontend in a Tauri 2 desktop shell and a Rust backend. There are no direct model API calls in Mellorin; AI requests use the installed Claude Code CLI.

```text
React App / Chat / TextViewer
          │ Tauri commands and events (src/subprocess.ts)
Rust command handlers (src-tauri/src/lib.rs)
          ├── config.rs → app config directory / mellorin.toml
          ├── subprocess.rs → Claude Code CLI → remote service
          └── vault.rs → vault / vocabulary / mywords-list.md
```

## Chat and translation

`SubprocessManager` owns a chat process and its stdin, tracks running state, and stops the child on disconnect. Chat launches with `-p --input-format stream-json --output-format stream-json --verbose --include-partial-messages`. User messages are newline-delimited JSON on stdin.

The stdout parser emits incremental text from `stream_event` content-block text deltas. Completed `assistant` messages contribute only text not already streamed; nested agent messages are ignored. Successful `result` messages complete a turn; failed results and process/protocol failures become errors. Rust forwards `chat-delta`, `chat-done`, `chat-error`, and `subprocess-exit` events to the frontend. Stderr is retained as bounded diagnostic context for unsuccessful process exits.

Translation is a separate one-shot helper: `claude -p --output-format json`. The prompt contains the selected word and sentence as JSON data and is written to stdin. The helper checks process status and structured result errors, then returns nonempty result text for the popup.

Both processes run with the configured vault as their working directory. Claude Code loads vault rules through its normal instruction discovery; Mellorin does not replace the system prompt or inject the whole vault. A short appended chat instruction directs JERY to read the local protocol for learning/format tasks and propose format/process changes for the app’s Apply button. This instruction guides behavior; it is not an OS sandbox. CLI permissions and settings govern its file access and service behavior.

## Configuration and local writes

`Config::load` resolves Tauri's `app_config_dir()` and reads `mellorin.toml`. For identifier `dev.mellorin.app`, the macOS location is `~/Library/Application Support/dev.mellorin.app/mellorin.toml`. Configuration uses flat keys:

```toml
vault_path = "~/MellorinVault"
claude_path = "claude"
theme = "dark"
```

These are the defaults used when creating a missing config; existing configuration is preserved. A leading `~/` in `vault_path` expands to the home directory. The vault directory must exist before launching the CLI. The settings popover displays the configured path and the JERY vault-edit toggle. The app uses the light design tokens.

`vocab_add` serializes writes within the app and validates single-line input. It prefers the existing `Learning/English/vocabulary/mywords-list.md` five-column table, appends compatible rows and changes only the selected status cell while preserving unrelated bytes. A missing canonical file retains the MVP `vocabulary/mywords-list.md` bullet format. `vocab_list` reads bounded entries with source paths. Duplicate detection matches the complete word or phrase exactly, including case. Malformed or ambiguous tables and outside-vault symlinks are rejected. Other bounded vault commands and state/format operations are described below.

## Current limits

Chat history and pasted reading text live in frontend memory. There is no persisted conversation browser. English Words now provides a local six-step study flow from explicitly prepared vault lesson data; other study screens remain staged. Local Markdown storage does not make AI features offline: prompts and translation context reach the CLI service, and CLI tools may access vault files. The synthetic browser demos validate UI presentation with a mocked bridge, not native execution, live service compatibility, or real filesystem persistence.

## Machine-readable learning state

The app polls `.mellorin/state.json` and `.mellorin/today.json` every five seconds. Version 1 schemas are in `docs/state.schema.json` and `docs/today.schema.json`; Rust validates identifiers, arrays, dates, percentages, task flags and counters before returning a snapshot. Missing files produce empty states; invalid files produce visible diagnostics. Totals and progress are never taken from mockups.

`learning_init` creates `.mellorin/README.md` when absent, or appends the versioned protocol to existing instructions without replacing them. It includes both schemas and the exact refresh prompt from `src/prompts.ts`. Today/Refresh sends that prompt only after a user action. CLI access to TickTick uses the configured `jery_ticktick` capability and the user's connected Claude account.

`vault_read_text` and `vault_list` accept relative paths, reject traversal and canonical paths leaving the configured vault, and enforce file/directory limits (2 MiB text, 10,000 entries). External symlinks are rejected. These reads do not parse arbitrary prose into progress figures. The standard canonical-path checks assume the local vault is not being adversarially rewritten during a read.

Home task completion uses a dedicated `today_set_done` command after a user click. It patches one task in today's validated file, rejects stale dates/missing ids and replaces the file atomically, preserving permissions and other tasks. This deliberately avoids requiring CLI write permissions for a local checkbox; JERY still refreshes the broader state on request. UI confirmation follows the next file poll.

## Data-only lesson formats (Stage 7)

`FormatScreen` polls `formats/<subject>-<skill>.json` every five seconds through `vault_read_text`. The bounded v1 validator and block prop contract are documented in [formats.md](formats.md). Layout updates preserve the shared reading hook and stable block keys. English Reading composes independent `text`, `phrase-breakdown`, and `word-card` blocks around that hook; the standalone `TextViewer` uses the same render parts and still supports inline word popups. The mounted screen panel retains reading state across navigation.

`BlockContext` carries shared reading state, the current JERY message/data, and an explicit user-triggered intent callback. Format strings are escaped React text. Audio accepts only absolute HTTP(S). Code/query fields never execute. `writeBack` sends an intent and answer data to the existing JERY conversation only after a button click; it has no path or generic write command.

Two narrowly scoped Rust commands seed the fixed bundled English format and create deduplicated missing-block notes. Canonical inside-vault directory checks and create-new semantics prevent external symlink writes and replacement of existing files. Seed also appends the format contract once to the vault's `.mellorin/README.md`, preserving previous instructions. Errors stay visible while the last valid/bundled reading format remains usable. Missing-block request notes are available; request badges are a later stage. The implemented reply and apply protocols are described below.

## JERY reply blocks (Stage 8)

The frontend parses accumulated assistant text after each delta using `parseReply`; fragmented fences and JSON stay hidden until complete. Ordinary code fences are preserved. Each complete single block/array passes the existing bounded format validator. Chat bubbles and the bottom strip use the filtered text, while `JeryBlocks` renders validated material above the current screen with a shared block context. Invalid or truncated sections show diagnostics. Buttons wait until the response completes and send user-triggered intents through the same chat lifecycle. No automatic format/file changes. Protocol: [jery-protocol.md](jery-protocol.md), also appended once to `.mellorin/README.md` by learning initialization.

## Vault edit permission (Stage 9a)

`jery_can_edit_vault = true` defaults to the permission granted for this app. Chat adds `--permission-mode acceptEdits` only when enabled, retaining cwd = vault. One-shot translation/explanation helpers keep their existing read-oriented invocation and cwd. There is no bypass-permissions flag. Reads remain governed by normal CLI rules; shell, network and outside-directory writes gain no extra approval from Mellorin. Existing CLI settings still apply; this flag is not an OS sandbox.

The settings popover persists the toggle atomically while preserving other TOML values. Changing it stops the current chat process; the next user request reconnects with the new permission. When false Mellorin omits the flag (the CLI's existing settings still apply). The local task checkbox remains available independently.

Synthetic CLI regression on 2026-11-15 confirmed Write/Edit inside the vault for `.mellorin/today.json`, `formats/english-reading.json` and `Learning/English/reading/process.md`; both a relative `../outside.txt` and absolute outside write were attempted and denied by the CLI. No personal vault or Claude settings were changed.
||||||| parent of 1925930 (feat: add validated format change apply and rollback)

### Stage 9 integration

`src/changes/ChangePreview.tsx` exports the independent proposal UI; `src/changes/bridge.ts` owns the five `change_*` Tauri calls. `parseReply` now exposes optional `changes` alongside Stage 8 blocks. Render each proposal with `streaming={jery.streaming}` (use the existing active-response flag), route `onChange` to a user-initiated chat revision request, and use `onApplied` to refresh the lesson. `ChangeHistory` provides persisted rollback and explicit crash recovery across restarts. Key previews by response ID plus proposal index/content so a new proposal resets preview state. FormatScreen's existing five-second poll also reloads committed formats. See [jery-protocol.md](jery-protocol.md) for the exact contract and journal recovery behavior. The existing `learning_init` initialization also migrates Stage 8-only vault READMEs by appending Stage 9 once; this work does not change subprocess permissions.

## Requests inbox (Stage 10)

The sidebar badge polls `requests_snapshot` every five seconds. It reads bounded Markdown notes from `app-requests`, showing open count and escaped note text, including source format and data example. Missing directory means an empty inbox; failed reads show `?` and a diagnostic, never a fabricated count. At most 200 notes of 64 KiB each are accepted; outside-vault symlinks are rejected by the vault read layer.

Renderer requests retain the first example and deduplicate by date/block. A missing block produces a visible placeholder and a note describing its type, requesting format and JSON props. JERY can write a richer request note under normal vault-edit permission. After implementing the block, close the note with a standalone `Status: closed` or `Status: done` line (case insensitive); notes without a status are open. Request contents are data, never executable code. The inbox itself only reads notes; it does not send them anywhere or call a model.

## English Words (Stage 11, first screen)

`formats/english-words.json` composes the reusable `word-study` block. The separately validated `.mellorin/english-words.json` is prepared by JERY only on user request and freezes when study starts. Cards and all four quiz rounds run locally. Only explicit preparation/result buttons send intents to JERY; only JERY decides and writes vocabulary statuses. Canonical and legacy vocabulary source paths are retained per word. See [English Words v1](english-words.md) for the exact bounded contract, prompts, refresh behavior and native review setup. The fixed seed creates both English formats without replacing custom files. Both screens remain mounted, preserving Reading state during navigation.

English Listening uses its own seeded format and reusable `listening-lesson` block; see [English Listening v1](english-listening.md) for its bounded lesson schema and synthetic native fixture. Lesson reads and navigation never invoke a model. Explicit reload freezes a new validated lesson; native media controls load audio only through user playback.

## TickTick capability (Stage 9c)

`jery_ticktick = "full"` is the default. Chat and one-shot helpers both add
`--allowedTools mcp__claude_ai_TickTick` for full access. `read` adds only
server-scoped `list_*`, `get_*`, `filter_tasks`, `search*`,
`query_calendar_events`, `list_calendars`, and `fetch` allow rules; `off` adds no
TickTick rule. These flags grant capability, not a request to use it. Existing
Claude allow/deny settings remain authoritative; `off` does not revoke an
independent permission already granted in Claude. Vault instructions continue
to govern when JERY may edit tasks. No bypass-permissions flag is added.

Prompts remain on stdin, so variadic `--allowedTools` cannot consume them.
Changing the mode persists it atomically while preserving other TOML keys and
stops the current chat; the next user request restarts it. Settings checks
connection with `claude mcp list` in the vault, bounded to 15 seconds, without a
model request. Only connected/authentication/missing/unavailable status reaches
the UI, not connector output or task contents. Check failures show a hint for
Claude/network/limits. Chat errors remain visible through the existing strip.
Home refresh requests JERY-written state; the app never invents TickTick data.

MCP permission syntax: [Claude Code permission rules](https://code.claude.com/docs/en/permissions#mcp).
Opt-in synthetic-vault probe (never run in CI):

```bash
MELLORIN_LIVE_CLAUDE="$(command -v claude)" cargo test --manifest-path src-tauri/Cargo.toml live_ticktick_read_only_probe -- --ignored
```

The probe lists projects once and asserts only a success marker; it prints no
personal project/task data and performs no service writes.
