# Mellorin format v1

JERY may maintain UTF-8 `formats/<subject>-<skill>.json`. Files are data: no HTML, JavaScript, expressions, executable queries, or file-write paths. The renderer never evaluates content. Steps and blocks render in array order. IDs/types use lowercase ASCII letters, digits and hyphens (start with a letter; max 64). Step IDs are unique.

```json
{"version":1,"steps":[{"id":"practice","title":"Practice","blocks":[{"type":"quiz","props":{"question":"Choose","choices":["one","two"],"answer":"one"},"writeBack":{"intent":"Review my answer"}}]}]}
```

Required: version 1, nonempty steps, each step's id/title/blocks, each block's type/props. Optional `writeBack` accepts ONLY `{ "intent": "human-readable request" }` (1–500 characters). It adds an explicit Send to JERY button with current answer/code/checklist values; it grants no filesystem capability. No automatic answer submission. JERY's existing CLI permissions govern any subsequent action.

Limits: 256 KiB source, 10,000 JSON values, depth 8, 100 entries per object/array, 20,000 characters per string. Invalid structures show diagnostics and keep the last usable format. Unknown simple block types remain valid, show `нужен блок …`, and request a deduplicated `app-requests/YYYY-MM-DD-<type>.md` note. No request inbox in v1.

Props (all optional; wrong prop value types fall back safely):

| type | props |
| --- | --- |
| text | text; sentenceNumbers: "after"; source: "reading" uses shared pasted text |
| phrase-breakdown | phrases: string[]; source: "reading" uses selected sentence/explanation |
| word-card | word, translation; source: "reading" uses selected word, translation, speech and vocabulary controls |
| quiz | question, choices: string[], answer: string |
| flashcard | front, back |
| table | headers: string[], rows: string[][] |
| audio-player | url (absolute http/https only), label |
| code / query | label, value (editable plain text, never executed) |
| checklist | label, items: string[] |
| timer | seconds (0–86400; default 60) |
| progress | label, total (1–100; default 9), current (zero-based; omit for neutral segments), mode: "bar" for a native progress bar |
| collapsible-answers | title, answer |
| night-code-card | code (escaped text) |
| step-pills | steps: string[], current (zero-based) |

The context supplies current JERY message, optional data, explicit intent callback, and shared reading state. Text without a text prop displays the current JERY message. No stream protocol parsing or format apply/rollback is implemented here. Reading's 9 tracker segments remain neutral: format layout steps do not claim an actual lesson step.

`format_seed` has no arguments: it creates only the bundled `formats/english-reading.json` if missing, and appends this contract once to `.mellorin/README.md`, preserving existing instructions. `format_request_block` accepts validated simple block/format names and a calendar date; it never overwrites a note. Both commands canonicalize parent directories inside the configured vault. Local vault writers must not adversarially swap directories during operations (same assumption as the read layer).

`word-study` (no props) renders the English Words six-step session from validated `.mellorin/english-words.json`; see [English Words v1](english-words.md). No personal lesson data is shipped.

`listening-lesson` (no props) renders English Listening's seven local steps from `.mellorin/english-listening.json`; see [English Listening v1](english-listening.md). Transcript and user-supplied audio are not shipped with the format.
