# Architecture

## File tree

```
shared-brain/
├── AGENTS.md              Shared agent instructions
├── CLAUDE.md              → AGENTS.md (Claude Code import)
├── GEMINI.md              → AGENTS.md (explicit pointer)
├── CHANGELOG.md           Session-by-session log
├── README.md              Human-facing overview
├── app/
│   ├── layout.tsx         Root layout, fonts, metadata
│   ├── page.tsx           Session Log viewer — reads CHANGELOG.md
│   ├── globals.css        Tailwind base + tokens
│   └── api/
│       └── commits/
│           └── route.ts   GET /api/commits → recent git log as JSON
├── docs/
│   ├── ARCHITECTURE.md    This file
│   ├── DECISIONS.md       Rationale log
│   └── PROPOSALS/         Future upgrade designs
│       ├── COMMAND_CENTER_PHASE_1.md
│       └── COMMAND_CENTER_PHASE_1_OPUS_REVIEW.md
├── scripts/
│   └── smoke.sh           Typecheck + build sanity
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
| `app/page.tsx` | Session Log viewer. Reads `CHANGELOG.md` from disk, parses entries, renders timeline. | Server component; uses `node:fs` directly. Runtime: nodejs. |
| `app/api/commits/route.ts` | Returns the last 20 commits as JSON. | Shells out to `git log` via a Node child process. Node runtime. Dynamic (no caching). |
| `app/globals.css` | Tailwind v4 base + project tokens. | Tailwind v4 uses `@import "tailwindcss";` — no separate config file unless overrides needed. |
| `docs/PROPOSALS/` | Design documents for major feature upgrades. | Active proposal: Command Center Phase 1. |

## Data flow

The Session Log viewer is read-only:

```
CHANGELOG.md  →  app/page.tsx (fs.readFileSync)  →  parseChangelog()  →  rendered timeline
git log       →  app/api/commits (git child process)  →  JSON response  →  (future: client fetch)
```

No database. No client-side state. Refreshing the page re-reads the files.

## Build + deploy

Local only for now. Intended to eventually run as a persistent service on the future PC build (always-on host for the private network). No deployment pipeline in this phase.

## Known constraints

- **Termux / arm64:** Turbopack crashes. `next dev --webpack` is the only reliable option. Do not remove the flag from `package.json`.
- **Android FUSE filesystem** (`/storage/emulated/0/`):
  - No symlink support. `npm install` fails without `--no-bin-links`. Tool binaries can't be invoked via `./node_modules/.bin/<tool>` — use `node ./node_modules/<pkg>/bin/<binary>`.
  - No `dlopen` of shared libraries. Native `.node` Node addons fail to load even when the file is present (Android security policy refuses to map executable memory from external storage). Affects `lightningcss`, `sharp`, any compiled addon.
  - Occasional phantom directory entries that `ls` shows but cannot be opened. Harmless.
- **Termux scope:** edit + typecheck + commit + push only. Runtime (`npm run dev` / `build`) is delegated to proot Ubuntu (same device, native ext4 fs) or laptop/PC. See `docs/DECISIONS.md`.
- **Proot Ubuntu networkInterfaces quirk:** `next dev` crashes with `uv_interface_addresses: Unknown system error 13` unless an explicit hostname is passed. The `dev` script in `package.json` has `-H localhost` baked in as the fix. Harmless on laptop/PC. Details in `docs/DECISIONS.md`.
- **Nested git repos:** `/storage/emulated/0/Download/claude-projects/` is itself a git repo pointing to an unrelated project. This repo lives inside it. Git handles the nesting correctly (child repo is opaque to parent), but `git status` in the parent will show `shared-brain/` as untracked.
