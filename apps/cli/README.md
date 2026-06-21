# @commma/cli

A headless [commma](https://commma.dev) data source. Track coding activity from
any editor — Neovim, Emacs, Helix, JetBrains, or anything that writes files to
disk — without an editor plugin. The CLI watches a project directory, derives
keystroke and line deltas from file changes, and flushes a batch of heartbeat
events to the commma API every 60 seconds. Sessions stay server-derived, so
there is no manual start/stop — the same passive model as the editor extension.

## Install

The CLI ships as part of the commma monorepo. From the repo root:

```bash
pnpm install
pnpm --filter @commma/cli build
node apps/cli/dist/cli.js --help
```

During development you can run it straight from TypeScript:

```bash
pnpm --filter @commma/cli dev -- watch
```

## Usage

```text
commma <command> [options]

Commands
  login            Sign in with GitHub (opens your browser)
  logout           Sign out and clear stored credentials
  watch [dir]      Track coding activity in a directory (default: current)
  status           Show sign-in state and configuration
  help             Show this help

Options
  --dir <path>     Directory to watch (alias for the watch positional)
  --privacy <m>    full | summary | off (default: full)
  --api <url>      API base URL (default: https://api.commma.dev)
  -h, --help       Show this help
  -v, --version    Show the version
```

Typical flow:

```bash
commma login
cd ~/code/my-project
commma watch
```

`login` runs the same loopback OAuth one-time-code flow as the editor extension:
it opens GitHub in your browser, captures the redirect on a temporary
`127.0.0.1` port, and exchanges the one-time code for tokens at
`POST /v1/auth/cli/exchange`. The refresh token is written to
`~/.commma/credentials.json` with `0600` permissions; the short-lived access
token is rotated automatically.

## Privacy

The CLI honors the same three privacy modes as the extension:

- **full** — sends language, relative file path, project name, keystrokes, and
  lines.
- **summary** — sends only language, keystrokes, and lines (no file paths).
- **off** — tracks and sends nothing.

Because the CLI observes the filesystem rather than the editor, it **never has
access to which physical keys were pressed**, so it does not send the `key_freq`
keyboard-heatmap field at all — consistent with the ADR-006 key-label privacy
guarantee. Keystroke counts are an approximation derived from file byte deltas,
not true keypresses; the editor extension remains the precise source for the
keyboard heatmap.

File content is read only to count characters and lines. It is never stored or
transmitted.

## Configuration

All options can be set by flag or environment variable:

| Variable            | Purpose                                       |
| ------------------- | --------------------------------------------- |
| `COMMMA_API_URL`    | Override the API base URL                     |
| `COMMMA_PRIVACY`    | Default privacy mode (`full`/`summary`/`off`) |
| `COMMMA_CONFIG_DIR` | Override where credentials are stored         |

Flags take precedence over environment variables, which take precedence over
defaults.

## How it works

- A polling watcher scans the directory tree every few seconds, skipping common
  build and dependency directories (`node_modules`, `dist`, `.git`, and so on)
  and any file whose extension is not a recognized source language.
- The first time a file is seen it records a baseline; only subsequent deltas
  are counted, so cloning, branch switches, and pulls are not counted as typing.
- Per-file deltas accumulate in memory and flush as a `HeartbeatEvent[]` batch
  every 60 seconds. Unsent batches are buffered to `~/.commma/queue.json` with
  exponential backoff, so a dropped connection does not lose activity.
