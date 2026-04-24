# Session Handoff — 2026-04-24

**Temporary context bridge: Termux (Android) → proot Ubuntu.**

This file is written for an AI agent (Claude Code, Gemini CLI, or similar) arriving fresh in proot Ubuntu, continuing the work started on Termux. Read this file top-to-bottom before executing anything.

**Delete this file after the proot session confirms `npm run dev` works.** Its content belongs permanently in `CHANGELOG.md` and `docs/DECISIONS.md` — this file exists only to carry inter-session context that couldn't ride in the repo alone.

---

## Why this handoff exists

The previous session (Claude Code on Termux, `/storage/emulated/0/Download/claude-projects/shared-brain/`) scaffolded a Next 16 + Tailwind v4 app and tried to run the dev server. Scaffolding worked. Running it didn't.

Root cause: **Android's dynamic linker refuses to `dlopen` native `.node` libraries from `/storage/emulated/`.** This isn't a permission issue — the Android kernel's security policy treats external storage as non-executable for shared-library loading regardless of file mode bits. Tailwind v4's `lightningcss` native parser fails, every page request returns HTTP 500. Not fixable via flags.

Proot Ubuntu bypasses this: its filesystem lives on Termux's native ext4 mount, not on FUSE. Native modules load normally there.

---

## Current repository state

- **Remote:** `https://github.com/Eyalio84/Shared-brain.git`
- **Branch:** `main`
- **Latest commit before this handoff:** `d4f5c0c` (bootstrap)
- **This handoff commit:** contains docs revisions + `HANDOFF.md`. Hash fills into the `CHANGELOG.md` "Commits" field after push.

### What's been validated on Termux

- Project scaffold via `npx create-next-app@latest` with TS + Tailwind + App Router + no-src-dir.
- `npm install --no-bin-links --ignore-scripts` — 358 packages installed.
- TypeScript typecheck clean via `node ./node_modules/typescript/bin/tsc --noEmit`.
- Git init, first commit, push to the remote.

### What's confirmed non-working on Termux (dlopen wall)

- `npm run dev` — HTTP 500 on every request (`lightningcss.android-arm64.node` refused by dlopen).
- `npm run build` — same blocker, never completes.
- Any operation requiring native Node addons.

### What's untested (your job)

- `npm run dev` anywhere.
- Session Log viewer (`app/page.tsx`) rendering in a browser.
- `/api/commits` API route.
- CHANGELOG parser correctness against real entries.
- `npm run build` producing a valid production bundle.

---

## Arrival steps (do these in order inside proot Ubuntu)

1. Confirm git identity:
   ```bash
   git config --global user.name
   git config --global user.email
   ```
   If empty, set them:
   ```bash
   git config --global user.name "Eyal Nof"
   git config --global user.email "verbalogic.project@gmail.com"
   ```

2. Clone fresh (any location; `~/shared-brain` is a fine default inside proot's home):
   ```bash
   cd ~
   git clone https://github.com/Eyalio84/Shared-brain.git
   cd Shared-brain
   ```

3. Install (plain — no Termux flags on real Linux):
   ```bash
   npm install
   ```

4. Run the dev server:
   ```bash
   npm run dev
   ```
   Leave it running; open a second terminal for validation.

5. Validate in the second terminal:
   ```bash
   curl -s -w "\nHTTP %{http_code}\n" http://localhost:3000/ | tail -5
   curl -s http://localhost:3000/api/commits
   ```
   - `/` should return HTTP 200 and HTML containing "Shared Brain" plus both CHANGELOG entries (each with a green "done" state badge).
   - `/api/commits` should return JSON with `commits: [...]`.

6. Open a browser at `http://localhost:3000/` and visually confirm the timeline renders: two cards, green badges, the "What changed" bullet lists are legible, backticks in the entries render as `<code>` pills.

7. If the UI looks right, run:
   ```bash
   ./scripts/smoke.sh
   ```
   This runs typecheck AND the production build (Termux was skipping build; proot runs it).

8. If smoke passes, tell the user the validation succeeded. The user will say **"update docs"** to trigger the session-end ritual.

---

## Decisions already locked — do not relitigate

- **`AGENTS.md` is the single source of truth.** `CLAUDE.md` is `@AGENTS.md`; `GEMINI.md` is an explicit pointer. Don't edit the pointer files for instruction changes.
- **Git is the sync substrate.** Not Syncthing, not filesystem mount. Every session boundary is one or more commits. Push at session end is critical.
- **CHANGELOG schema has 6 mandatory fields** (AI, Machine, State, Commits, What changed, Why, Next, Open questions). Don't invent new fields in this session.
- **`State: in-flight` is an advisory lock.** If you see the latest entry marked in-flight, ask the user before starting new work.
- **`--webpack` flag** in `package.json` is permanent — Turbopack is unreliable on arm64 generally, even in proot.
- **Termux is edit-only.** Don't try to make it run the app. See `docs/DECISIONS.md`.

---

## User preferences (from the prior session)

Pulled from the prior conversation (not in any file):
- User prefers direct analysis with real pushback over validation. Sycophancy wastes turns.
- User wants learning-mode code contribution opportunities flagged explicitly — 5-10 lines of meaningful decisions, not boilerplate.
- User has deep domain expertise in context management (authored the `.ctx` format and SCE). Frame AI-handoff decisions as peer-to-peer, not tutorial.
- User's Android/Termux setup is nontrivial and intentional; don't suggest "just move everything to Linux" as a default answer.

---

## Open questions this session should resolve

1. **Does `npm run dev` actually render the viewer correctly?** First real UI validation of the schema + parser + styling.
2. **Is `HANDOFF.md` one-shot or template?** If it's useful for future transitions (laptop↔PC, Claude↔Gemini swap, etc.), formalize it in `AGENTS.md`. If it's a one-time bridge, delete it after this session and document the pattern of "write a rich CHANGELOG entry at session end" as sufficient.
3. **Should `Next:` be mandatory when `State: done`?** Carried forward from the bootstrap entry — still unresolved.
4. **Does Turbopack actually work on proot Ubuntu arm64?** (Optional experiment. If yes, we could offer it as an opt-in.)

---

## When you're done

1. Append a new entry to `CHANGELOG.md` per the schema in `AGENTS.md`.
2. If this file served its purpose and the one-shot hypothesis holds: `git rm HANDOFF.md` and commit with `chore: remove one-shot handoff after proot migration validated`.
3. `git push`.
4. Report the validation result to the user in 2-3 sentences.
