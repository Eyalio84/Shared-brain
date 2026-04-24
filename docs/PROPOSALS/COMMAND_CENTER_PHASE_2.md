# Proposal: Command Center Phase 2

Phase 1 is complete. Time to frame what Phase 2 is.

## State of the union (Phase 1 done)

Seven widgets, three libs, three CLI scripts, and a polished visual vocabulary. All routed through a single mtime-based cache. The repo dogfoods its own workflow: the dashboard reads what agents write, and the alternating-phase plan produced a working product at every handoff point.

| Surface | What it is | Shipped in |
|---|---|---|
| Pulse strip | Latest agent/machine/goal + amber "Handoff Note" when in-flight | Phase 1 (Gemini) |
| Git Monitor | Branch + sync status + dirty flag | Phase 1 (Gemini) |
| Task Board | `TODO.md` parsed → priority-sorted, overflow counter | Phase 2 (Claude) |
| Session Log | `CHANGELOG.md` timeline with state badges | Phase 1 (Gemini) |
| Briefing Board | `docs/BRIEFS.md` pinned steering | Phase 3 (Gemini) |
| Environment | Machine detector + capability matrix | Phase 4 (Claude) |
| Architecture | Parsed `docs/ARCHITECTURE.md` module table | Phase 4 (Claude) |
| `scripts/todo-add`, `scripts/todo-done` | CLI for TODO mutation | Phase 2 (Claude) |
| `scripts/session-close` | Session END ritual automation | Phase 6 (Claude) |
| `scripts/smoke.sh` | Typecheck + build | Bootstrap |

## What Phase 2 is *not*

- **Not "polish Phase 1 again."** Phase 5 already did that; further polish is decoration without new capability.
- **Not Session Playback or Architecture Explorer.** Considered and deferred repeatedly — 16 commits and 7 modules aren't enough data to reward the UI lift. Revisit only when the repo outgrows the current size.
- **Not a redesign.** The read-only / git-as-authority invariant held through Phase 1 and should survive Phase 2 untouched.

## Candidate pillars for Phase 2

Three directions. Each is independently shippable; Phase 2 picks one or two, not all three.

### Pillar A — Live awareness (the dashboard gets eyes)

Right now, the page only updates on reload. Changes to CHANGELOG/TODO are invisible until someone hits F5.

- **Server-Sent Events (SSE) stream** when watched files change (use `fs.watch` on CHANGELOG/TODO/BRIEFS), client revalidates affected widgets.
- **"Last updated N seconds ago" affordance** so stale state is visible.
- **Toast on significant transitions** — `in-flight` → `done`, conflict monitor flipping, todo added by another agent.

### Pillar B — Session auditing (the dashboard grows memory)

Right now, the CHANGELOG is the only record of what agents did. It's narrative, written at session close — nothing captures the intermediate script invocations.

- **`scripts/*` emit a line to `.sessions/log.jsonl`** on each invocation (who, what, when). Not in git (add to `.gitignore`).
- **A "Session Activity" widget** showing the last N script runs.
- **Summary tile**: agent-split histogram (Claude vs Gemini time share), commits/day.
- **Signal value**: makes rhythm visible. "Are we alternating evenly? Are todos being checked off or just added?"

### Pillar C — Multi-project (the dashboard becomes a template)

Shared Brain's real product is the *workflow*. The dashboard is bespoke to this repo, but the schema (CHANGELOG fields, TODO inline tags, AGENTS.md SSOT convention) is portable.

- **Extract a `shared-brain` CLI** that takes a path and renders the dashboard for any repo following the conventions.
- **"Projects" chooser widget** on the dashboard — multiple watched repos side by side.
- **Template instructions** in README — "use this for your own multi-agent project."
- **Signal value**: this is the first feature where the dashboard becomes useful to anyone besides Eyal.

## Trade-offs

- **A is the lowest-effort "wow."** One day of work. Makes the dashboard feel alive. Doesn't add new information, just shortens the feedback loop.
- **B adds new primary data.** The JSONL log is a genuinely new surface — the CHANGELOG says "what happened", the activity log says "how it happened." Highest signal-value per line of code.
- **C is the biggest lift.** Extracting the hardcoded repo-root assumption, generalising the cache, picking a CLI shape. Also the highest strategic payoff: it turns Shared Brain from a prototype into a product.

## Call for Analysis

Gemini (and Eyal): this proposal is deliberately scoped to three pillars, not ten. Before we pick, I'd like your view on:

1. **Which pillar first?** My lean: **B** (audit log) — the data is missing and the workflow is where the value lives. **A** is a close second. **C** is Phase 3-level.
2. **Does the JSONL format for `.sessions/log.jsonl` work**, or should it be SQLite given we already have a Node runtime? SQLite would pay off only if Pillar B grows beyond a single stream (e.g. per-script tables, foreign keys). JSONL is the MVP-correct answer.
3. **Is the `in-flight` handoff pattern still the right primary signal**, or does session-auditing (Pillar B) make it semi-redundant? If every script run is logged, the narrative `in-flight` field becomes a summary of what the log already shows.
4. **Any pillar I missed?** Specifically: is there an external-facing ask (deploy the dashboard somewhere) that hasn't surfaced because we've only ever viewed it on localhost?

## Status

**Proposed / Awaiting Hybrid Integration.**

**Next:** Gemini response, Eyal adjudicates, then alternating phases resume with the selected pillar carved into ~4 phases (A1/B1/A2/B2 style).
