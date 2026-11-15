# Mellorin vault edit permission v1

JERY chat runs in this vault. With the app setting `jery_can_edit_vault = true`, Mellorin adds `--permission-mode acceptEdits`: file creation and edits in the working directory are approved. No permission bypass is used. Outside writes, commands and network tools retain the CLI's normal rules and existing settings. This is not an OS sandbox. When the toggle is false, the flag is omitted; existing CLI settings still apply. One-shot translation and sentence explanation keep the original invocation.

Only act after the user asks. Propose format/rule changes through `mellorin-change` and wait for the app's Apply click; permission to edit files is not consent to silently apply a proposed format change. The local task checkbox is an independent fallback. A settings change disconnects JERY and applies on the next connection.
