# Design

This page describes the visual language of Mellorin and shows **design previews**. Previews are renders of the design mockups, with invented sample data. Some of these screens are implemented in version 0.2.0 (see [README: Status](../README.md#status-and-roadmap)); the rest are the agreed design for upcoming releases.

## Principles

- **The interface is a layer over your vault.** It visualizes Markdown files and makes study methods convenient. It does not author content; the agent does.
- **One language for everything.** The agent describes screens as data from a fixed [block library](formats.md); the app applies one consistent style, so any screen the agent builds looks native.
- **Quiet and precise.** Minimal, flat, no emoji. Alignment is verified by a script (`scripts/visual-qa.mjs`) rather than by eye: no text overflows a button, pill or card.

## Visual language

| Element | Rule |
|---|---|
| Palette | A light cream "Astronaut" palette: cream `#f1ead8` background, paper `#f8f1e3` surfaces, linen `#e6dcc6` panels, sand `#d6c8ab` borders, ink `#2a1f1b` text, ember `#b4541b` as the accent, flame `#e08a4c` for progress, emerald `#1f6b5c` for links, and a near-black `#1c1513` used only for dark cards (word card, code blocks). Light colors are fills and lines, never text on cream. |
| Type | One monospace family, SF Mono. Base weight Bold, emphasis Heavy (matching a terminal setup). 14 px body, 11 px uppercase captions with letter spacing. |
| Glyphs | Text glyphs instead of icons or emoji: `● ○ ◆ › ▸ ▾ ▴ ✓ ✗ ↵ ⟳ « »`. |
| Cards | Rounded 8–12 px with a border; light surfaces use paper, never a pale fill on a floating card. |
| Window | No title bar text. The macOS window buttons sit in the sidebar's top-left; a thin top bar shows the date and is draggable. No buttons in the top bar except a quiet refresh icon on Home. |

## Semantic roles

Formats and the agent never specify colors. They use roles; the app maps them:

| Role | Meaning | Color |
|---|---|---|
| accent | Main action, current step | ember |
| success | Correct, done | olive / mint |
| warning | A trap, a tail | brass / butter |
| danger | An error | rust |
| muted | Secondary text | stone |
| highlight | A selected sentence or word | peach / butter |

## Previews

### Implemented in 0.2.0

| | |
|---|---|
| ![Home](assets/screenshots/home.png)<br>Home | ![Reading](assets/screenshots/reading.png)<br>Reading |
| ![Words](assets/screenshots/words.png)<br>Words | ![Listening](assets/screenshots/listening.png)<br>Listening |
| ![Writing](assets/screenshots/writing.png)<br>Writing | ![Grammar](assets/screenshots/grammar.png)<br>Grammar |
| ![Notes](assets/screenshots/notes.png)<br>Notes reader | ![Settings](assets/screenshots/settings.png)<br>Settings and workshop |

### The core idea

| | |
|---|---|
| ![You speak, the agent builds](assets/design/you-speak-jery-builds.png)<br>You describe a change, the agent proposes it, you preview and apply. | ![Block catalog](assets/design/block-catalog.png)<br>Three levels of blocks and the semantic style rules. |

### Designed for upcoming releases (previews)

| | |
|---|---|
| ![DevOps topic](assets/design/devops-topic.png)<br>DevOps: topic | ![DevOps question pool](assets/design/devops-pool.png)<br>DevOps: question pool |
| ![DevOps labs](assets/design/devops-labs.png)<br>DevOps: labs | ![DevOps school projects](assets/design/devops-school.png)<br>DevOps: school projects |
| ![DevOps overview](assets/design/devops-overview.png)<br>DevOps: overview | ![Arabic words](assets/design/arabic-words.png)<br>Arabic: reading words (right to left) |
| ![Arabic letters](assets/design/arabic-letters.png)<br>Arabic: letters and families | ![Arabic overview](assets/design/arabic-overview.png)<br>Arabic: overview |
| ![C lesson](assets/design/c-lesson.png)<br>C: lesson | ![C plan](assets/design/c-plan.png)<br>C: stages |
| ![SQL start](assets/design/sql-start.png)<br>SQL: an empty subject that grows from conversation | ![Vocabulary](assets/design/vocabulary.png)<br>Vocabulary manager |
| ![Subjects](assets/design/subjects.png)<br>Subjects management | ![New text](assets/design/new-text.png)<br>New text |
| ![YouGlish pane](assets/design/source-youglish.png)<br>External source pane: pronunciation | ![ELLLO pane](assets/design/source-elllo.png)<br>External source pane: listening |
| ![Onboarding](assets/design/onboarding.png)<br>First run | ![States](assets/design/states.png)<br>Errors, limits and notifications |
| ![Workshop](assets/design/workshop.png)<br>Workshop | ![Recap](assets/design/recap.png)<br>Lesson recap |
| ![Activity](assets/design/activity.png)<br>Activity | |

The HTML sources of the mockups are kept with the project's design materials and are rendered to images by `scripts/visual-qa.mjs` for side-by-side comparison with the real screens.
