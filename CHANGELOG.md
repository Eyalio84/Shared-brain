# Changelog

Session-by-session narrative log for Shared Brain. Newest entry on top.

Every session (Claude, Gemini, any agent) appends an entry here at session end, following the schema in `AGENTS.md`.

`git log` is the *what* (immutable, machine-readable). This file is the *why* and the handoff instructions.

---

## 2026-04-24 21:00 — Command Center Phase 4: Env + Architecture widgets + mtime cache

**AI:** Claude
**Machine:** proot Ubuntu (Android)
**State:** done
**Commits:** 805b726 (feat), {changelog}

**What changed:**
- `app/lib/cache.ts` — NEW. `cachedFileParse(path, parser)` — module-level `Map<path, {mtimeMs, value}>`. Parses once, re-parses only when the file's mtime changes. Missing files pass an empty string to the parser (keeps `parseTodos` / `parseBriefs` / etc. returning empty arrays). Process-scoped lifetime; no TTL.
- `app/lib/env.ts` — NEW. `detectEnv()` returns `{ machine, label, capabilities[] }`. Detection order: Termux (via `$PREFIX` containing `com.termux`), then proot Ubuntu (via `uname -a` containing `PRoot-Distro`), else `process.platform` → laptop/PC. Each case ships a 5-row capability matrix mirroring the AGENTS.md platform-scope table (edit / typecheck / npm install / dev / build). Memoised per process.
- `app/lib/architecture.ts` — NEW. `parseModuleTable(md)` extracts the `## Module table` section of `docs/ARCHITECTURE.md` into typed `ModuleRow[]`. Routed through `cache.ts`. Skips the header and separator rows; strips surrounding backticks from the path cell.
- `app/lib/todo.ts` + `app/lib/briefs.ts` — refactored to route their file reads through `cachedFileParse`. External API unchanged. `briefs.ts` now exports `parseBriefs` as a pure function separate from `loadBriefs`, matching `todo.ts`'s shape.
- `app/page.tsx` — CHANGELOG read migrated to the cache. Two new Bento widgets appended as a final row: `Environment` (`lg:col-span-4`) showing the machine label + capability dots (emerald yes, red no, amber conditional) + per-capability notes in mono, and `Architecture` (`lg:col-span-8`) rendering each module-table row with path in mono, role below, notable in italic. Inline `CapabilityRow` + `ModuleTableRow` helper components.
- `docs/ARCHITECTURE.md` — file tree and module table updated for the three new lib files; data-flow diagram redrawn to show all reads funnelling through the cache.
- `docs/DECISIONS.md` — added an entry explaining the module-level mtime cache: why it's the right scope, what was rejected (Next `unstable_cache`, git `post-commit` hook JSON, TTL-based expiry, no caching).
- `TODO.md` — both `@claude` Phase-4 items closed via `./scripts/todo-done` (dogfood).

**Why:** Phase 4 of the alternating plan. Environment Health dogfoods the very platform-scope table we've been maintaining in AGENTS.md — glance at the dashboard, immediately know whether this machine can run `dev` or is edit-only. Architecture Snapshot turns the module table into a live view so new contributors (human or agent) can browse the repo's structure without opening a second file. The mtime cache was queued as a latent performance tidy but lands naturally here: all four markdown-reading paths share one invalidation mechanism, and the CLI scripts' existing edit-then-mtime-bump flow triggers re-parse for free on the next request.

**Next:** Phase 5 (@gemini) — visual polish. Typography scale, semantic color palette, mobile-first review (Termux browser is a first-class viewport), dark-mode pass if anything drifted. The widgets are in place; Phase 5 is about tightening the visual vocabulary across all of them.

**Open questions:**
- Still open: `Next:` mandatory when `State: done`? (Carried, no decision this session.)
- Resolved in this session: mtime cache is sufficient for scalability — no need for the `post-commit` JSON-manifest option from the Opus review. Revisit only if filtering / server-side search ever needs precomputed data.
- Minor: `detectEnv()` caches once per process. If the env ever matters mid-lifetime (e.g. moving the working directory mid-session), refresh. No known case today.

---

## 2026-04-24 20:00 — Command Center Phase 3: Briefing Board + Markdown improvements

**AI:** Gemini
**Machine:** Termux (Android)
**State:** done
**Commits:** 17ab139

**What changed:**
- `docs/BRIEFS.md` — NEW file for high-level steering and persistent instructions.
- `app/lib/briefs.ts` — NEW parser for the briefs file.
- `app/page.tsx` — Replaced Phase-3 placeholder with a real Briefing Board widget. Updated `InlineMarkdown` to support **bold** and `[links]`.
- `TODO.md` — Marked Phase 3 task as completed via `scripts/todo-done`.

**Why:** Completion of Phase 3. This adds a dedicated surface for "pinned" project goals, separate from the transient session history. Improving markdown support ensures these briefs (and future logs) can be more expressive.

**Next:** Phase 4 (Claude) — Environment Health widget + Architecture Snapshot + mtime cache layer.

---

## 2026-04-24 19:30 — Command Center Phase 2: TODO.md parser + Task Board + CLI

**AI:** Claude
**Machine:** proot Ubuntu (Android)
**State:** done
**Commits:** 9881984 (feat), 2b397f1 (changelog)

**What changed:**
- `app/lib/todo.ts` — NEW server-only parser. Exports `parseTodos`, `sortActive`, `loadTodos` and the `Todo` type. Regex captures the checkbox + parens-group + title + optional `— ref:`. Inside the parens, tokens are classified at parse time (priority / owner / ISO date) so tag order is irrelevant.
- `app/page.tsx` — Task Board widget replaces Gemini's Phase-2 placeholder in the `lg:col-span-4` bento slot. Inline `TaskRow` + `PriorityBadge` components. Shows the top 6 active tasks sorted by priority, with an `N active / M done` counter and `+ X more in TODO.md` overflow indicator.
- `scripts/todo-add` — NEW. `todo-add <P1|P2|P3> <@owner> "<title>" [ref]` appends a task under `## Active Tasks` via awk.
- `scripts/todo-done` — NEW. `todo-done "<substring>"` flips the first matching unchecked task to `[x]` and injects today's date into the parens group. Uses awk for matching (grep BRE + bash double-quote escaping mangles `[ ]`) and `sed` for the bracket flip (bash `${var/[ ]/…}` treats brackets as a glob char class). Also renamed an internal variable away from `LINENO` (bash's read-only built-in line-number).
- `AGENTS.md` — NEW "Task management — TODO.md" section documents the inline-tag schema and the two scripts. File-layout table extended with `TODO.md`, `app/lib/todo.ts`, `scripts/todo-add`, `scripts/todo-done`.
- `docs/ARCHITECTURE.md` — file tree, module table, and data-flow diagram now reflect the Task Board path and TODO.md parser.
- `TODO.md` — dogfooded. The two `@claude` Phase-2 items plus Gemini's three `@gemini` Phase-1 items moved to `## Completed Tasks` (Phase 1 shipped and validated). Added Phase 3/4/5 forward-looking items per the alternating plan.
- `scripts/smoke.sh` — promoted to `100755` in the git index (clone lost the mode bit).

**Why:** Phase 2 of the Command Center plan. Converts the TODO.md file Gemini created in Phase 1 into a first-class interactive surface — parsed by the server, rendered in the bento grid, mutated by CLI scripts rather than UI actions. This preserves the project rule that the UI reflects git state and is never an authority over it: a todo is "done" when TODO.md in git says so, not when a button is clicked. Dogfooded by completing the two Phase-2 tasks and cleaning up orphaned Phase-1 items (@gemini) that had shipped but weren't marked done.

**Bugs surfaced and fixed in-session:**
1. `${ORIGINAL/- [ ]/- [x]}` — bash parameter substitution treats `[ ]` as a glob character class, not a literal. Swapped for `sed`.
2. `LINENO=…` assignment silently no-op'd (bash built-in read-only); awk was rewriting the wrong line. Renamed to `MATCH_LINE`.
3. `grep -in "^- \[ \].*${QUERY}"` inside double quotes — bash strips the backslashes before grep sees them, turning `\[ \]` into `[ ]` (a BRE character class matching a single space). Rewrote the match in awk where the regex grammar is stable across environments.

**Next:** Phase 3 (@gemini) — create `docs/BRIEFS.md` + Briefing Board widget (full-width bento row replacing the existing Phase-3 placeholder). Plus the "mid-handoff" mode that promotes an `in-flight` CHANGELOG body into the Pulse zone — Gemini already partially landed this in Phase 1 when they added the amber "Handoff Note" panel, so Phase 3 is mostly the Briefs side. The `@claude` Phase-4 items (Environment Health + Architecture Snapshot + mtime cache) are queued in TODO.md.

**Open questions:**
- Still open: `Next:` mandatory when `State: done`? (Carried; no decision this session.)
- New/minor: the `todo-done` matching is case-insensitive substring against the full task line. That's "good enough" for current size but has no unique-id; if two P3 tasks with similar wording exist, the first one wins and the user sees a stderr note. If this bites, add an `--id N` flag that takes the line number straight from the `+ X more` preview. Defer until it bites.

---

## 2026-04-24 18:00 — Command Center Phase 1 implemented: Bento Shell + Pulse + Git Monitor

**AI:** Gemini
**Machine:** Termux (Android)
**State:** done
**Commits:** d98244c

**What changed:**
- `app/page.tsx` — Replaced linear list with a Bento Grid shell. Added "Pulse" and "Git Monitor" widgets.
- `TODO.md` — NEW file for task tracking with inline-tag schema.
- `docs/PROPOSALS/COMMAND_CENTER_PHASE_1.md` — Updated status to "In Progress (Phase 1 Complete)".

**Why:** To transition the app from a passive log viewer to an active Command Center. The Bento Grid provides a structured surface for multiple widgets, and the Pulse/Git Monitor give immediate visibility into the project's health and sync status.

**Next:** Phase 2 (Claude) — Implement `TODO.md` parser, Task Board widget, and CLI scripts for task management.

---

## 2026-04-24 17:30 — Opus review of Command Center Phase 1 + phased plan

**AI:** Claude
**Machine:** proot Ubuntu (Android)
**State:** done
**Commits:** f687138 (review), fcec4ec (changelog)

**What changed:**
- `docs/PROPOSALS/COMMAND_CENTER_PHASE_1_OPUS_REVIEW.md` — NEW. Response to Gemini's "Call for Analysis". Covers: positioning (agree/push-back), answers to the three scalability/interactivity/visuals questions, five additional enhancements (notably a TODO.md inline-tag schema and a `scripts/status.sh` CLI), and a six-phase alternating plan (G/C/G/C/G/C).
- `docs/ARCHITECTURE.md` — file tree updated to list both proposal documents under `docs/PROPOSALS/`.

**Why:** The hybrid-plan process Gemini defined requires a second perspective before scope is locked. This review pushes back on Agent Graffiti (redundant with in-flight CHANGELOG body) and on Phase-1-as-twelve-features (too large; deferred Session Playback and Architecture Explorer). Affirms TODO.md + Task Board as highest-leverage pillar. Proposes a phased plan where each phase ships standalone, neither agent blocks the next, and the project remains functional if stopped at any phase.

**Next:** Gemini begins Phase 1: Bento grid shell + Pulse strip + Conflict Monitor + empty `TODO.md` with schema header. Hand-off lock: before Gemini writes `TODO.md`, align on the inline-tag schema in enhancement #1 of the review — parseable by one regex, avoids a Phase 2 clash.

**Open questions:**
- Still open: should `Next:` be mandatory when `State: done`? (Carried.)
- New: where does `TODO.md` live — repo root or `docs/TODO.md`? Root is more discoverable; `docs/` keeps meta-files colocated. Gemini to pick in Phase 1.

---

## 2026-04-24 17:00 — Command Center Phase 1 proposal drafted

**AI:** Gemini
**Machine:** Termux (Android)
**State:** done
**Commits:** 04936c4

**What changed:**
- `docs/PROPOSALS/COMMAND_CENTER_PHASE_1.md` — NEW proposal for Command Center transformation.
- `docs/ARCHITECTURE.md` — updated file tree and module table to include proposals.

**Why:** The project is evolving from a passive log viewer to an active command center. This proposal outlines the vision for a Bento-grid dashboard, structured todos, messaging boards, and collaborative architecture explorers. It includes a "Call for Analysis" to solicit feedback from other agents (Opus).

**Next:** Wait for user to provide Opus's response, then merge suggestions into a unified hybrid upgrade plan.

---

## 2026-04-24 16:30 — Proot Ubuntu validated; two runtime quirks fixed

**AI:** Claude
**Machine:** proot Ubuntu (Android, same device as Termux)
**State:** done
**Commits:** 06be461 (session close)

**What changed:**
- `package.json` — added `-H localhost` to the `dev` script. Without it, `next dev` crashes on proot with `uv_interface_addresses: Unknown system error 13` (EACCES on `os.networkInterfaces()`). With an explicit hostname, Next skips that lookup path entirely (see `next/dist/server/lib/start-server.js:289` — `hostname ?? getNetworkHost(...)`). Harmless on laptop/PC.
- `scripts/smoke.sh` — replaced the Termux-detection test. Old: `[ -d /data/data/com.termux ] && [ -z "$PROOT_ROOT" ]`. That failed in proot because (a) the termux directory is visible through proot's shared mount, and (b) proot-distro doesn't export `PROOT_ROOT`. New test: `[[ "${PREFIX:-}" == *com.termux* ]]`. `$PREFIX` is Termux's canonical marker and is unset inside the proot chroot.
- `package-lock.json` — npm on proot stripped `"libc"` arrays from optional-dep entries (added by Termux's npm). Normal cross-environment churn; committed so it doesn't re-churn next install.
- `HANDOFF.md` — deleted. Served its purpose as a one-shot Termux→proot bridge. A well-written CHANGELOG entry is sufficient for future inter-machine transitions; no reusable template needed.
- `docs/DECISIONS.md` — added an entry on the two proot runtime quirks and why we picked these fixes.
- `docs/ARCHITECTURE.md` — "Known constraints" now mentions the proot `networkInterfaces` quirk.

**Why:** The prior session declared proot Ubuntu the runtime home but couldn't validate it. This session validated end-to-end: fresh clone into `/root/Shared-brain`, plain `npm install` (360 packages, 0 vulns), `npm run dev` serves HTTP 200 on `/` and `/api/commits`, `npm run build` completes cleanly (Tailwind v4 `lightningcss` loads fine — confirming the dlopen wall is a FUSE-storage thing, not Android-wide). Two real bugs surfaced and got fixed in-session: the proot `uv_interface_addresses` EACCES and the stale Termux-detection heuristic. Both fixes are minimal and platform-agnostic.

**Next:** n/a — complete. Proot runtime path is validated. Next session can land on any machine and follow the standard Session START ritual.

**Open questions:**
- Still open: should `Next:` be mandatory when `State: done`? (Carried from bootstrap. Lean toward "yes, even if just 'n/a — complete'" — gives future agents one fewer field to guess about.)
- Resolved: HANDOFF.md-as-template hypothesis — rejected. CHANGELOG entries are the handoff; no separate template file needed.

---

## 2026-04-24 14:00 — Platform scope decided; handoff to proot Ubuntu

**AI:** Claude
**Machine:** Termux (Android)
**State:** done
**Commits:** d4f5c0c (bootstrap), c1dbdf2 (session close)

**What changed:**
- `package.json` — reverted scripts to plain `next dev --webpack` / `next build --webpack`. The `node ./node_modules/next/dist/bin/next ...` form was a Termux-symlink workaround; no environment that actually runs the app needs it.
- `AGENTS.md` — added "Platform scope" section with a per-machine capability table. Termux declared edit-only.
- `docs/DECISIONS.md` — added the dlopen finding and the rationale for proot Ubuntu over (a) moving the project or (c) stripping Tailwind v4.
- `docs/ARCHITECTURE.md` — expanded "Known constraints" with the dlopen note.
- `scripts/smoke.sh` — detects Termux and skips `npm run build` with a clear message; typecheck runs on all platforms.
- `README.md` — platform notes rewritten; Termux labeled edit-only; install flags explained.
- `HANDOFF.md` — NEW, temporary. Explicit context package for the next AI landing in proot Ubuntu. Deletes after successful validation (see its footer).

**Why:** Android's dynamic linker refuses to `dlopen` native `.node` libraries from `/storage/emulated/`. Our stack's `lightningcss` native module is unavoidable (Tailwind v4). Every `npm run dev` request returned 500. This is OS-level, not fixable via flags. User chose proot Ubuntu (same device, native ext4 namespace) over moving the project or downgrading the stack. Git remains the sync substrate — proot clones fresh from the same remote and runs normally.

**Next:** In proot Ubuntu, follow `HANDOFF.md` step-by-step: clone, `npm install` (plain), `npm run dev`, verify the Session Log viewer renders both CHANGELOG entries with state badges, verify `/api/commits` returns JSON. If both work, run `npm run build` to confirm production bundle. Then say "update docs" to record the validation and delete `HANDOFF.md`.

**Open questions:**
- Does the Session Log viewer actually render? First real UI validation — schema + parser correctness both ride on this.
- Should `HANDOFF.md` become a reusable template for future inter-machine transitions (e.g., laptop→PC, Claude→Gemini), or is it genuinely one-shot for this specific Termux→proot bridge?
- Carried forward: should `Next:` be mandatory when `State: done`?

---

## 2026-04-23 15:10 — Project bootstrap + Session Log viewer scaffold

**AI:** Claude
**Machine:** Termux (Android)
**State:** done
**Commits:** (initial commit — pending)

**What changed:**
- `package.json` — added `--webpack` flag to `dev` and `build` scripts (Termux/arm64 constraint).
- `AGENTS.md` — expanded from Next 16 stub into full shared agent instructions. Documents session protocol, CHANGELOG schema, turn-taking rule.
- `CLAUDE.md` — kept as Next 16 auto-generated `@AGENTS.md` import.
- `GEMINI.md` — added as thin pointer to `AGENTS.md` (explicit prose, not `@` import, for Gemini CLI compatibility).
- `README.md` — replaced default Next.js README with project-specific overview.
- `docs/ARCHITECTURE.md` — file tree, module table, data flow for the Session Log viewer.
- `docs/DECISIONS.md` — rationale for AGENTS.md-as-SSOT, git-only sync, `in-flight` state field, `--webpack` flag.
- `CHANGELOG.md` — this file, initial entry.
- `scripts/smoke.sh` — typecheck + build sanity check.
- `app/page.tsx` — replaced default splash with Session Log viewer. Reads `CHANGELOG.md` via `node:fs`, parses entries, renders timeline with state badges.
- `app/api/commits/route.ts` — GET endpoint, shells out to `git log --oneline -20`, returns JSON.
- `app/layout.tsx` — updated metadata (title, description).

**Why:** First session establishes the rails. The protocol documented in `AGENTS.md` is now load-bearing — every future session depends on the schema and fields defined here. The viewer app is deliberately minimal: it reads the same files agents write, so dog-fooding reveals schema brittleness fast.

**Next:** User reviews the build in the browser, validates the schema by reading the viewer's rendering of this very entry. First handoff to Gemini CLI (on laptop) should follow the standard Session START ritual: `git pull`, read this entry, then proceed.

**Open questions:**
- Should `Next:` be mandatory when `State: done`? Currently allowed to be "n/a — complete". Leaving flexible until we see how it feels in practice.
- Should `Open questions` survive across entries (rolled forward until resolved), or does each entry stand alone? Currently each entry stands alone.

**Platform quirks encountered during bootstrap:**
- `npm install` without `--no-bin-links` failed (EACCES on symlinks) — documented in `README.md` and `AGENTS.md`.
- `npx tsc` pulls a wrong package from registry; direct node invocation (`node ./node_modules/typescript/bin/tsc`) is the safe form on any platform.
- `create-next-app` skipped `git init` because parent `claude-projects/` is already a git repo. Required explicit `git init -b main`.
