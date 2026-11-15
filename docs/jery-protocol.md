# Mellorin reply protocol v1

JERY can include a single data block or an array of blocks in a fenced `mellorin` section. Prefer opening and closing fences on their own lines. JSON on the opening line and a single-line fenced section are also accepted. Use three or more backticks (or tildes), with a closing fence at least as long as the opening fence. Ordinary text before and after remains in chat; protocol JSON is hidden, including while streaming. Other code fences remain ordinary chat text.

Example:

```mellorin
{"type":"quiz","props":{"question":"Choose the translation of bank (river)","choices":["берег","банк"],"answer":"берег"}}
```

Blocks follow the same data-only contract as [formats.md](formats.md): `type`, object `props`, optional `writeBack: {"intent":"..."}`. No executable code, HTML, file paths or automatic writes. Limits: 256 KiB per section, 100 blocks per reply, bounded props and nesting. Invalid or unfinished sections produce a visible diagnostic without exposing raw JSON. Complete sections render immediately in the content area. Controls are disabled until the current response finishes. Interactive state survives subsequent text deltas when block data stays the same. New assistant replies replace the previous reply's material; this material is not persisted as a format file.

An answer button sends its intent and answer data to the existing chat only after the user's click. Normal CLI permissions still apply. This protocol does not change formats or process.md; proposed changes and apply/rollback belong to a separate protocol.

## Stage 9: proposed format changes

A fenced `mellorin-change` section contains exactly one object (maximum ten per reply). It never writes files automatically, including on stream completion. The parser exposes `Reply.changes`, keeping raw JSON hidden at every streaming boundary. Example shape:

```json
{"target":"formats/english-reading.json","before":"<exact current format JSON text>","after":"<complete new format JSON text>","process":"Learning/English/Reading/process.md","process_before":"<exact current process text>","rule":"Number every sentence in reading."}
```

`before` and `process_before` are exact UTF-8 strings, including final newlines; use `null` for an absent file. `after` must validate as format schema v1, never code. Read both files before proposing. Paths must match the same subject and skill, using simple ASCII names; nested or arbitrary paths are rejected. Individual files are bounded to 256 KiB, a proposal fence to 1 MiB. The rule is plain text, at most 20,000 characters, and cannot contain reserved Mellorin markers.

`change_preview` validates the proposal against disk and returns the exact process result. Only the managed `<!-- mellorin:format-rule -->` … `<!-- mellorin:end -->` section is replaced; missing sections are appended, ambiguous markers rejected. `ChangePreview` shows both format versions and lossless full-file unified diffs for both files. `Применить` calls `change_apply`; `Изменить` calls the supplied chat callback. Disable controls while streaming. No preview action writes files.

Apply and rollback serialize through one Rust mutex and check both expected files. Each replacement uses a synced temporary file and rename. Because two files cannot be renamed atomically together, a synced write-ahead record in `formats/.history/pending.json` records the complete operation before either change. Raw previous format snapshots are also saved as `formats/.history/<name>.<timestamp>-<pid>.json`. Immutable transaction history records `formats/.history/<name>-<timestamp>-<pid>.json` retain exact before/after versions of both files, including absence. Successful completion removes the pending journal. A failure retains it and blocks new transactions. `change_recover` explicitly finishes a pending operation only when each file still equals its recorded before or after state; concurrent edits produce a conflict without overwriting them. This also applies to interrupted rollback. Recovery is idempotent.

`change_history` lists persisted records; `change_rollback(id)` requires both current files to equal that record's after versions and creates a new inverse history record. Thus repeated rollback remains auditable and can itself be undone. Symlinks on any target/history path are rejected, parents must already exist inside the vault. These commands do not execute code or start JERY. External editors should not race filesystem path replacement during a transaction; stale checks detect prior edits but do not provide an OS-level lock against external processes.
