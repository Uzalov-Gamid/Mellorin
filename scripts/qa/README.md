# Visual QA

Uses installed Playwright Chromium and synthetic fixture data only. Does not
read a real vault or app configuration, call Claude, or modify study files.

```bash
npm ci
npx playwright install chromium
node scripts/qa/self-test.mjs
node scripts/visual-qa.mjs --mockups /path/to/design/mockups
```

The design sources currently live outside this repository. Supply their folder
with `--mockups` or `MELLORIN_MOCKUPS`. The runner starts its own Vite server;
use `--url http://127.0.0.1:1420` to use an already running one.

Defaults: 1100, 1440 and 1680 by 900, expanded and collapsed sidebar. Every
mockup is rendered, including trusted `DCLogic`, imports, loops and conditions;
wrapper tags are replaced with ordinary markup. Implemented screen adapters
produce app, mockup, difference and side-by-side PNGs in ignored `docs/qa/`,
plus `report.json` with different-pixel percentage, DOM findings and page errors.
Unimplemented screens are explicitly reported as mockup-only, never passed.
Extend the route/setup adapters when adding a screen. The browser bridge is a
synthetic fixture, not evidence that native commands or services work.

For a targeted run:

```bash
node scripts/visual-qa.mjs --mockups /path/to/design/mockups --screen Main,Home --widths 1440
```

`--strict --max-diff 0` fails on any DOM finding, page error, unimplemented
adapter or pixel difference above the threshold (percentage). The initial
baseline intentionally reports existing defects without hiding them. A capture
without strict mode is an inventory, not a release-quality pass. Different
fixture content also contributes to pixel differences; align fixtures and UI
state with the reference before asserting pixel accuracy. Screenshots require
separate visual review, and native regression remains mandatory.

The audit detects horizontal text overflow, text crossing control borders,
control height overflow, inconsistent control heights in one flex row, and
children outside cards. Hidden panels and intentional scrolling are excluded.
Self-test verifies wrapper/loop expansion and detection of injected overflow.
