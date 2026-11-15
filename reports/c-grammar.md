# Lane C — M1 English Grammar handoff

PR: https://github.com/Uzalov-Gamid/Mellorin/pull/47 → develop.
Branch: `feat/release-c-grammar`.
Implementation/tested head: `0e9ea56f79a2942be27876946c73e65bfc303e4c`.
This report-only commit is the sole successor; obtain the exact final PR head from `gh pr view 47 --json headRefOid`. No implementation changes follow the tested head.

Implemented: reusable `grammar-study`, own bounded data validator and semantic styles, bundled format, own screen/block/seed registrations, app-only README contract migration, documentation and synthetic tests/QA adapter. JERY supplies the five stage labels/current stage, title/source, exactly four theory parts, practice/options/optional sourced key, homework pages/statuses and note reference. One theory part is visible; prev/next is bounded. No key means no local grading. Explicit answer and homework-check controls send intents; status never changes locally. Notes open through bounded in-vault read-only previews. Malformed reload keeps last-valid lesson/part/selection; successful reload clears stale selection, preserves the same lesson's viewed part and can explicitly adopt a new lesson. Mounted navigation retains state. No automatic model messages or study-content writes.

No edits to shell/app.css, Settings, Writing, vocabulary, native configuration or icons. No personal vault reads/writes, real refresh, live model call, app launch or native verification. Shared files contain only Grammar registrations/seed additions and its synthetic adapter. PR45 still owns shared history/top-action changes.

Local checks on the implementation:

- `npm run typecheck`: passed.
- `npm test`: 109 tests / 23 files passed, including 8 Grammar tests.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`: passed.
- `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`: passed.
- `cargo test --manifest-path src-tauri/Cargo.toml`: 46 unit and 36 integration tests passed; 3 opt-in live tests ignored. No native-app claim.
- `git diff --check`: passed before implementation commit.
- `node scripts/visual-qa.mjs --screen Grammar --mockups ~/Documents/pulse-wt/design/mockups --out docs/qa/grammar`: six synthetic comparisons, zero DOM-overflow findings, zero page errors. Browser flows passed at each size/mode: theory boundaries/navigation retention; malformed reload retains selected answer and part; valid reload clears stale answer; bounded note opens/closes; only explicit answer/homework clicks send captured intents; waiting status stays waiting.

Pixel fidelity is NOT passing. Actual different-pixel percentages:

| Width | Sidebar | Difference |
| --- | --- | --- |
| 1100 | expanded | 6.5430% |
| 1100 | collapsed | 5.7264% |
| 1440 | expanded | 5.2717% |
| 1440 | collapsed | 4.5331% |
| 1680 | expanded | 4.6529% |
| 1680 | collapsed | 4.1248% |

Artifacts remain locally in ignored `docs/qa/grammar/`: report JSON, app/mockup/diff/side-by-side PNGs. Observed differences: existing shared history control shifts content down and pushes the theory-card bottom below the viewport; PR45 removes that control separately. Shared date/sidebar/strip fixture states differ from the mockup. Grammar's explicit answer submission adds height to the practice card; provenance/reload/preparation controls are an additional disclosure. Waiting notes intentionally do not open an unavailable file; ready notes open a bounded in-app preview, not the mockup's Obsidian label. Button sizing/wrapping and remaining card spacing differ. These are recorded findings, not a pixel-perfect approval.

Exact next work for the lead orchestrator:

1. Review PR47; integrate PR45 separately. Merge/reconcile only Grammar registry additions with other lanes. Do not replace shared registries wholesale.
2. Require final-head CI green. At handoff query on tested head, `statusCheckRollup` was empty; no final-head CI pass is claimed.
3. Rerun the same six Grammar QA comparisons after integration; fix remaining visual differences before release acceptance, including final card height and explicit-control placement.
4. Perform native regression with a synthetic vault, including Grammar preparation, file reload, theory navigation, intent errors/retry, sourced/unsourced answers, homework status and note read failure. Root owns the real app/config and any allowed real refresh.
5. Existing `process.md` remains authoritative. Runtime JERY must read its actual content before preparing data; synthetic tests do not prove real-process/PDF verification.

Budget snapshots from the LAST rate_limits payload in newest rollout by mtime (valid reset epochs):

- At start: no rate_limits record; continued as instructed.
- During current stage: primary used_percent 87, window_minutes 300, resets_at 1794783118; secondary 14, window_minutes 10080, resets_at 1795369918; observed epoch 1794767676.
- Later: primary 89/300/1794783118; secondary 14/10080/1795369918; observed epoch 1794767782.
- Final handoff snapshot: primary used_percent 95, window_minutes 300, resets_at 1794783118; secondary used_percent 15, window_minutes 10080, resets_at 1795369918; observed epoch 1794767883. Both valid. No new stage or screen started. Worker stops after pushing this report for root review.
