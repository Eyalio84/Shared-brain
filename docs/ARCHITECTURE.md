# Architecture

## File tree

```
shared-brain/
├── AGENTS.md              Shared agent instructions
├── CLAUDE.md              → AGENTS.md (Claude Code import)
├── GEMINI.md              → AGENTS.md (explicit pointer)
├── CHANGELOG.md           Session-by-session log
├── TODO.md                Canonical task list (parsed by UI Task Board)
├── README.md              Human-facing overview
├── app/
│   ├── layout.tsx         Root layout, fonts, metadata
│   ├── page.tsx           Command Center dashboard (Bento widgets)
│   ├── globals.css        Tailwind base + tokens
│   ├── lib/
│   │   ├── cache.ts       Generic mtime-based parse cache (server-only)
│   │   ├── todo.ts        TODO.md parser (server-only)
│   │   ├── briefs.ts      docs/BRIEFS.md parser (server-only)
│   │   ├── env.ts         Current-machine detector (Termux/proot/laptop)
│   │   └── architecture.ts  Module-table parser for ARCHITECTURE.md
│   └── api/
│       └── commits/
│           └── route.ts   GET /api/commits → recent git log as JSON
├── docs/
│   ├── ARCHITECTURE.md    This file
│   ├── DECISIONS.md       Rationale log
│   ├── BRIEFS.md          Persistent goals (parsed by UI Briefing Board)
│   └── PROPOSALS/         Future upgrade designs
│       ├── COMMAND_CENTER_PHASE_1.md
│       ├── COMMAND_CENTER_PHASE_1_OPUS_REVIEW.md
│       └── COMMAND_CENTER_PHASE_2.md
├── scripts/
│   ├── smoke.sh           Typecheck + build sanity
│   ├── todo-add           Append task to TODO.md
│   ├── todo-done          Flip first matching task to [x]
│   └── session-close      Session END automation (two-commit + push)
├── public/                Static assets (Next default)
├── next.config.ts
├── package.json
├── tsconfig.json
├── eslint.config.mjs
└── postcss.config.mjs
```

Regenerate with:
```bash
find . -maxdepth 3 -not -path './node_modules/*' -not -path './.next/*' -not -path './.git/*' | sort
```

## Module table

| Path | Role | Notable |
|---|---|---|
| `app/layout.tsx` | Root layout. Loads Geist fonts, sets metadata. | Server component. |
| `app/page.tsx` | Command Center dashboard. Renders Bento widgets: Pulse, Git Monitor, Task Board, Session Log, Briefing Board, Environment, Architecture. Reads `CHANGELOG.md` + `TODO.md` + `docs/BRIEFS.md` + `docs/ARCHITECTURE.md` + `git status` from disk. | Server component; all markdown reads go through `app/lib/cache.ts`. Runtime: nodejs. |
| `app/lib/cache.ts` | Generic mtime-based parse cache. `cachedFileParse(path, parser)` stats mtime, returns cached value if unchanged, reparses otherwise. | Module-level `Map`; process-scoped lifetime. No TTL — invalidation is entirely mtime-driven. |
| `app/lib/todo.ts` | Parses `TODO.md` inline-tag schema into typed `Todo` objects. | Routed through `cache.ts`. Exports `parseTodos`, `sortActive`, `loadTodos`. |
| `app/lib/briefs.ts` | Parses `docs/BRIEFS.md` into typed `Brief` objects. | Routed through `cache.ts`. |
| `app/lib/env.ts` | Detects the current machine (Termux / proot Ubuntu / laptop) and returns a capability matrix matching the AGENTS.md platform-scope table. | Memoised per process. Termux via `$PREFIX`, proot via `uname -a` containing `PRoot-Distro`, else `process.platform`. |
| `app/lib/architecture.ts` | Parses the `## Module table` section of `docs/ARCHITECTURE.md` into typed rows. | Routed through `cache.ts`. |
| `app/api/commits/route.ts` | Returns the last 20 commits as JSON. | Shells out to `git log` via a Node child process. Node runtime. Dynamic (no caching). |
| `app/globals.css` | Tailwind v4 base + project tokens. | Tailwind v4 uses `@import "tailwindcss";` — no separate config file unless overrides needed. |
| `docs/PROPOSALS/` | Design documents for major feature upgrades. | Active proposal: Command Center Phase 1. |

## Data flow

The dashboard is a read-only projection of repo state:

```
CHANGELOG.md         →  cache ─►  parseChangelog()     →  Pulse + Session Log
TODO.md              →  cache ─►  parseTodos()         →  Task Board
docs/BRIEFS.md       →  cache ─►  parseBriefs()        →  Briefing Board
docs/ARCHITECTURE.md →  cache ─►  parseModuleTable()   →  Architecture widget
runtime env          →  detectEnv() (memoised)         →  Environment widget
git status           →  getGitStatus() (execSync)      →  Git Monitor
git log              →  app/api/commits (child process) →  JSON → (future: client fetch)
```

All markdown reads go through `app/lib/cache.ts` — the parser runs once per mtime change, not per request. No database. No client-side state. Mutations to todos happen via `scripts/todo-add` / `scripts/todo-done`, which edit `TODO.md` in place — the UI reflects the change on next request (cache invalidates via mtime bump).

## Build + deploy

Local only for now. Intended to eventually run as a persistent service on the future PC build (always-on host for the private network). No deployment pipeline in this phase.

## Known constraints

- **Termux / arm64:** Turbopack crashes. `next dev --webpack` is the only reliable option. Do not remove the flag from `package.json`.
- **Android FUSE filesystem** (`/storage/emulated/0/`):
  - No symlink support. `npm install` fails without `--no-bin-links`. Tool binaries can't be invoked via `./node_modules/.bin/<tool>` — use `node ./node_modules/<pkg>/bin/<binary>`.
  - No `dlopen` of shared libraries. Native `.node` Node addons fail to load even when the file is present (Android security policy refuses to map executable memory from external storage). Affects `lightningcss`, `sharp`, any compiled addon.
  - Occasional phantom directory entries that `ls` shows but cannot be opened. Harmless.
- **Termux scope:** edit + typecheck + commit + push only. Runtime (`npm run dev` / `build`) is delegated to proot Ubuntu (same device, native x86_64/arm64 fs) or laptop/PC. See `docs/DECISIONS.md`.
- **Proot Ubuntu networkInterfaces quirk:** `next dev` crashes with `uv_interface_addresses: Unknown system error 13` unless an explicit hostname is passed. The `dev` script in `package.json` has `-H localhost` baked in as the fix. Harmless on laptop/PC. Details in `docs/DECISIONS.md`.
- **Nested git repos:** `/storage/emulated/0/Download/claude-projects/` is itself a git repo pointing to an unrelated project. This repo lives inside it. Git handles the nesting correctly (child repo is opaque to parent), but `git status` in the parent will show `shared-brain/` as untracked.
