# Decisions

Log of non-obvious technical choices. Each entry: what, why, what was rejected. Newest on top.

---

## 2026-04-24 — Proot runtime quirks: bake `-H localhost`; detect Termux via `$PREFIX`

**Picked (1):** Bake `-H localhost` into the `dev` script in `package.json`. `package.json` is the one copy of the command shared across every machine, and the flag is harmless outside proot.

**Why:** In proot Ubuntu, `next dev` with no explicit host crashes at startup on `os.networkInterfaces()` with `errno 13 / Unknown system error 13` (EACCES on `uv_interface_addresses`). Proot's seccomp/netlink sandbox denies the interface enumeration that Next uses to print the "Network:" banner URL. Next's own code (`start-server.js:289`) short-circuits the lookup when an explicit hostname is passed: `hostname ?? getNetworkHost(...)`. The `-H localhost` flag turns that into a no-op. On laptop/PC the flag just restricts dev-server binding to loopback, which is what most developers want anyway — no exposure on LAN by default.

**Rejected:**
- **Platform-detect at runtime and add `-H` only in proot** — more code, more ways to break, and the flag is harmless everywhere.
- **Catch the rejection globally via `process.on('unhandledRejection', ...)`** — masks the error but doesn't fix the broken startup path; the banner code still throws.
- **Patch `get-network-host.js` locally** — modifying `node_modules` is not survivable across reinstalls.

**Picked (2):** Detect Termux in `scripts/smoke.sh` by testing whether `$PREFIX` contains `com.termux`, not by checking for `/data/data/com.termux` existence.

**Why:** The old test (`[ -d /data/data/com.termux ] && [ -z "$PROOT_ROOT" ]`) returned true inside proot Ubuntu: proot-distro bind-mounts the Termux app directory (shared `/data/data/com.termux` namespace) and does not export `PROOT_ROOT`. So smoke skipped the build step on proot — the exact environment where build is supposed to run. `$PREFIX` is Termux's canonical env var (`/data/data/com.termux/files/usr`) set in its shell init; proot-distro enters a fresh chroot where `$PREFIX` is unset. That makes it a reliable "am I *actually* running as a Termux process" test.

**Rejected:**
- **`uname -a` contains `PRoot-Distro`** — inverted signal (detect non-Termux instead of Termux), fragile against future proot-distro kernel naming changes.
- **Check `/etc/os-release`** — Termux has its own `/etc/os-release`; not distinctive enough.
- **Probe for `termux-info` binary in `$PATH`** — spawns a subprocess for every run; `$PREFIX` is a zero-cost string check.

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
