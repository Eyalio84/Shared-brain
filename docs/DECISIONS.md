# Decisions

Log of non-obvious technical choices. Each entry: what, why, what was rejected. Newest on top.

---

## 2026-04-24 — Termux is edit-only; runtime goes to proot Ubuntu or laptop

**Picked:** Treat Termux as an edit + typecheck + commit + push environment. Never run `npm run dev` / `npm run build` on it. Runtime validation happens in proot Ubuntu (same device, different namespace) or on laptop/PC.

**Why:** Android's dynamic linker enforces an OS-level policy: shared libraries (`.so` / `.node`) cannot be `dlopen`-ed from `/storage/emulated/`. The error: `dlopen failed: library ... is not accessible for the namespace "(default)"`. This affects *any* native Node addon — lightningcss (mandatory in our Tailwind v4 stack), sharp, better-sqlite3, etc. It's not a permissions issue and not fixable via flags.

Proot Ubuntu is a full Linux userland rooted on Termux's native ext4 filesystem. `dlopen` works normally there. So the same device can be both editing station (Termux) and runtime host (proot Ubuntu) — via two different process contexts talking to the same git remote.

**Rejected:**
- **Move project into Termux native home** (`~/shared-brain/`) — would work, but the user explicitly wanted `/storage/emulated/0/Download/claude-projects/` as the editing location (Android file-manager visibility). Moving breaks that.
- **Strip Tailwind v4 for Tailwind v3 or vanilla CSS** — eliminates *one* native dep but creates a precedent of avoiding native modules for platform reasons. Tomorrow sharp, then better-sqlite3, etc. Stack downgrade for an unfixable root cause.
- **Mount tricks (bind mount, symlink workarounds)** — brittle and each has its own Android SELinux edge cases.

---

## 2026-04-23 — AGENTS.md as single source of truth (over parallel CLAUDE.md + GEMINI.md)

**Picked:** Put all shared agent instructions in `AGENTS.md`. `CLAUDE.md` and `GEMINI.md` are thin pointers.

**Why:** Two parallel instruction files drift. Next 16 ships with this pattern already — `create-next-app` auto-generates `AGENTS.md` + a `CLAUDE.md` that is literally `@AGENTS.md`. The `AGENTS.md` convention is emerging across AI dev tools (Claude, Codex, Cursor, Gemini). Riding the convention beats inventing one.

**Rejected:**
- **Parallel files with duplicated content** — drift risk, double-maintenance cost.
- **A `docs/SESSION-PROTOCOL.md` imported by both** — adds an unnecessary indirection layer.

---

## 2026-04-23 — Git-only synchronization (over Syncthing or SMB mount)

**Picked:** A GitHub private remote is the sync substrate. Each machine keeps its own clone and pulls/pushes between sessions.

**Why:**
- Termux/Android cannot mount SMB/NFS without root — rules out filesystem-level sync on the primary dev machine.
- Syncthing works but introduces realtime file sync that fights with git's commit model (conflicts, partial writes, no version history).
- Git gives free version history, conflict detection, and a built-in "session boundary" via commits.
- Works identically across Android / macOS / Linux / Windows with no OS-specific tooling.

**Rejected:**
- **Syncthing / Dropbox / Google Drive** — realtime sync fights with git; more conflicts, no version history.
- **SMB / NFS mount** — Termux can't mount these without root.
- **Self-hosted Gitea from day one** — premature. GitHub private is zero setup; migrating the remote later is one command (`git remote set-url`).

---

## 2026-04-23 — `State: in-flight` field in CHANGELOG as advisory lock

**Picked:** Every CHANGELOG entry declares `State: done | in-flight`. Agents check this on session start and refuse to begin new work if the latest entry is in-flight.

**Why:** Traditional changelogs are append-only logs of completed work. Two-agent handoff also has to represent *incomplete* work — otherwise the next agent can't tell "last session finished cleanly" from "last session stopped mid-refactor." The user is the ultimate lock (they coordinate turns), but this field makes the state machine visible to the agents themselves.

**Rejected:**
- **A separate LOCK file** — more state to synchronize, more ways to get out of sync with the narrative.
- **Inferring state from commit presence** — committed code can still be in-flight if the feature is incomplete.

---

## 2026-04-23 — `--webpack` flag in package.json scripts (over environment variable)

**Picked:** Explicit `next dev --webpack` and `next build --webpack` in `package.json` scripts.

**Why:** Next 16 defaults to Turbopack. Turbopack segfaults on Termux/arm64. The `--webpack` flag is the supported opt-out. Explicit in scripts so no developer accidentally runs turbopack mode by cloning on a fresh machine.

**Rejected:**
- **Environment variable override** — less visible, easier to misconfigure on a new clone.
- **Branch per platform** — branching on platform is an anti-pattern; the flag is platform-agnostic.
