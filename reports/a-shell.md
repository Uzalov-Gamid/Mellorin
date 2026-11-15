# Lane A: shared shell handoff

PR: https://github.com/Uzalov-Gamid/Mellorin/pull/40
Branch: feat/release-a-shell → develop.
Implementation head: c6dd4f65013ea0c460335f1b90d60c216c0027c0.
This report is a subsequent documentation commit; use the PR head for final-head CI review. Check rollup was empty when queried on the implementation head; CI is not claimed green.

Implemented: 24px traffic-light reserve (no simulated native controls), 36px draggable top bar markup, screen context actions replacing global Сегодня, Home refresh prompt, Reading new-text request to JERY, Words vocabulary navigation, separate ≡ settings and ◐ theme request, settings keyboard shortcut, + Предмет request to JERY, sidebar geometry/rings, Home without an automatically opened subject, collapsed sidebar and retained chat/inbox/routes. State calculations and vault content writes were not changed. App.tsx contains the small integration wiring.

Local checks: npm run typecheck passed; npm test passed (19 files, 91 tests); git diff --check passed. No Rust changed. No native build or verification performed. No real JERY refresh, personal-vault access, or icon changes performed.

Visual QA: initial attempt failed because dependencies were missing; npm ci resolved it. Captured the unchanged HEAD baseline by temporarily restoring the four implementation files and restoring the working changes in a finally block. Both baseline and final used scripts/visual-qa.mjs --mockups with the provided mockup directory, at 1100/1440/1680, expanded/collapsed. Local artifacts (gitignored): docs/qa/a-shell-before/report.json and docs/qa/a-shell-after/report.json, corresponding side-by-side/diff PNGs. Baseline: 18 comparisons, 126 findings, full-screen difference 5.74–13.09%. Final: 18 comparisons, 36 findings, difference 5.38–12.88%, no page errors. Remaining findings are sentence-number buttons 1/2/3 in Reading, outside shared-shell ownership. No shell control findings remain. Sidebar and Panels additionally rendered as 12 mockup-only cases: no app adapters exist. Full-screen screenshots still differ; pixel-perfect acceptance is NOT met. Home data intentionally differs from illustrative mockup data.

Exact root integration/restart state:
- Native config/capabilities deliberately untouched per worker restriction. Root must enable overlay title bar, hide native title text, position traffic lights above sidebar, and grant core:window:allow-start-dragging. The frontend drag-region markup alone does not verify native dragging.
- ◐ dispatches window CustomEvent("mellorin:theme-request"). Root/settings lane must handle this event; theme currently does not change from this control.
- Words context link uses #english/vocabulary; align with lane B's final vocabulary route/registry. That screen is not registered on this branch yet.
- Root/lane B should reconcile unknown discovered skill labels (e.g. vocab/notes) and final English trail ordering with the shared subjects registry; this worker did not edit the registry.
- Reading sentence-number control padding still produces the 36 audit findings. Per-screen visual restyle is outside this first PR.
- Run final-head CI and native regression before merge. Do not merge this PR solely from browser QA. No second screen work started.

Budget record at stage start (both valid at epoch 1794765992): primary used_percent=14, window_minutes=300, resets_at=1794783118; secondary used_percent=2, window_minutes=10080, resets_at=1795369918. Below start thresholds.
