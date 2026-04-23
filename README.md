# Shared Brain

A two-agent command center prototype. Clone on any machine (Android/Termux, laptop, PC), run either Claude Code or Gemini CLI against it, and resume work where the other agent left off. State is synchronized via git.

The app in this repo is a **Session Log viewer** — it reads `CHANGELOG.md` and `git log` and renders them as a timeline. It exists to test the workflow, not to be a product.

## Stack

Next.js 16 (App Router, webpack mode) · React 19 · Tailwind v4 · TypeScript 5.

## Run locally

```bash
# On Termux/Android:
npm install --no-bin-links

# On macOS / Linux / Windows:
npm install

npm run dev      # http://localhost:3000
npm run build
npm start
```

**Platform notes:**
- `--webpack` flag in `package.json` scripts is deliberate — Turbopack is unsupported on Termux/arm64. On other platforms you can remove it to get Turbopack back.
- `--no-bin-links` is required on Android because `/storage/emulated/0/` is a FUSE filesystem that doesn't support symlinks. Skipping this flag causes the install to fail with EACCES on `node_modules/.bin/`. Not needed on laptop/PC.

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
