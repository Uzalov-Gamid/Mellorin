# Mellorin reply protocol v1

JERY can include a single data block or an array of blocks in a fenced `mellorin` section. The opening and closing fences must be on their own lines. Use three or more backticks (or tildes), with a closing fence at least as long as the opening fence. Ordinary text before and after remains in chat; protocol JSON is hidden, including while streaming. Other code fences remain ordinary chat text.

Example:

```mellorin
{"type":"quiz","props":{"question":"Choose the translation of bank (river)","choices":["берег","банк"],"answer":"берег"}}
```

Blocks follow the same data-only contract as [formats.md](formats.md): `type`, object `props`, optional `writeBack: {"intent":"..."}`. No executable code, HTML, file paths or automatic writes. Limits: 256 KiB per section, 100 blocks per reply, bounded props and nesting. Invalid or unfinished sections produce a visible diagnostic without exposing raw JSON. Complete sections render immediately in the content area. Controls are disabled until the current response finishes. Interactive state survives subsequent text deltas when block data stays the same. New assistant replies replace the previous reply's material; this material is not persisted as a format file.

An answer button sends its intent and answer data to the existing chat only after the user's click. Normal CLI permissions still apply. This protocol does not change formats or process.md; proposed changes and apply/rollback belong to a separate protocol.
