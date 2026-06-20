# commma

Track your coding activity as a sport — sessions, pace, splits, streaks,
leaderboards, and a shareable **keyboard heatmap** of which keys you actually
press. This extension is the data source: it watches your editing activity and
sends it to [commma.dev](https://commma.dev), where your sessions, profile, and
heatmaps live.

## What it does

- Measures active coding time, keystrokes, and lines changed per file and
  language, and groups them into **sessions** (a new session starts after a
  15-minute idle gap).
- Builds a per-session **keyboard heatmap** — a map of which physical keys you
  pressed, which you can export as a transparent PNG from the web app.
- Keeps a daily **streak** and feeds the public leaderboards and your profile.

## Privacy — no keylogging

commma records **which keys** you press (key labels), never **what** you type.
The text content of your files is never read, stored, or transmitted — the
extension does not look at document content changes at all. This is a permanent
guarantee, not a setting.

You stay in control with the `commma.privacy` setting:

- **full** — send everything, including file paths and key-label frequency.
- **summary** — send duration, keystrokes, and lines only; no file paths, no key
  frequency.
- **off** — track nothing and send nothing.

## Getting started

1. Install the extension.
2. Run **commma: Sign in** from the Command Palette (`Ctrl/Cmd+Shift+P`) and
   complete the GitHub sign-in in your browser.
3. Code as usual. Activity flushes to the API about once a minute; your sessions
   appear on [commma.dev](https://commma.dev).

## Commands

| Command                           | What it does                        |
| --------------------------------- | ----------------------------------- |
| `commma: Sign in`                 | Authorize the extension via GitHub. |
| `commma: Sign out`                | Revoke the local session.           |
| `commma: Pause / Resume tracking` | Toggle activity tracking on or off. |

## Settings

| Setting             | Default                  | Description                     |
| ------------------- | ------------------------ | ------------------------------- |
| `commma.apiBaseUrl` | `https://api.commma.dev` | Base URL of the commma API.     |
| `commma.privacy`    | `full`                   | How much activity data to send. |

## Links

- Website — [commma.dev](https://commma.dev)
- Source & issues —
  [GitHub](https://github.com/trnahnh/commma-coding-progress-tracker)
