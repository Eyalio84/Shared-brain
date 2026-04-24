# Shared Brain

A two-agent command center prototype. Clone on any machine (Android/Termux, laptop, PC), run either Claude Code or Gemini CLI against it, and resume work where the other agent left off. State is synchronized via git.

The app in this repo is a **Session Log viewer** — it reads `CHANGELOG.md` and `git log` and renders them as a timeline. It exists to test the workflow, not to be a product.

## Stack

Next.js 16 (App Router, webpack mode) · React 19 · Tailwind v4 · TypeScript 5.

## Run locally

```bash
# On proot Ubuntu / macOS / Linux / Windows:
npm install
npm run dev      # http://localhost:3000
npm run build
npm start

# On Termux (edit + typecheck only — cannot run the app):
npm install --no-bin-links --ignore-scripts
node ./node_modules/typescript/bin/tsc --noEmit
```

**Platform notes:**
- **Termux (Android) is edit-only.** Android's dynamic linker refuses to load native `.node` modules from `/storage/emulated/`, so `npm run dev` and `npm run build` cannot work there. Use Termux to write code, run typecheck, commit, and push. Run the app in proot Ubuntu (same device, different namespace) or on laptop/PC. See `docs/DECISIONS.md`.
- **Turbopack is off** — the `--webpack` flag is explicit in `package.json` because Turbopack is unreliable on arm64.
- **Install flags on Termux** — `--no-bin-links` (FUSE has no symlinks), `--ignore-scripts` (postinstall scripts that use `.bin/` binaries fail without symlinks).

## For agents (Claude / Gemini / others)

Read `AGENTS.md` before doing anything. It covers the session protocol, the CHANGELOG schema, and the turn-taking rule that keeps two agents from stepping on each other.

## Where things are

| File | Role |
|---|---|
| `AGENTS.md` | Shared agent instructions (session protocol, conventions). |
| `CHANGELOG.md` | Session-by-session narrative log. |
| `docs/ARCHITECTURE.md` | File tree + module table. |
| `docs/DECISIONS.md` | Non-obvious technical choices and why. |
| `app/page.tsx` | The Session Log viewer. |
| `scripts/smoke.sh` | Typecheck + build sanity. |

## License

Proprietary — personal project.
