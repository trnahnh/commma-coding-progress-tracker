# Security Policy

commma takes the security and privacy of its users seriously. The extension runs
inside developers' editors, so we treat every report with care.

---

## Supported Versions

commma is pre-1.0 and ships from `main`. Security fixes land on `main` and in
the latest published extension build; there are no maintained release branches
yet. Always run the latest version.

| Component                                   | Supported |
| ------------------------------------------- | --------- |
| `apps/api` (`main`)                         | ✅        |
| `apps/extension` (latest Marketplace build) | ✅        |
| `apps/web` (production deploy)              | ✅        |
| Older builds / forks                        | ❌        |

---

## Reporting a Vulnerability

**Do not open a public issue for a security problem.** Public disclosure before
a fix puts users at risk.

Report privately through either channel:

1. **GitHub private vulnerability reporting** — on this repository, go to the
   **Security** tab → **Report a vulnerability**. This is the preferred channel.
2. **Email** — `anh.tranduy1156@gmail.com` with a subject starting `[security]`.

Please include:

- A description of the issue and its impact.
- Steps to reproduce (proof-of-concept, affected endpoint/route, or extension
  flow).
- The component and version/commit affected.
- Any suggested remediation.

### What to expect

- **Acknowledgement** within 72 hours.
- An initial assessment and severity rating within 7 days.
- Regular updates as we work on a fix, and credit in the release notes /
  `CHANGELOG.md` once the fix ships (unless you prefer to remain anonymous).

We follow **coordinated disclosure**: please give us a reasonable window to ship
a fix before any public write-up.

---

## The Privacy Invariant

commma's central guarantee is **no keylogging** (ADR-006): the extension records
only **key labels** — which physical key was pressed — and **never key
content**, the characters that were typed. `contentChanges` from VSCode is
reduced to a label histogram and the raw text is discarded before anything
leaves the editor.

A regression that causes key content, file contents, or any typed text to be
captured, persisted, or transmitted is a **security vulnerability** — report it
through the channels above, not as an ordinary bug.

The three privacy modes (`full` / `summary` / `off`) and their server-side
enforcement are part of this boundary; a way to bypass `summary` or `off` and
recover suppressed data is also in scope.

---

## Scope

**In scope:**

- Authentication and session handling (GitHub OAuth, JWT access tokens, rotating
  refresh tokens).
- The ingest pipeline and privacy-mode enforcement (`apps/api`,
  `packages/shared`).
- Access-control gaps on `/v1/*` endpoints (e.g. reading another user's private
  session or profile).
- The extension's handling of credentials (SecretStorage) and the loopback OAuth
  flow.
- Injection, SSRF, or data-exposure issues in the API or web app.

**Out of scope:**

- Vulnerabilities in third-party infrastructure we deploy on (Railway, Upstash,
  Vercel, AWS) — report those to the respective vendor.
- Denial of service from traffic volume alone (the API has documented rate
  limits; report a _bypass_ of them instead).
- Social engineering, physical attacks, or compromised end-user machines.
- Missing hardening headers with no demonstrated impact.

---

## Safe Harbor

We consider good-faith security research that respects user privacy, avoids data
destruction, and does not degrade service for others to be authorized. We will
not pursue or support legal action against researchers who follow this policy
and report through the private channels above.
