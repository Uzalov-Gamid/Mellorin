# Lane D — Settings, first PR

PR: https://github.com/Uzalov-Gamid/Mellorin/pull/41
Branch: `feat/release-d-management` → `develop`.
Implementation head: `dd7474991c09b0c0f100342d5cd74e4377dd61fb`.
The following commit only adds this report; use the PR head for final-head CI review.
Status: stopped for lead review; not merged. No second screen started.

## Implemented

- Extracted full Settings UI into `src/screens/settings/`; kept the existing `VaultSettings` export and expanded its permission/persistence regression coverage.
- Vault path/status, editable Claude CLI path, bounded `--version` availability check, existing bounded TickTick `mcp list` status and full/read/off controls. No model call is made by diagnostics. No subscription claim is inferred from a CLI version.
- Atomic path/light-theme/text-size persistence preserving unrelated TOML keys, nested tables, TickTick and edit permission. Validates existing absolute vault directory, CLI executable or `claude` from PATH, control characters and text size. Existing configs retain their keys; new configs default to light.
- Stops chat before meaningful vault/CLI path changes. Permission and TickTick changes keep their existing stop/reconnect behavior.
- Preference controls restore the saved size; Settings scales its card text. Dark theme remains disabled as in the mockup.
- About version/license, sanitized diagnostics and actual app config directory display. No raw CLI output, study files or task contents enter diagnostics.
- Minimal App additions show Settings in the content area while retaining mounted study panels; Settings via command-comma, chat expansion via command-J.
- No native config/icon changes. The integration test Config initializer gains only the new text-size field. No personal vault/config access, real JERY refresh, service probe or model call was performed.

## Local checks

- `npm run typecheck`: pass.
- `npm test`: 19 files, 90 tests pass. UI coverage retains failed/successful permission and TickTick saves and adds failed/successful path and text-size saves.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`: pass.
- `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`: pass.
- `cargo test --manifest-path src-tauri/Cargo.toml`: 32 unit tests + 24 subprocess tests pass; 3 existing opt-in tests ignored. New tests use temporary synthetic directories and a fake CLI, covering config preservation, invalid paths/preferences, meaningful process changes and version-only diagnostics.
- `python3 scripts/check_icons.py`: pass, 6 files; icons untouched.
- `git diff --check`: pass.
- CI on implementation head was pending for Frontend checks and Rust checks when this report was written. Final report-only head needs its own green CI. Native verification has NOT been performed; lead owns it.

## Visual QA — differences remain

Command: `node scripts/visual-qa.mjs --mockups ~/Documents/pulse-wt/design/mockups --screen Settings --out docs/qa/settings`.
Artifacts: `docs/qa/settings/report.json` and the corresponding mockup/app/diff/side-by-side PNGs (ignored local artifacts).

| Width | Expanded difference | Collapsed difference |
| --- | --- | --- |
| 1100 | 6.7082% | 6.9335% |
| 1440 | 6.1482% | 6.2741% |
| 1680 | 5.7499% | 5.7942% |

Six comparisons, no page errors, 30 DOM findings: five shared-shell control-text findings per comparison (request badge twice, footer Settings glyph, send and expand glyphs). No Settings control/overflow findings remain. This is NOT a pixel-fidelity pass.

Observed differences and exact remaining work:

1. Lead/lane A: shared shell still has the old tall top bar/global Today action, active English trail, footer controls and JERY copy rather than Settings mockup shell. These files were not edited. Integrate the full-screen Settings into the final route/sidebar selection and retain the command-comma behavior. Current Settings visibility is App-local state, not a deep-link route.
2. Lead/shared QA: add a synthetic `settings_diagnostics` response (data_directory, vault_found, learning_found, cli_available) and `text_size` config fixture to `scripts/visual-qa.mjs`. Its current bridge lacks the new command; screenshots show checks pending and the UI's diagnostics failure rather than a verified status. Rerun QA after this adapter and shell integration; do not treat the current diff as final.
3. Own-screen visual differences: typed path + Save replaces the mockup's folder picker; status avoids invented subject/word counts and subscription; Close is an extra control; permission copy describes actual existing CLI behavior rather than promising an OS sandbox; cards stack below 1200px to avoid narrow overflow. A real folder-picker interaction and final copy/layout fidelity remain for lead review.
4. Preference integration: size is persisted/restored and affects Settings card text. Other screens and shell still use fixed pixel sizes; lane A/lead must connect the saved `--text-size` preference to the shared typography system for application-wide scaling. No shell CSS was changed here.
5. Subjects management remains disabled pending its later PR, as requested. The new-text command-N shortcut is listed by the mockup but not implemented by this Settings PR; wire it when the NewText screen is authorized. Existing command-B and Enter behavior is retained; command-comma and command-J are wired.
6. Data-directory button reveals its actual path in the sanitized diagnostics panel, rather than opening Finder; diagnostic button shows bounded checks, not a persistent log file. Native folder reveal/log integration remains for the lead if required for M1.
7. Lead: native regression with a synthetic vault and final-head CI before merge. Do not run a real refresh from this branch.

## Limits and restart state

Newest rollout LAST rate_limits record observed at epoch 1794766244:
- primary: used_percent 26.0, window_minutes 300, resets_at 1794783118 (valid).
- secondary: used_percent 4.0, window_minutes 10080, resets_at 1795369918 (valid).
Initial inspection found no rate_limits record in the then-newest rollout; continued per instructions.

Fetched origin/develop before PR; no newer shared-kit commits existed then. Resume only on lead instruction, on this branch, after inspecting status and limits. Do not rebase published commits, merge this PR, change native config or start another screen. Shared App/lib registry changes are additive and should be integrated by the lead alongside other lanes.
