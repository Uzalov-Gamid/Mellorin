# Format change controls

JERY replies may carry a validated `mellorin-change` proposal. The app shows rendered previews and exact format/process diffs. Apply is a user action; requesting a revision only sends a chat message. Formats refresh immediately after a successful operation, while preserving reading state.

The history button exposes persisted rollback and interrupted-operation recovery. Both reject concurrent edits. Two files are replaced separately using atomic renames and a durable journal; a pending operation blocks new changes until the user recovers it. Recovery refuses conflicts and retains the journal for inspection. Existing file permissions are preserved, new files use private permissions, and previous format JSON is retained separately from transaction metadata.

The path checks and in-process mutex assume the vault is not adversarially rewritten during filesystem operations. They do not provide an OS sandbox against an external process racing a rename.
