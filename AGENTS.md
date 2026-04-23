# Agents

Instructions for any AI agent (Claude Code, Gemini CLI, or similar) working in this repository.

`CLAUDE.md` and `GEMINI.md` both defer to this file. If you are a human, start with `README.md` instead.

## What this is

**Shared Brain** — a prototype shared command center. The repo is cloned on multiple machines (Termux/Android phone, laptop, future PC build). Any developer can pick up the project from any machine using either Claude Code or Gemini CLI. State is synchronized via git.

The app itself (a Session Log viewer) is a test bed. The real product is the workflow.

- **Stack:** Next.js 16 App Router · React 19 · Tailwind v4 · TypeScript 5
- **Platform:** Primary dev on Termux/Android (arm64). Turbopack unsupported — `package.json` scripts use `--webpack`.
- **Persistence:** Reads `CHANGELOG.md` and `git log` at request time. No database.

## Session protocol — READ BEFORE ANY WORK

This repo is used by multiple agents across machines. Alignment depends on a consistent ritual every session.

### Session START

1. **`git pull`** — fetch the latest state. If a merge conflict surfaces, stop and ask the user. Never force-resolve.
2. **Read the latest entry in `CHANGELOG.md`** — tells you what the last agent did, what state the work is in, what the next step is.
3. **If the latest entry's `State:` is `in-flight`** — do NOT start new work. Pick up where the previous agent left off, or ask the user. Starting parallel work is the failure mode this protocol prevents.
4. **Run `git log --oneline -5`** — cross-reference recent commits.
5. **Scan `docs/ARCHITECTURE.md`** if you haven't seen the file tree this session.

### Session END

Triggered by the user saying **"update docs"** (or a near variant). The ritual:

1. Review `git diff` and `git status` for everything changed this session.
2. Append a new entry to `CHANGELOG.md` using the schema below.
3. Update `docs/ARCHITECTURE.md` if the module/component table changed.
4. Update `docs/DECISIONS.md` if a non-obvious technical choice was made.
5. `git add <files>` — prefer explicit file names over `git add .` (avoids staging accidentally-created junk).
6. `git commit -m "<brief message>"` — imperative mood, under 60 chars.
7. `git push` — **critical**. Without push, the other machine cannot see your work.

### CHANGELOG.md entry schema

Every entry uses all six fields.

```markdown
## YYYY-MM-DD HH:MM — {one-line goal}

**AI:** Claude | Gemini
**Machine:** Termux (Android) | Laptop | PC
**State:** done | in-flight
**Commits:** abc1234, def5678

**What changed:**
- `path/to/file.tsx` — one-line summary
- `path/to/api/route.ts` — one-line summary

**Why:** Brief paragraph on motivation / decision rationale.

**Next:** What the next agent should do. "n/a — complete" if finished.

**Open questions:**
- Any unresolved choices (or "none")
```

**`Commits:`** is best-effort — fill it after committing, or write `(pending)` and amend. The cross-reference to `git log` matters more than perfect accuracy.

### Turn-taking

Only ONE agent works at a time. The user is the lock mechanism — they coordinate which agent runs when. The `State: in-flight` field in the latest CHANGELOG entry is an advisory signal you respect, not a technical lock.

## Conventions

- **Files:** `app/` for routes (Next 16 App Router). No `src/` directory.
- **Imports:** `@/*` alias points to repo root (e.g., `@/components/Foo`).
- **Styling:** Tailwind v4 utility classes. No CSS modules. Global tokens in `app/globals.css`.
- **TypeScript:** strict mode. Prefer `type` over `interface` for simple shapes; `interface` for classes/extension.
- **React:** Server components by default. Add `"use client"` only when required (hooks, event handlers, browser APIs).
- **Git:** No force-push. No history rewrite on shared branches. Always `git pull` before starting.

## DO

- Read `CHANGELOG.md` before touching code. The latest entry is often more instructive than the code itself.
- Preserve `AGENTS.md` as the single source of truth. `CLAUDE.md` and `GEMINI.md` stay thin.
- Run `./scripts/smoke.sh` before committing if you touched application code.
- Mark work `in-flight` honestly — it's not a demerit, it's a handoff signal.
- When the user says "update docs", that is the literal trigger for the Session END ritual. Execute it; don't paraphrase.

## DON'T

- Don't skip `git pull` at session start — cause of the most expensive merge conflicts.
- Don't skip `git push` at session end — causes the other machine to work on stale state.
- Don't edit `CLAUDE.md` or `GEMINI.md` for instruction changes — edit `AGENTS.md` instead.
- Don't add emojis unless the user explicitly asks.
- Don't use the `--turbopack` flag or remove `--webpack` from `package.json` scripts. Turbopack is broken on Termux/arm64.
- Don't pick up `in-flight` work from a different machine without asking the user first — the state may be ambiguous.
- Don't run plain `npm install` on Termux — it fails with EACCES on symlinks (FUSE filesystem limitation). Use `npm install --no-bin-links`. On laptop/PC, plain `npm install` is fine.
- Don't invoke tool binaries via `./node_modules/.bin/<tool>` on Termux — symlinks absent. Use `node ./node_modules/<package>/bin/<binary>` instead. See `scripts/smoke.sh` for the pattern.

## File layout

See `docs/ARCHITECTURE.md` for the full tree + module table. Hot files:

| File | Role |
|---|---|
| `AGENTS.md` | This file. Shared agent instructions. |
| `CLAUDE.md` | One-line pointer to `AGENTS.md`. |
| `GEMINI.md` | One-line pointer to `AGENTS.md`. |
| `CHANGELOG.md` | Session-by-session narrative log. Read the latest entry first. |
| `docs/ARCHITECTURE.md` | File tree + module table. |
| `docs/DECISIONS.md` | Why choices were made. |
| `app/page.tsx` | Session Log viewer — the app. |
| `app/api/commits/route.ts` | Returns recent git commits as JSON. |
| `scripts/smoke.sh` | Fast health check — typecheck + build. |

## When stuck

Ask Eyal. He coordinates which agent works when and resolves ambiguity in the handoff.
