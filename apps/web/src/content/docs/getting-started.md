# Getting started

commma is free for everyone right now — no card, no invite. Getting set up takes
about a minute once the extension is installed.

## 1. Install the extension

Search **commma** in your editor's Extensions panel and click install — the same
as any other extension. It is on the
[Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=commma.commma)
for VS Code and on the
[Open VSX registry](https://open-vsx.org/extension/commma/commma) for Cursor,
Windsurf, VSCodium, and Gitpod.

For per-editor steps, CLI commands, VSIX sideloading, and troubleshooting, see
the [Installation guide](/docs/installation).

## 2. Sign in with GitHub

The extension authenticates against the commma API with GitHub. It opens a
browser to start the OAuth flow, then hands a one-time code back to the editor
over a loopback URL. The editor exchanges that code for a short-lived access
token and a refresh token; only the refresh token is stored, in the editor's
encrypted secret storage.

You never paste a token by hand, and no API key or service secret ever lives on
your machine.

## 3. Pick a privacy mode

Set `commma.privacy` in your editor settings to one of:

- **full** — track everything: keystroke counts, active file and language, and
  the key-label frequency map that powers the heatmap.
- **summary** — track session totals only. No file paths, no key-label map.
- **off** — track nothing. The extension stays silent.

You can change this at any time. Whatever the mode, commma only ever records
**which** keys were pressed, never **what** you typed.

## 4. Code as usual

That is the whole setup. The extension batches your activity locally and flushes
it to the API on a 60-second heartbeat. If you go offline it buffers events and
sends them when you reconnect.

A few minutes later your first session shows up on your profile, on the
leaderboard, and — if your privacy mode allows it — with a keyboard heatmap you
can export as a transparent PNG.

## What gets tracked

| Field           | full  | summary | off |
| --------------- | ----- | ------- | --- |
| Keystroke count | yes   | yes     | no  |
| Active language | yes   | yes     | no  |
| File path       | yes   | no      | no  |
| Key-label map   | yes   | no      | no  |
| Key content     | never | never   | no  |

## Signing out

Run the **commma: Sign out** command from the editor's command palette. It
revokes the refresh token and clears it from secret storage.
