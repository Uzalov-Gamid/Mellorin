# User guide

How to use Mellorin, screen by screen. For a first overview read the [README](../README.md); for settings see [Configuration](CONFIGURATION.md).

## Contents

- [Before you start](#before-you-start)
- [Talking to the agent](#talking-to-the-agent)
- [The sidebar](#the-sidebar)
- [Home](#home)
- [English: Reading](#english-reading)
- [English: Words](#english-words)
- [English: Listening](#english-listening)
- [English: Writing](#english-writing)
- [English: Grammar](#english-grammar)
- [Notes](#notes)
- [Settings and the workshop](#settings-and-the-workshop)
- [Changing how a screen works](#changing-how-a-screen-works)
- [Protecting your vault](#protecting-your-vault)
- [Troubleshooting](#troubleshooting)

## Before you start

You need the [requirements](../README.md#requirements) and a vault folder. Open Settings (<kbd>⌘</kbd><kbd>,</kbd>), set the **vault path** and check that **Claude Code** is found. While you evaluate the app, point it at a **copy** of your notes.

Two roles to keep in mind:

- **The agent (JERY) does the content work**: it creates texts and words, writes notes, keeps plans and proposes changes to screens.
- **The app visualizes**: it draws what is in the vault and makes the methods convenient (clickable words, buttons, hidden transcripts).

So most "add" or "create" actions are done by asking the agent in the strip, not by filling in a form.

## Talking to the agent

The **strip** at the bottom shows the agent's last message in one line and has an input. It works with macOS dictation. Press <kbd>↵</kbd> to send.

- <kbd>⌘</kbd><kbd>J</kbd> (or the arrow at the right end) expands the full conversation above the strip.
- States: *thinking* (animated dots), *limit reached* (shows when it resets), *interrupted* (retry button).
- The agent runs inside your vault, so it follows the rules in your `CLAUDE.md`.

Useful requests: *"what is on today?"*, *"let's read a text"*, *"start the words lesson"*, *"check my writing"*, *"explain the rule"*, *"put a number after every sentence in reading texts"*.

## The sidebar

- **Day ring** (top left): how many of today's tasks are done, for example `2/9`.
- **Week dots**: days with study sessions are filled; today is ringed.
- **Open subject card**: a progress ring and the **trail** of its skills. Passed steps are filled, the current one is ringed and highlighted, the line is orange up to the last passed step.
- **Other subjects**: one-line rows with a ring and the next step. Click one to open its trail.
- **`+ Subject`**: asks the agent to create a new subject.
- **Footer**: agent status, settings and theme.
- <kbd>⌘</kbd><kbd>B</kbd> collapses the sidebar to rings (a mini trail stays under the active subject). On narrow windows it collapses by itself.

## Home

A summary of the day, built from files the agent writes (`.mellorin/state.json`, `today.json`). Nothing is invented: when data is missing the page says so.

- **Today** (from TickTick): tasks with a subject chip and time or tag. **Start** hands the task to the agent and opens the matching screen. Press the small **⟳** icon in the top bar to ask the agent to refresh the data.
- **Nearest dates**: counters for goals and deadlines.
- **Progress by subject**: a ring per subject with the current stage and any tails (unfinished work).
- **Repeats today**, **week** (sessions per day) and **tails and mistakes**.

## English: Reading

1. Ask the agent for a text or paste one. Sentences get a number after each one (a format rule you can change).
2. **Click a sentence** to split it into phrases with a short translation.
3. **Click a word** to see its translation in context, hear it spoken, and mark its status: `learning`, `focus` or `known`. Words are written to `vocabulary/mywords-list.md`.
4. Name the numbers you do not understand to the agent; it explains them in the strip.
5. The step tracker at the top shows where you are in the lesson.

## English: Words

A lesson of about ten words chosen by the agent (focus words first, then recent ones, then the oldest). Cards, then tests with answer buttons, a reverse translation and a dictation, then a summary. Answer with the mouse, by voice, or with <kbd>a</kbd> <kbd>b</kbd> <kbd>c</kbd> <kbd>d</kbd>; <kbd>↵</kbd> moves on. Progress dots show correct, wrong and pending words.

## English: Listening

Questions first, then the audio. The **script stays hidden** until the step where it is needed (the app toggles its visibility by step; the agent drives the steps). After the script opens you read it, find the answers, mark unclear parts by number and retell.

## English: Writing

You write the text yourself (typing, not dictation, so spelling is visible). The review shows your text with marked errors and a card per numbered sentence: *was → should be → why*. Then you rewrite the whole text and the agent checks it. Main errors are recorded in `errors.md`.

## English: Grammar

Theory in parts (one part per message): forms in a table, the trap in a highlighted quote, a short practice and a homework list by textbook page. The agent writes the study note after the theory.

## Notes

The **notes reader** opens the real notes of a subject the way Obsidian shows them: properties, headings, tables, callouts, code blocks, checkboxes, wikilinks `[[…]]` (clickable and resolved inside the vault), tags, an outline and related notes. It is read-only; to change a note, ask the agent. Service files (`CLAUDE.md`, `.claude/`, `.obsidian/`, `JERY/`, `Templates/`) are never listed as notes.

## Settings and the workshop

Open with <kbd>⌘</kbd><kbd>,</kbd> or the `≡` icon.

- **Vault**: path and status.
- **JERY**: Claude Code path and a check; the switch **"JERY may change files in the vault"**; **TickTick**: *read and write*, *read only* or *off*, with connection status.
- **Appearance**: theme and text size.
- **Workshop**: the history of format changes with **rollback**. (Open block requests are shown by a badge in the main window.)
- **About**: version, license, diagnostics.

## Changing how a screen works

1. Tell the agent what you want: *"hide the transcript until step 4"*, *"make the words test have four choices"*.
2. The agent proposes a change. The app shows a **preview**: before and after, and exactly which files change (`formats/<subject>-<skill>.json` and the managed rule section in `process.md`).
3. Press **Apply** to accept or **Change** to ask for something different. Nothing is written without your click.
4. To undo, open Settings, **Workshop**, and roll back. The previous version is kept in `formats/.history/`.

If the agent needs a block the app does not have, it writes a note into `app-requests/` and the app shows a badge with the number of open requests.

## Protecting your vault

```bash
scripts/vault-backup.sh                 # verified .tar.gz snapshot with a timestamp
scripts/vault-diff.sh                   # read-only: how does the working copy differ from the original?
scripts/vault-history.sh log 10         # what did the agent change? (vault must be a git repository)
scripts/vault-history.sh restore <rev>  # bring files back; the restore is itself a commit and can be undone
```

## Troubleshooting

| Symptom | What to check |
|---|---|
| The strip says Claude Code is not found | Settings, JERY: set the full path to the `claude` binary and press **Check** |
| The agent does not answer | Your Claude plan limit may be reached; the strip shows when it resets |
| TickTick tasks do not appear | Settings shows the connection; enable the TickTick connector in your Claude account, and keep the mode on *full* or *read* |
| A screen shows a "block needed" placeholder | A format uses a block the app does not have; see the open requests in the workshop |
| A format change did not apply | The app keeps the last valid format and shows a diagnostic; fix or ask the agent to correct the proposal |
| The window looks wrong after an update | Quit and start the app again; collapse and expand the sidebar once with <kbd>⌘</kbd><kbd>B</kbd> |
