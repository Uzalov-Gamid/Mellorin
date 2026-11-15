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

Both processes run with the configured vault as their working directory. Claude Code loads vault rules through its normal instruction discovery; Mellorin does not pass an explicit system-prompt argument or inject the whole vault. CLI permissions and settings govern its file access and service behavior.

## Configuration and local writes

`Config::load` resolves Tauri's `app_config_dir()` and reads `mellorin.toml`. For identifier `dev.mellorin.app`, the macOS location is `~/Library/Application Support/dev.mellorin.app/mellorin.toml`. Configuration uses flat keys:

```toml
vault_path = "~/MellorinVault"
claude_path = "claude"
theme = "dark"
```

These are the defaults used when creating a missing config; existing configuration is preserved. A leading `~/` in `vault_path` expands to the home directory. The vault directory must exist before launching the CLI. The frontend displays the configured path; there is no settings editor or theme switcher.

`vocab_add` serializes writes within the app, validates single-line input, creates the vocabulary directory as needed, and appends `- **word** — sentence` to `vocabulary/mywords-list.md`. Duplicate detection matches the exact word, including case. This is the backend's implemented vault write operation; there is no general vault reader, indexer, or notes/progress manager.

## Current limits

Chat history and pasted reading text live in frontend memory. There is no persisted conversation browser, vocabulary review deck, or additional study module. Local Markdown storage does not make AI features offline: prompts and translation context reach the CLI service, and CLI tools may access vault files. The synthetic browser demos validate UI presentation with a mocked bridge, not native execution, live service compatibility, or real filesystem persistence.

## Machine-readable learning state

The app polls `.mellorin/state.json` and `.mellorin/today.json` every five seconds. Version 1 schemas are in `docs/state.schema.json` and `docs/today.schema.json`; Rust validates identifiers, arrays, dates, percentages, task flags and counters before returning a snapshot. Missing files produce empty states; invalid files produce visible diagnostics. Totals and progress are never taken from mockups.

`learning_init` creates `.mellorin/README.md` when absent, or appends the versioned protocol to existing instructions without replacing them. It includes both schemas and the exact refresh prompt from `src/prompts.ts`. Today/Refresh sends that prompt only after a user action. CLI access to TickTick depends on the user's CLI configuration.

`vault_read_text` and `vault_list` accept relative paths, reject traversal and canonical paths leaving the configured vault, and enforce file/directory limits (2 MiB text, 10,000 entries). External symlinks are rejected. These reads do not parse arbitrary prose into progress figures. The standard canonical-path checks assume the local vault is not being adversarially rewritten during a read.
