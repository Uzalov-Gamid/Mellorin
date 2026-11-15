# FAQ

## General

**What is Mellorin?**
A desktop study workspace. The interface is authored together with an AI agent: you describe a method in conversation, the agent writes it as data into your Markdown vault, and the app renders it from a fixed library of blocks. See the [README](../README.md#the-idea-in-one-minute).

**Is it a chat client?**
It includes a chat (the strip), but the point is the screens around it: reading, words, listening, writing, grammar, notes and progress, all driven by your own files.

**Which agent does it use?**
The Claude Code CLI, started in your vault under your own login and plan. Mellorin makes no model API calls and stores no keys.

**Does it work offline?**
The vault is local, so notes and past texts are readable offline. The agent, translation and external sites need a connection.

## Data and privacy

**Where is my data?**
In the vault folder you choose, as Markdown and small JSON files. The app also keeps `mellorin.toml` in the application support folder.

**What leaves my computer?**
Only what is sent to the Claude Code process you run (it talks to Anthropic under your account). Mellorin has no server and no analytics.

**Do I need Obsidian?**
No. The vault is plain files; Obsidian is just a convenient editor for the same files.

**Can I try it safely?**
Yes: copy the vault, point the app at the copy, make a snapshot with `scripts/vault-backup.sh`, and use `scripts/vault-history.sh` to undo any change if the copy is a git repository. See [Protecting your vault](GUIDE.md#protecting-your-vault).

## The agent

**What may the agent do in my vault?**
With the default setting it may create and edit files **inside the vault**. It cannot run shell commands, use the network through the app, or write outside the vault. You can switch editing off in Settings.

**What does `jery_ticktick` change?**
`full` lets the agent read and change TickTick tasks and calendar through your Claude account connector; `read` only reads; `off` gives no TickTick access. Your own `CLAUDE.md` rules still decide *when* it may change tasks.

**The agent proposes a screen change. Is it applied automatically?**
Never. You see a preview of the change and the exact files, and apply it with a click. The previous version is kept and can be rolled back.

**What if it needs something the app lacks?**
It writes a request note into `app-requests/`; the app shows a badge with the number of open requests. A new block is then added to the application.

## Screens and formats

**Why JSON formats instead of letting the agent write interface code?**
Generated code can do anything. Generated data can only describe. A fixed vocabulary of blocks makes every change previewable, reversible and safe to apply on a click.

**Can a format run scripts or open files?**
No. Formats cannot contain HTML, JavaScript, expressions, executable queries or file paths. Audio blocks accept absolute `http` or `https` addresses only.

**What happens if a format is invalid?**
The app shows a diagnostic and keeps the last valid format.

**Can I add a new subject (for example Python) or remove one?**
Ask the agent in the strip (the `+ Subject` row does that for you). New subjects start empty and grow through conversation. Removing a subject means archiving its folder; nothing is deleted by the app.

## Troubleshooting

See [User guide: Troubleshooting](GUIDE.md#troubleshooting).

## License and use

**Can I use or fork the code?**
You may read it. Any other use needs the author's prior written permission; see [LICENSE](../LICENSE) and [LICENSING](LICENSING.md). Earlier versions (`mvp`, `v0.1.0`) were published under MIT and remain so for those who already have them.
