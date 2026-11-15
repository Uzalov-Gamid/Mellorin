# English Listening v1

`formats/english-listening.json` composes `listening-lesson` (no props). The seven local steps are questions → listen without Script → answer review → Script + listen → read without audio → retell three sentences → words. Script is never rendered before step 4. Audio uses native play/pause, seek, progress and actual time controls, preload none, no autoplay; speed defaults to 1×. The read/retell/words steps remove audio. Text fields support system voice dictation. Sending is always an explicit click, requires JERY readiness, and errors remain visible for retry. Advancing locally does not imply JERY has reviewed an answer or changed practice.

JERY prepares `.mellorin/english-listening.json` only when asked. Read `Learning/English/listening/process.md` and the user-selected Markdown lesson. Do not fabricate lesson content or download audio on navigation. Use the user-supplied audio URL (normally elllo.org); a page URL is not necessarily an audio file. Write UTF-8 JSON atomically via temporary file + rename. Missing sources require an explanation, not generated substitute lesson data.

Exact schema (all fields required):

- Root object: `version: 1`, `id`: nonblank string ≤100 characters, `title`: nonblank string ≤300, `source`: `Learning/English/listening/<filename>.md` (single filename, ≤240 characters, no slashes, backslashes, control characters or traversal).
- `audioUrl`: nonblank absolute http/https URL ≤2048 characters, no credentials. Local http URLs are allowed for synthetic native tests. No bundled audio.
- `questions`: exactly three distinct nonblank strings, each ≤2000 characters, from the actual lesson.
- `script`: nonblank source transcript ≤60000 characters. Whole JSON ≤131072 UTF-16 code units; the native vault reader also limits bytes. Unknown root keys are discarded.

The active lesson is frozen immediately after loading. No polling or replacement on file writes; click “Загрузить готовый урок” to adopt an updated file and reset local steps/inputs. Failed reload retains the last valid lesson and local progress with a diagnostic. Initial missing/invalid data shows an empty state. Format seeding never overwrites custom files. Mounted screens retain their local state.

Past lessons come from up to 100 direct `.md` files in `Learning/English/listening`, excluding `process.md`, through traversal-safe native vault reads. Optional simple frontmatter `title: ...` supplies the label, otherwise the filename does. A literal YAML boolean `practice: true` means ✓ practice; `false` means ○ хвост; missing or unsupported values are explicitly unknown, never fabricated. No YAML execution or arbitrary nested source paths. Read failures are visible; previous successful list is retained on directory failure. Past lesson buttons send only the source path on explicit click, without changing the active lesson.

Exact preparation prompt:

> Подготовь .mellorin/english-listening.json по протоколу English Listening v1 в .mellorin/README.md. Прочитай Learning/English/listening/process.md и выбранный пользователем урок. Используй только предоставленное пользователем аудио http/https, три настоящих вопроса и полный исходный Script. Не выдумывай данные и не меняй practice. Если источников недостаточно, объясни, что нужно.

Answer submission payload: `{lessonId, source, questions: string[3], answers: string[3]}`. Retelling: `{lessonId, source, sentences: string[3]}` (one sentence per field; JERY checks language and sentence boundaries). Words: `{lessonId, source, words: string}`. Display intent is separated from JSON transport by the existing `sendText(transport, display)` integration. No model call, remote fetch, practice write or vocabulary mutation occurs automatically.

Synthetic native fixture (never use a personal vault): serve a generated WAV from a temporary directory using `python3 -m http.server 8765 --bind 127.0.0.1`. Generate e.g. one second of silence with Python's standard `wave` module, mono PCM 16-bit, 8000 Hz; save as `tone.wav`. Create `Learning/English/listening/process.md` with synthetic process instructions, and `synthetic.md` with `---\ntitle: Synthetic lesson\npractice: false\n---\nSynthetic transcript.`. Write this exact lesson JSON to `.mellorin/english-listening.json`:

```json
{"version":1,"id":"synthetic-listening-1","title":"Synthetic lesson","source":"Learning/English/listening/synthetic.md","audioUrl":"http://127.0.0.1:8765/tone.wav","questions":["What is this fixture?","Is the audio silent?","What is the source title?"],"script":"Synthetic transcript."}
```

Root native review: verify no audio request before Play; play/seek/time and speed; Script absent through step 3 and present at step 4; audio removed at step 5; state survives navigation; malformed reload retains last valid lesson; readiness disables sends; test offline URL error. Native build/launch, visual review, PR and merge belong to root. No Claude is needed for these checks.
