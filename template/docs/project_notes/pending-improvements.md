# Pending Template Improvements

Documented on 2026-02-23 for future sessions.

---

## P1: Agent Teams Readiness (Impact: HIGH, Effort: MEDIUM)

**What**: Prepare the template to leverage Claude Code's Agent Teams feature (experimental) — a lead agent coordinates multiple teammate agents working in parallel on isolated worktrees.

**Why**: Currently, all work is sequential (one agent at a time). Agent Teams would enable parallel execution of independent tasks (e.g., backend + frontend of the same feature simultaneously).

**What to do**:
1. **Isolation guide**: Document how to use `git worktree` so each teammate works in an isolated copy
2. **Parallelism guide**: Add a section to `base-standards.mdc` or a new reference file defining which tasks can safely run in parallel (e.g., backend + frontend of same ticket) vs which must be sequential (e.g., shared types → then backend/frontend)
3. **Coordination protocol**: Define how the lead agent splits work, assigns to teammates, and merges results
4. **Skill updates**: Modify `development-workflow/SKILL.md` to support a "parallel mode" for Standard/Complex tasks where Step 4 (Implement) can fork into parallel teammates

**Prerequisites**: Agent Teams must be stable (currently experimental). Test with a real project first.

---

## ~~P2: Quality Gate Hooks~~ — DONE (2026-02-23)

Implemented as:
- `.claude/settings.json` — Quick scan hook (SubagentStop) + compaction recovery hook (SessionStart)
- `.claude/hooks/quick-scan.sh` — Fast grep-based scan (no API calls, ~2s)
- `.claude/settings.local.json` — Notification hooks (permission_prompt, idle_prompt, Stop)
- Documented in `AGENTS.md` § Automated Hooks

---

## P3: PM Agent + L5 Autonomous (Impact: HIGH, Effort: HIGH)

**What**: Create a `project-manager` agent that can substitute the human in most workflow decisions, enabling a new "L5 Fully Autonomous" level where the AI drives the entire sprint.

**Why**: Currently, autonomy levels top out at L4 (all checkpoints auto-approved). But the human still decides WHAT to build and in what order. A PM agent could read the sprint tracker, prioritize tasks, and orchestrate the full workflow autonomously.

**What to do**:
1. **Create `pm-agent.md`**: Reads sprint tracker, selects next task, invokes the workflow skill, reviews results, and decides whether to proceed or flag for human review
2. **Add L5 Autonomous**: New autonomy level where the PM agent drives. Human only reviews at sprint boundaries (sprint planning + sprint review)
3. **Guard rails**: Define what the PM agent CANNOT do autonomously (e.g., delete data, change architecture, skip tests)
4. **Sprint planning integration**: PM agent proposes sprint backlog from a product backlog, human approves
5. **Escalation protocol**: When the PM agent encounters ambiguity or risk, it pauses and asks the human

**Prerequisites**: Template must be battle-tested at L3-L4 first. Agent Teams (P1) would multiply the PM agent's effectiveness.

---

*Delete entries from this file as they are implemented.*
