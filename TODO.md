# Shared Brain TODO

Tasks for the Shared Brain command center. This file is parsed by the UI.

## Schema
- `[ ]` or `[x]` — Checkbox
- `(P1|P2|P3)` — Priority (P1 is highest)
- `@agent|@human` — Owner
- `YYYY-MM-DD` — Completion date (for completed tasks)
- `ref: ...` — Reference to file or script

---

## Active Tasks
- [ ] (P3, @gemini) Implement `docs/BRIEFS.md` and Briefing Board widget (Phase 3)
- [ ] (P2, @claude) Environment Health + Architecture Snapshot widgets (Phase 4)
- [ ] (P2, @claude) Add lazy mtime cache for CHANGELOG.md and TODO.md reads (Phase 4)
- [ ] (P3, @gemini) Visual polish pass + typography + color palette (Phase 5)

## Completed Tasks
- [x] (P1, @gemini, 2026-04-24) Implement Bento grid shell in `app/page.tsx`
- [x] (P1, @gemini, 2026-04-24) Implement Pulse status bar (latest changelog state)
- [x] (P1, @gemini, 2026-04-24) Implement Conflict Monitor (git drift detection)
- [x] (P2, @claude, 2026-04-24) Implement `TODO.md` parser and Task Board widget
- [x] (P2, @claude, 2026-04-24) Implement `scripts/todo-done` and `scripts/todo-add`
- [x] (P1, @gemini, 2026-04-24) Draft Command Center Phase 1 proposal
- [x] (P1, @claude, 2026-04-24) Review and refine Phase 1 proposal (Opus)
