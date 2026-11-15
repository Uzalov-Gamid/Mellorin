# Lane A: Reading/Home restyle review handoff

PR: https://github.com/Uzalov-Gamid/Mellorin/pull/44 → develop.
Branch: `feat/release-a-restyle`. Implementation head: `68f1bde`.
The branch tip includes this report-only follow-up; use the PR's latest head for CI/native review.

Stopped after this first small PR. No second screen implementation started.

## Changes

- Reading sentence-marker buttons have real text clearance; labels and controls remain visible and interactive.
- Reading uses the mounted panel height; title action aligns to the heading baseline; pills can wrap.
- Home task checkboxes, pills, button sizes, subject ring thickness/colors, five-column layout at 1100, heading spacing and week height move toward the reference.
- QA uses the reference reading passage and opens sentence phrases and word translation through actual application controls. Home uses a fuller synthetic state to exercise task rows, dates, repeats and tails. No screenshot replacement markup, personal vault, model calls, refresh or app configuration writes.
- Production data/state logic, mounted screen lifetime, translation/phrase/vocabulary controls and chat logic are unchanged. Words/Listening production styling was deferred.

## Local validation

- `npm run typecheck`: passed.
- `npm test`: 19 files, 91 tests passed.
- `node scripts/qa/self-test.mjs`: passed.
- `git diff --check`: passed.
- Rust not changed; local Rust/native checks not run. Native regression and actual window drag movement remain unverified and owned by the lead.
- Latest full capture: `node scripts/visual-qa.mjs --mockups ~/Documents/pulse-wt/design/mockups --screen Main,ReadingCollapsed,Home,Words,Listening --out docs/qa/a-restyle-final`.
- 30 comparisons, 0 DOM audit findings, 0 page errors at 1100/1440/1680 × expanded/collapsed. Mockup renderer, audit and thresholds unchanged.
- Baseline had 36 sentence-marker text-outside findings. Before/after pixel percentages are not directly comparable: the synthetic reading content and open state were aligned in this PR.
- PNGs and raw report are local ignored artifacts in `docs/qa/a-restyle-final/`; initial inventory is in `docs/qa/a-restyle-before/`.

Pixel differences below are measured results, NOT a pixel-perfect pass. Columns are expanded then collapsed for each width.

| Reference | 1100 expanded | 1100 collapsed | 1440 expanded | 1440 collapsed | 1680 expanded | 1680 collapsed |
| --- | --- | --- | --- | --- | --- | --- |
| Home | 7.437% | 7.076% | 5.733% | 5.924% | 5.342% | 5.504% |
| Main | 16.413% | 19.287% | 15.401% | 15.206% | 13.499% | 13.336% |
| ReadingCollapsed | 20.031% | 19.287% | 15.822% | 15.206% | 13.863% | 13.336% |
| Words | 6.224% | 6.395% | 5.545% | 4.938% | 4.816% | 4.296% |
| Listening | 5.304% | 4.900% | 4.490% | 4.164% | 4.124% | 3.885% |

## Exact remaining work for lead review

1. Reading phrase breakdown remains a separate card below the text paper; word popup remains in normal flow rather than overlaying the reference position. Resolve composition in a separate focused change while retaining independent format blocks and controls.
2. Reading title/metadata/progress remain unknown for pasted text; do not fabricate reference title, B1, 250-word count or step progress in production. The reference chat/saved vocabulary state is not reproduced by the synthetic runner.
3. Home content is synthetic and intentionally generic; titles, dates, subject stages, week distribution, footer source text and refresh control differ from the reference. The reference weekday is inconsistent with its calendar date; production keeps the actual weekday. Home/Reading shell also includes the existing history control absent from the mockups.
4. Words and Listening have zero findings in this capture, but retain pixel differences and still need their own restyle review.
5. Review 1100-width text wrapping visually; zero audit findings alone is not visual acceptance. No claim of full one-to-one fidelity.
6. CI was pending for both Frontend checks and Rust checks when preparing this report. Lead must check final report-commit head CI and perform native regression before merging. Do not merge based on an earlier SHA.

## Workspace and restart state

A pre-existing modification remains at `src-tauri/gen/schemas/capabilities.json`; it was not edited, staged or committed by this lane. Native configuration and icons untouched. No personal files read or changed. `origin/develop` was fetched and had no newer commits than this branch's base, so no merge was needed.

Resume only after lead review on this branch. Source changes are committed/pushed; this report is the final follow-up commit. Do not run a real JERY refresh. Root owns integration, native checks and merge.

## Shared budget

At initial inspection the newest rollout had no rate_limits record, so work continued under the supplied rule. Latest LAST payload.rate_limits at epoch 1794766606: primary used_percent=48.0, window_minutes=300, resets_at=1794783118; secondary used_percent=7.0, window_minutes=10080, resets_at=1795369918. Both reset timestamps were valid; stage thresholds permitted continuation.
