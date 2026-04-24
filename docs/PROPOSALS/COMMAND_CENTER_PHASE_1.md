# Proposal: Command Center Phase 1

## Overview
This proposal outlines the transformation of **Shared Brain** from a passive Session Log viewer into an active **Command Center Prototype**. The goal is to move beyond history and into active coordination, task management, and environment-aware collaboration.

## 1. Dashboard Layout (The "Bento" Grid)
Shift from a linear timeline to a structured, multi-widget dashboard.
- **The Pulse:** Top-bar status showing the active Agent (Gemini/Claude), Machine, and a global "Lock" indicator based on `State: in-flight`.
- **Conflict Monitor:** A visual alert if the local state is out of sync with `origin/main`.

## 2. Universal Todo (`TODO.md` Integration)
Extract tasks from narrative logs into a structured, actionable format.
- **Task Board:** A dedicated UI section parsing `TODO.md`.
- **Filtering:** View tasks by "Owner" (Gemini, Claude, Human) or "Priority."
- **Traceability:** Link todos directly to specific files in the architecture.

## 3. Briefing Board (Messaging)
High-level steering and handoff communication.
- **Pinned Briefs:** Persistent steering instructions from the Human (Eyal).
- **Agent Graffiti:** A visual "scratchpad" for the currently active agent to leave notes for the next one, specifically for `in-flight` transitions.

## 4. Collaborative Upgrades
- **Architecture Explorer:** Interactive map of modules from `docs/ARCHITECTURE.md`.
- **Session Playback:** A "Time Travel" feature using git history to visualize codebase evolution.
- **Environment Health:** A diagnostic panel detecting machine capabilities (e.g., "Termux: Edit-Only").

---

## Call for Analysis & Enhancements
We request a technical analysis and suggestions for further enhancements to this upgrade plan. Specifically:
- **Scalability:** How can we keep the `TODO.md` and `CHANGELOG.md` parsing efficient as the project grows?
- **Interactivity:** Suggestions for low-friction ways for an AI agent to "Check Off" a todo via the CLI that reflects in the UI.
- **Visuals:** Ideas for a "high-aesthetic" layout that maintains the senior-engineer minimalist feel.

**Status:** In Progress (Phase 1 Complete)
**Next:** Phase 2 — `TODO.md` integration (Claude).
