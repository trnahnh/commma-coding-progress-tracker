# Installation

commma ships as an editor extension, published to **two registries** so it
installs natively wherever you code. Pick the row that matches your editor — the
rest of this page is the long version, with CLI commands, manual sideloading,
and troubleshooting.

## Pick your editor

| Editor             | Registry            | How to install                  |
| ------------------ | ------------------- | ------------------------------- |
| VS Code / Insiders | VS Code Marketplace | Search **commma** in Extensions |
| Cursor             | Open VSX            | Search **commma** in Extensions |
| Windsurf           | Open VSX            | Search **commma** in Extensions |
| VSCodium           | Open VSX            | Search **commma** in Extensions |
| Gitpod             | Open VSX            | Search **commma** in Extensions |

The extension id is the same everywhere: **`commma.commma`**. If your editor is
a VS Code fork, it almost certainly pulls extensions from Open VSX rather than
the Microsoft Marketplace — that distinction is the one thing worth knowing
before you start.

## VS Code

Install from the
[Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=commma.commma):
open the **Extensions** panel (`Ctrl+Shift+X` / `Cmd+Shift+X`), search
**commma**, and click **Install**. Or open the Marketplace listing in a browser
and use the **Install** button there.

From the terminal:

```bash
code --install-extension commma.commma
```

## Cursor, Windsurf, VSCodium, Gitpod

These editors are VS Code forks that use the
[Open VSX registry](https://open-vsx.org/extension/commma/commma) instead of the
Microsoft Marketplace, so the steps are the same but the source differs: open
the **Extensions** panel, search **commma**, and click **Install**.

From the terminal, each editor ships its own CLI:

```bash
cursor   --install-extension commma.commma
windsurf --install-extension commma.commma
codium   --install-extension commma.commma
```

## Install from a VSIX

For an air-gapped machine, a pinned version, or any editor whose marketplace you
would rather skip, install the packaged `.vsix` directly. Download it from the
[Open VSX](https://open-vsx.org/extension/commma/commma) or
[Marketplace](https://marketplace.visualstudio.com/items?itemName=commma.commma)
listing, then either:

- In the **Extensions** panel, open the **`...`** menu and choose **Install from
  VSIX…**, or
- Run it from the terminal:

```bash
code --install-extension commma-1.0.0.vsix
```

## After you install

1. Reload the editor window when prompted.
2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run **commma:
   Sign in**. It opens a browser for GitHub OAuth and hands a one-time code back
   to the editor — you never paste a token by hand.
3. Pick a privacy mode and start coding. The full walkthrough, including what
   each privacy mode records, lives in [Getting started](/docs/getting-started).

commma only ever records **which** keys were pressed, never **what** you typed.

## Verify it is working

The commma status bar item appears once you are signed in. After about a minute
of coding it flips to show the active session, and your first session shows up
on your profile a few minutes later. If nothing appears:

- Confirm you are signed in — re-run **commma: Sign in**.
- Confirm `commma.privacy` is not set to `off` in your editor settings.
- Check the **commma** output channel for connection errors.

## Troubleshooting

**It is not in my editor's search.** Cursor, Windsurf, VSCodium, and Gitpod read
from Open VSX, not the Microsoft Marketplace. Make sure your editor's extension
gallery points at Open VSX (the default for these editors), then search again —
or download the VSIX and install it manually, as described above.

**"Not compatible with this version of the editor."** The extension targets the
VS Code `^1.85.0` engine. Update your editor to a recent build and retry.

**Behind a corporate proxy.** Set `http.proxy` in your editor settings so the
Extensions panel can reach the registry, or install from a downloaded VSIX.

## Any editor: the CLI

Not on a VS Code–family editor? The **commma CLI** is a headless client that
tracks your coding from anything that writes source files to disk — Neovim,
Emacs, Helix, JetBrains. It ships in the open-source monorepo; build it once,
sign in, and run the watcher:

```bash
git clone https://github.com/trnahnh/commma-coding-progress-tracker
pnpm install
pnpm --filter @commma/cli build
node apps/cli/dist/cli.js login
node apps/cli/dist/cli.js watch
```

`commma watch` derives keystroke and line counts from file changes and flushes
them every 60 seconds — it reads files only to measure how much changed, never
what you typed, and it cannot build a key-frequency heatmap at all (that stays
the editor extension's job). The same `full` / `summary` / `off` privacy modes
apply, set with `--privacy` or the `COMMMA_PRIVACY` environment variable. See
the [CLI page](/cli) for the full command reference.

## Other editors

Native JetBrains and Neovim plugins are still on the roadmap. Until they land,
the CLI above already covers those editors; drop your email on the
[home page](/#install) and we will let you know when the native plugins ship.
