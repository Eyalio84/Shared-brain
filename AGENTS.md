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
2. Append a new entry to `CHANGELOG.md` using the schema below. In the `Commits:` field, write the literal placeholder `{hash}` where the feature commit's short hash will land — `scripts/session-close` fills it in automatically.
3. Update `docs/ARCHITECTURE.md` if the module/component table changed.
4. Update `docs/DECISIONS.md` if a non-obvious technical choice was made.
5. `git add <feature files>` — prefer explicit file names over `git add .` (avoids staging accidentally-created junk). **Do not** stage `CHANGELOG.md`; `session-close` commits it separately.
6. `./scripts/session-close "feat: imperative commit message"` — this runs the two-commit dance: (a) commits the staged feature files, (b) fills `{hash}` in `CHANGELOG.md`, (c) commits `CHANGELOG.md`, (d) pushes. Pass `--no-push` to skip the push step (rare). Without push, the other machine cannot see your work.

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

## Platform scope

Not every machine runs every part of this project. Know your environment.

| Platform | Edit code | `npm install` | `npm run dev` | `npm run build` | Typecheck |
|---|---|---|---|---|---|
| **Termux (Android)** | yes | with `--no-bin-links --ignore-scripts` | **no** (dlopen wall) | **no** (dlopen wall) | yes — invoke `node ./node_modules/typescript/bin/tsc --noEmit` |
| **Proot Ubuntu** | yes | yes (plain) | yes | yes | yes |
| **Laptop / PC (macOS / Linux / Windows)** | yes | yes (plain) | yes | yes | yes |

**Why Termux can't run the app:** Android's dynamic linker refuses to `dlopen` native `.node` modules from `/storage/emulated/`. This affects `lightningcss` (Tailwind v4's CSS parser), `sharp` (next/image optimizer), and any future native module. See `docs/DECISIONS.md` for the full finding.

Termux is an editing station. Runtime happens elsewhere via git sync. If you're on Termux and tempted to run `npm run dev`, stop — commit, push, and run it in proot Ubuntu or on laptop.

## Task management — TODO.md

`TODO.md` (repo root) is the canonical, machine-parseable todo list. The UI renders it in the Task Board widget; agents edit it via the two helper scripts below.

**Inline schema** (one task per line):

```
- [ ] (P1, @claude) Title of the task — ref: path/or/url
- [x] (P1, @claude, 2026-04-24) Title — ref: path
```

- `[ ]` / `[x]` — checkbox (required).
- Parens group contains comma-separated tags. Recognised: `P1`/`P2`/`P3` (priority), `@agent` (owner), `YYYY-MM-DD` (completion date on `[x]` tasks). Order inside the parens is free; unknown tokens are ignored.
- Title is the freeform text between the parens and (optionally) `— ref:`.
- `— ref:` is optional and takes a file path or URL.

**Scripts** (run from repo root):

- `./scripts/todo-add <P1|P2|P3> <@owner> "<title>" [ref]` — appends a new unchecked task under `## Active Tasks`.
- `./scripts/todo-done "<substring>"` — flips the first unchecked task whose title contains the substring; appends today's date to the parens group. Case-insensitive. If multiple match, only the first is flipped and the rest are reported on stderr.

**Rules of thumb:**
- Agents edit `TODO.md` directly via the scripts or by hand. The UI is read-only — it reflects `TODO.md` on next page load, not via live mutation.
- Owner in parens is the assignee, not the closer. If a different agent actually closes the task, leave the owner tag alone; the completion date records "when", not "by whom".
- Unique enough substrings only. `./scripts/todo-done "parser"` beats `./scripts/todo-done "the"`.

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
| `TODO.md` | Canonical todo list. Rendered in the Task Board widget. Edit via `scripts/todo-add` / `scripts/todo-done`. |
| `docs/ARCHITECTURE.md` | File tree + module table. |
| `docs/DECISIONS.md` | Why choices were made. |
| `app/page.tsx` | Command Center dashboard (Bento widgets). |
| `app/lib/todo.ts` | TODO.md parser (server-only module). |
| `app/api/commits/route.ts` | Returns recent git commits as JSON. |
| `scripts/smoke.sh` | Fast health check — typecheck + build. |
| `scripts/todo-add` | Append a new task to TODO.md. |
| `scripts/todo-done` | Flip the first matching unchecked task to `[x]` with today's date. |
| `scripts/session-close` | Session END ritual: commit staged feature files, fill the `{hash}` placeholder in CHANGELOG.md, commit CHANGELOG, push. |

## When stuck

Ask Eyal. He coordinates which agent works when and resolves ambiguity in the handoff.
