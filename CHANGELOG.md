# Changelog

Session-by-session narrative log for Shared Brain. Newest entry on top.

Every session (Claude, Gemini, any agent) appends an entry here at session end, following the schema in `AGENTS.md`.

`git log` is the *what* (immutable, machine-readable). This file is the *why* and the handoff instructions.

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
