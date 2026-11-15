# Lane B: vocabulary compatibility

Backend-only first PR; ready for lead review.

Implemented:
- Prefer the existing canonical `Learning/English/vocabulary/mywords-list.md`; retain the legacy `vocabulary/mywords-list.md` fallback and case-sensitive deduplication/reset-to-learning behavior.
- Read the five-column Russian Markdown table (word/phrase, translation, source, added date, status). Keep date and metadata strings intact. New rows use `DD.MM.YYYY` in UTC, a blank translation, explicit context in the source cell, and `learning`.
- Patch only the status cell's byte range; insert new rows at the table end. Atomic replacement preserves unrelated bytes and permissions without Markdown reserialization. Preserve LF/CRLF, frontmatter, comments, headings, trailing content and final-newline state outside the insertion. Legacy status comments retain their existing contract.
- Add bounded `vocab_list` Tauri command and TypeScript bridge: at most 2 MiB / 10,000 entries, source path per entry, no model calls. Reject malformed/ambiguous tables and external symlinks; preserve internal file links.

Validation:
- `npm run typecheck`: passed.
- `npm test`: 19 files, 90 tests passed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`: passed.
- `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`: passed.
- `cargo test --manifest-path src-tauri/Cargo.toml`: library 41 passed / 1 ignored; integration 36 passed / 2 ignored. Existing live CLI probes remain ignored.
- Synthetic fixtures assert exact bytes for status edits, appends, dedupe, CRLF/LF, frontmatter, comments, source metadata, footer, missing final newline, escaped pipes, permissions via existing integration coverage, and unchanged service-file sentinels. Invalid status/table/input, limits, external links, dangling canonical links and fenced examples are covered.
- Real canonical file: separate temporary read-only harness compiled the production parser; parse succeeded with content output suppressed; before/after byte hash matched (hash not logged). No personal fixture/content was saved. No real refresh/model request was run.
- A regression test caught fenced example metadata being interpreted as a live legacy status comment; parser ordering was fixed and the full suite rerun.

Scope and remaining work:
- No screen changes; visual QA is not applicable to this PR. Vocabulary manager (filters/search/sort/detail/pronunciation/intents) and Notes remain unimplemented in this lane.
- Matching remains exact and case-sensitive against the complete word/phrase cell; linguistic aliases and inflection matching are not inferred.
- Root owns native `.app` verification and integration. Native configuration, icons, shell/subject blocks and existing vault scripts were untouched. No auto-commit or JERY refresh is included; that is a later PR.
- Root may update the architecture documentation's older vocabulary-path description during integration.

Budget record (last payload.rate_limits from newest session at epoch 1794766367):
- primary: used_percent=33.0, window_minutes=300, resets_at=1794783118 (valid).
- secondary: used_percent=5.0, window_minutes=10080, resets_at=1795369918 (valid).
- Initial newest session had no rate-limit record; work continued per instruction.

PR: https://github.com/Uzalov-Gamid/Mellorin/pull/42 (base `develop`, branch `feat/release-b-data`).
Implementation head: `860394498d553d8bf9bc65bacf01cb34c78acbb9`; this report-only follow-up is the final branch commit. Resolve the current PR head before integration; the report cannot embed its own commit hash.
Checks observed on implementation head: Rust checks IN_PROGRESS; Frontend checks QUEUED. Final-head CI is not claimed green; root must inspect the PR checks after this report push.

Restart state: code and report committed/pushed; stop for root review. Next owner actions: confirm final-head CI, perform native regression, integrate if approved. No refresh, native verification, second screen, or merge is authorized for this worker turn.
