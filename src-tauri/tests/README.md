# Headless subprocess regression checks

Run the network-free suite with:

```sh
cargo test --manifest-path src-tauri/Cargo.toml --test subprocess_flow
```

The integration target imports the actual production Rust modules with `#[path]`
so no public application API or test-only production branches are required.
Imported module unit tests also run. Unix process tests require `python3` on PATH;
these executable fixtures assert arguments, stdin framing, and the synthetic vault
cwd. They never invoke Claude. Every test creates a fresh temporary demo vault.

The installed-Claude product subprocess check is explicitly ignored in normal CI.
Run it from a configured, authenticated machine with an absolute binary path:

```sh
MELLORIN_LIVE_CLAUDE="$(command -v claude)" \
  cargo test --manifest-path src-tauri/Cargo.toml \
  --test subprocess_flow live_claude -- --ignored --nocapture
```

It uses the production manager/parser and translation helper, requires two
sequential successful turns, verifies synthetic CLAUDE.md instructions and remembered
context, counts incremental deltas, checks the prefix/token are not duplicated,
stops the manager, translates a contextual word to Russian, and writes vocabulary.
Chat waits and translation are each bounded to 60 seconds; manager stop is
bounded to five seconds. Translation cancellation
uses the production child's kill-on-drop behavior. This is a real network-backed
product test, not a coding-assistant invocation. Responses may vary; the semantic
assertions intentionally fail if the required vault instructions or translation
are not observed.

For diagnosis, optionally set `MELLORIN_LIVE_LOG` to a file **outside the repository**
in a restricted temporary directory (for example one created with `mktemp -d`).
It records manager events, not the complete raw Claude protocol. Keep raw payloads
out of commits and reports. No personal vault or default app config is loaded by
this integration test. Headless coverage ends at the production Rust callbacks;
it does not exercise Tauri event delivery or the rendered WebView.
