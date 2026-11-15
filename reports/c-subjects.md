# Lane C — English Writing handoff

PR: https://github.com/Uzalov-Gamid/Mellorin/pull/43
Branch: `feat/release-c-subjects`, base `develop`.
Implementation/tested head: `3d01354d3758d04385194ef3ca255b7d8bf81183`.
The PR head includes this report-only follow-up; obtain its exact SHA with `gh pr view 43 --json headRefOid`. No second screen started. Worker stopped for root review; no merge performed.

Implemented:

- `writing-study` smart block and `formats/english-writing.json`, minimal screen/block/fallback/seed registrations.
- Bounded data parsing with source references for target/plan/Watch out; actual Unicode word count; typed draft, explicit review and whole-text rewrite.
- Review requires matching lesson id and EXACT local draft; numbered peach/rust spans must match `before` at validated UTF-16 offsets. No overlapping/out-of-range spans, invalid main-error references or arbitrary HTML rendering. Every marked span has before/after/why. Main errors are one/two referenced explanations, or none for a clean review.
- No automatic JERY messages. Preparation/review/result intents require explicit ready clicks. Result includes actual original and corrected text. No app writes to lesson/session/errors/progress content.
- Explicit reload retains local draft and rewrite. Invalid reload retains last valid data and review. Mounted navigation preserves state. A changed assignment id/source is rejected while the current assignment is retained; finishing and restarting currently adopts another assignment.
- Seeding preserves custom formats and appends the contract independently of older README markers, only to app-owned `.mellorin/README.md`. A synthetic Rust test verifies existing process bytes remain unchanged. JERY is instructed to read the actual writing/process.md, not replace it. Contract and synthetic fixture: `docs/english-writing.md`.

Observed implementation-head CI: Frontend checks passed; Rust checks were pending at handoff preparation. The report commit triggers a new run; final-head CI is not claimed.

Local checks on implementation head:

- `npm run typecheck`: pass.
- `npm test`: 21 files / 100 tests pass (10 new Writing tests).
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`: pass.
- `cargo test --manifest-path src-tauri/Cargo.toml`: pass; existing opt-in live probes remain ignored.
- `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`: pass.
- `git diff --check`: pass before implementation commit.
- No native .app launch/regression, no personal vault access, no real JERY refresh, no native config/icon changes.

Visual QA command:

`node scripts/visual-qa.mjs --mockups ~/Documents/pulse-wt/design/mockups --screen Writing --out docs/qa/writing`

Actual findings, not a passing pixel-perfect claim:

| Width | Sidebar | Different pixels % | DOM findings |
| --- | --- | ---: | ---: |
| 1100 | expanded | 9.116162 | 5 |
| 1100 | collapsed | 8.323434 | 5 |
| 1440 | expanded | 7.614352 | 5 |
| 1440 | collapsed | 6.658179 | 5 |
| 1680 | expanded | 6.877050 | 5 |
| 1680 | collapsed | 5.922884 | 5 |

All six synthetic comparisons have zero page errors and no Writing DOM overflow finding. Each has five shell findings: two text-border findings on requests badge, one on theme control, one on strip submit and one on strip expand. Shell styles are outside this lane and were not changed. Local screenshots/diffs/report are under ignored `docs/qa/writing/`.

Screen differences remain: shell top bar/history action shifts the body; sidebar/date/strip data differ from the template; actual fixture count is 30 versus the template's fictional 182; the four marked spans each have a review card (template omits card 3); edit/source/reload controls are visible additions and increase occupied space. Main-error text uses the supplied explanations instead of asserting an errors.md write. These are documented deviations, not pixel acceptance. Root must reconcile visual requirements and shell integration.

The same six browser runs also verified rewrite draft survives actual Words navigation/back, and reloading the old review retains the corrected text with no stale marks. Unit tests cover exact whitespace/case/newline binding, malformed reload, foreign assignment rejection, parsing limits, readiness, intents and missing-data preparation.

Remaining work for root:

1. Require final report-commit head CI green; worker does not claim final-head CI/native acceptance.
2. Resolve shared registry/seed additions alongside other lanes; no newer origin/develop commits existed at worker fetch.
3. Integrate shell fixes, rerun visual QA and review documented screen deviations. Persist findings in root-owned design progress if needed.
4. Native synthetic regression using the documented fixture: draft/count/highlights/cards, rewrite/result readiness, malformed reload and navigation retention. Build/launch and native regression belong to root.
5. During root's single allowed real-copy refresh, verify JERY reads the real writing process and supplies sourced target/plan/watch-out/review data. Real process compatibility is a protocol implementation, not a claimed live verification.
6. Assignment switching currently needs restart after completion; no dedicated new-assignment reset in this first PR. Review reload during rewrite is retained, and “Вернуться к проверке текста” explicitly exposes a new exact review when available.

Budget audit: newest rollout by mtime, LAST payload.rate_limits. Start audit had no record, so continued. Latest observed valid record at epoch `1794766366`: primary used_percent `33.0`, window_minutes `300`, resets_at `1794783118`; secondary used_percent `5.0`, window_minutes `10080`, resets_at `1795369918`. Both reset times were future; below stage thresholds. No Claude/JERY invocation was used for validation.
