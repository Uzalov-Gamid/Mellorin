# Lane B — M1 Notes handoff

PR: https://github.com/Uzalov-Gamid/Mellorin/pull/46
Branch: `feat/release-b-notes` → `develop`.
Tested implementation head: `536bc6115df5d67727ba365994dbc2756c3ba38d`.
The final branch head adds only this handoff report; obtain its exact SHA from the PR head or `git rev-parse HEAD`. No implementation changes follow the tested head.

## Delivered

Read-only Notes routes for English, DevOps, Arabic and C. Catalog/source lists are actual vault files; a scope control also exposes other study Markdown, including root documents. Existing study panels remain mounted. Notes activates its catalog on first navigation; initial requests share a bounded snapshot. Explicit reread refreshes files without invoking JERY.

React Markdown + remark GFM + a text-node Obsidian adapter render properties, headings, tables, ordinary quotes, callouts, fenced/inline code, wikilinks/aliases/heading fragments, tags, disabled task checkboxes and Unicode superscript markers. Raw HTML is omitted. Outline IDs are stable, including duplicate headings. Backlinks derive from parsed wikilinks and ordinary/reference Markdown links, excluding code and images. Ambiguous, missing or forbidden internal links show errors; they never silently select an arbitrary match.

Catalog limits: 10,000 visited entries, depth 32, 1,000 Markdown files, 2 MiB per note, 16 MiB total. Service paths are excluded before recursion/selection: CLAUDE.md, dot directories/files (including .claude/.obsidian/.git/.mellorin), JERY, Templates, formats and _archive. All symlinks are skipped/rejected, including aliases into service directories and external targets. Process/plan/README/errors/progress/session notes remain readable. Read failures return generic diagnostics without private filesystem paths or content.

Attachments use separate read-only commands: 8 MiB maximum, extension plus signature MIME checks for PNG/JPEG/GIF/WebP/PDF/WAV/OGG/MP3. Active SVG/HTML and mismatched files are rejected. Browser resources come only from checked bytes, with object URL cleanup; PDF is an explicit download and audio uses controls/preload none. At most 16 inline media references render per note, with a visible limit message. External image URLs never fetch. External HTTP(S) text links require a user click. Notes has no content mutation controls, arbitrary code execution or automatic link opening.

New dependencies and their transitive packages are inventoried in THIRD-PARTY-NOTICES from locked installed package metadata; existing package versions were not changed. Vocabulary PR42 implementation/tests remain intact. Merged origin/develop through Settings PR41 (`9567b3d`) without rebasing. No worker edits to native config, icons, shell CSS/tokens, Settings, other subject blocks or existing vault scripts. No models, real refresh, original-vault writes or native app verification.

## Checks actually run

- `npm run typecheck`: passed.
- `npm test`: 20 files, 98 tests passed.
- `npm run build`: passed; Vite reports the existing chunk-size warning threshold is exceeded (502.04 kB main JS).
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`: passed.
- `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`: passed.
- `cargo test --manifest-path src-tauri/Cargo.toml`: passed; live model/service probes and the explicit copy validator remain opt-in/ignored in the normal suite.
- Synthetic cases cover YAML alias rejection, duplicate keys, GFM/task lists, titled/default callouts, raw HTML omission, code literals, duplicate headings, wiki aliases/fragments, local/root/basename lookup, ambiguous/missing/traversal/URL rejection, reference backlinks, media count limits, service exclusions, external/service symlinks, UTF-8/text size and attachment MIME/size.
- Explicit read-only Rust `copy_catalog_read_only -- --ignored` with the copy environment variable: passed.
- `MELLORIN_NOTES_READ_ONLY_COPY=... node_modules/.bin/vite-node scripts/qa/notes-readonly-check.tsx`: passed on the real copy. All eligible Markdown was parsed and server-rendered; only a pass marker was output, with no personal text, properties or filenames. No copied personal fixtures/artifacts were retained.
- Browser interactions passed: resolved wikilink navigation, source selection, retained Notes selection, unchanged Reading text across Notes navigation.
- `git diff --check`: passed before final implementation commit.
- `gh pr checks feat/release-b-notes`: **no checks reported** at handoff inspection. This is not a claim of final-head CI green.

## Visual QA — differences remain, not a fidelity pass

Command: `node scripts/visual-qa.mjs --mockups <design mockups> --screen Note --out docs/qa/notes` (actual external mockup directory supplied).

Synthetic Note adapter uses the real Note.dc.html reference; screenshots/report are ignored local QA artifacts under `docs/qa/notes/`. Six comparisons, zero DOM overflow/control findings and zero page errors. Initial control-edge findings were fixed and the audit rerun.

| Width | Sidebar | Different pixels, percent |
| --- | --- | --- |
| 1100 | expanded | 9.823030303030302 |
| 1100 | collapsed | 9.293434343434344 |
| 1440 | expanded | 10.274151234567901 |
| 1440 | collapsed | 9.138348765432099 |
| 1680 | expanded | 8.869907407407407 |
| 1680 | collapsed | 7.896362433862434 |

Exact remaining work for lead review/integration:

1. Shared shell still contributes main padding, global format-history placement, date/topbar text, sidebar data/trail differences and JERY strip copy. Notes paper is nested in the current shell instead of the mockup's full-bleed article/aside. Integrate the shell geometry without breaking other mounted panels; rerun all six comparisons.
2. Own-screen differences: actual source search/scope/reread controls extend the reference aside; backlinks are labeled explicitly instead of generic «Связанное»; the outline includes the actual H1 and headings rather than the mockup's manually curated callout entry; wiki display uses aliases/targets without decorative literal brackets. These differences remain open visual issues, not a parity claim.
3. The mockup's exercise reveal widget has no dedicated note-data contract in this reader; ordinary note text/callouts are rendered safely. No question/answer content or completion status is invented. Explicit «Открыть в Obsidian» native opener is not wired; file path and read-only status are shown instead. Lead decides/wires the safe native handoff.
4. Unsupported attachment MIME types show errors; symlinks are deliberately stricter than inside-vault resolution (all rejected). Executable HTML/plugins and embedded note/block transclusions are not implemented. A text/wiki link to another Markdown note opens it normally.
5. Lead must perform final-head CI and real .app regression on a synthetic vault, including checked-byte attachments/downloads and existing chat/translation/vocabulary. Worker did not claim native verification. Root retains the single real-copy refresh.

## Limits and restart state

Initial newest rollout had no rate_limits record; continued per instruction. Last observed valid record at epoch `1794767668`:
- primary: used_percent `87.0`, window_minutes `300`, resets_at `1794783118`.
- secondary: used_percent `14.0`, window_minutes `10080`, resets_at `1795369918`.

Both resets were in the future. The stage started without a valid record; final PR/handoff only after the last observation. No new stage started above the stage threshold; primary did not exceed 95%.

Stop after pushing this report. Resume only on lead instruction, on this branch, with status/limits inspection. Do not merge the PR, rebase published history, alter native config, run a refresh or start autocommit/manager/another screen. Native verification and outstanding visual integration belong to the lead review.
