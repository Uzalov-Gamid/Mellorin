# English Words v1

Lesson data is separate from bounded format v1 layout proposals. `formats/english-words.json` uses the reusable `word-study` block (no props). It renders six steps: cards, translation choice, sentence gap, reverse translation, dictation, result. The app never prepares a lesson or writes vocabulary statuses automatically.

JERY prepares `.mellorin/english-words.json` only on explicit user request. Read `Learning/English/vocabulary/process.md` and `Learning/English/vocabulary/mywords-list.md`. Also read the legacy `vocabulary/mywords-list.md` used by Reading; do not move or duplicate entries. Select exactly ten distinct real words: focus first, then learning added yesterday and 3–4 days ago, then oldest learning. JERY computes dates and priorities from the sources. If fewer than ten eligible words or insufficient quiz data are available, explain what is missing instead of fabricating a lesson. Preserve each word's actual source path. Apply the source process rules. Do not use mockup numbers, words or answers.

Exact UTF-8 JSON contract (128 KiB maximum):

- Root: `{version: 1, id: string, preparedOn: "YYYY-MM-DD", words: StudyWord[10]}`. `id` is nonempty, at most 100 characters; change it for a new lesson.
- `StudyWord`: `{word, translation, source, status, added?, ipa?, example?, exampleSource?, translationChoice, sentenceGap, reverseTranslation, dictation}`.
- `word`: nonempty, at most 100 characters, case-insensitively unique. `translation`: nonempty, at most 2000 characters.
- `source`: exactly `Learning/English/vocabulary/mywords-list.md` or `vocabulary/mywords-list.md`. `status`: `focus` or `learning`. Optional `added`: real calendar date `YYYY-MM-DD` from the source. Optional `ipa`, `example`, `exampleSource`: nonempty strings at most 2000 characters; include only real available IPA and lesson examples with provenance, otherwise omit.
- Each choice object: `{choices: [string, string, string, string], answer: integer}`. Four distinct nonempty strings at most 2000 characters; `answer` is a zero-based index 0–3. `translationChoice` asks for the word's translation; `reverseTranslation` asks for the English word given its translation. `sentenceGap` additionally has `sentence`, a nonempty string at most 2000 characters containing the literal `___`. JERY supplies and checks the actual answers and distractors; the UI does not infer them.
- `dictation`: 1–10 accepted nonempty English spellings, each at most 100 characters. Comparison normalizes NFKC, case, surrounding and repeated whitespace only.

Write atomically (temporary file then rename). The app reads via the bounded vault read layer every five seconds with at most one pending request. It validates before replacing the last valid lesson and displays errors. Once study begins it freezes the loaded lesson so updates cannot change answers halfway through. Navigate away/back to retain the same session; use «Загрузить новый урок» on the result screen to load a newly prepared lesson after studying. No lesson data is bundled or seeded.

The preparation button sends this exact intent (with null answer data):

> Подготовь .mellorin/english-words.json по протоколу English Words v1 в .mellorin/README.md. Прочитай Learning/English/vocabulary/process.md и Learning/English/vocabulary/mywords-list.md; также поддержи существующий vocabulary/mywords-list.md без переноса данных. Выбери 10 реальных слов: сначала focus, затем добавленные вчера и 3–4 дня назад, затем самые старые learning. Сам вычисли даты и приоритеты. Не выдумывай слова, IPA, примеры или прогресс; если данных недостаточно, объясни, что нужно. Статусы пока не меняй.

The result button sends `{lessonId, preparedOn, outcomes}`; each of the 40 outcomes contains `{word, source, step, answer, correct}` (steps 1–4). Cards are review, not scored answers. Exact result intent:

> Проверь результат English Words v1 и обнови статусы только в исходных Markdown-файлах каждого слова согласно process.md. Не переноси слова и не меняй формат. Сообщи, что записано.

Only JERY owns status decisions/writes after this user submission. UI submission is not a persistence confirmation; read JERY's reply. No local status command is called. The result button prevents duplicate submission; a visible chat error permits an explicit retry. Buttons wait while JERY is busy or not ready. Chat connection/error behavior remains the existing JERY lifecycle.

Keyboard: Cyrillic а/б/в/г chooses answers, Enter advances only after review/answer. Composing/repeated/modified events and editable fields are ignored; hidden screen panels do not handle keys. Dictation uses an explicit form check, then Next. Speech is user-triggered with English language/voice and visible unavailable/error handling. YouGlish is an explicit external link, never preloaded; dictation hides the word/link until answer feedback. If audio is unavailable, an explicit skip records an empty answer and `correct: false`; JERY can distinguish this from a spelling attempt.

Native review setup (root integration): create a temporary synthetic vault, configure the app to it, add both vocabulary paths plus process.md and a conforming ten-word lesson (synthetic data stays local). Confirm no automatic chat calls on navigation; review all ten cards and four ten-question rounds, wrong/correct colors, keyboard/editable/composition guards, English audio or unavailable message, explicit YouGlish, 40-answer result submission and JERY-only source writes. Replace JSON with malformed data before study and confirm last valid data/diagnostic; remove it and restart for the preparation empty state. Verify custom formats are not overwritten, Reading text survives Words navigation, and chat/settings/inbox still work. Native build, app launch and live CLI checks are deferred to root; no Claude call is needed for unit tests.
