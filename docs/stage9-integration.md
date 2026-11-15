# Stage 9 integration handoff

Implemented independently of Stage 9a. Reserved App, subprocess, and config files were not modified.

Root wiring:

1. Read `parseReply(...).changes ?? []` from the current assistant response. Keep the parsed proposal objects stable between renders, or key previews by response ID plus serialized proposal.
2. Render `ChangePreview` from `src/changes/ChangePreview.tsx` for each proposal. Pass the active response flag as `streaming`.
3. Supply `onChange(proposal)` to initiate the user's revision request through the existing JERY hook. This callback must not apply anything.
4. Supply `onApplied(record)` to refresh/reload the active format immediately and increment a history revision. Existing FormatScreen polling reloads within five seconds as a fallback.
5. Mount `ChangeHistory` from `src/changes/ChangeHistory.tsx` with that revision and the same refresh callback. Its recovery and rollback controls work after restart.

Rust command registration is already included in lib.rs. `learning_init` appends the Stage 9 protocol to existing Stage 8 vault READMEs once. No permissions/settings integration is included.

Verification: frontend typecheck and 69 Vitest tests; Rust formatting, Clippy with warnings denied, 43 Rust tests pass; one existing live-Claude integration test remains ignored. No native application build, live Claude run, PR, or real-vault writes were performed, as requested. Root should run the integrated UI flow after wiring.

Transactions are recoverable across two atomic file replacements, rather than claiming an impossible atomic rename of two files. A durable pending journal blocks subsequent changes until explicitly recovered. Recovery refuses external edits; it never blindly restores over them. Filesystem replacement races by external processes are outside the in-process mutex; see protocol notes.
