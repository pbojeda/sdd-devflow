# Sprint Initialization Template

Use this template when running `init sprint N`.

## How to Initialize

1. Copy template below to `docs/project_notes/sprint-{N}-tracker.md`
2. Read the sprint section from your project plan — extract goal, backend tasks (B*.*), frontend tasks (F*.*)
3. Set dates (start + 2 weeks)
4. Use `start task B0.1` to begin

---

## Template

```markdown
# Sprint {N}: {Sprint Title}

**Period:** YYYY-MM-DD to YYYY-MM-DD
**Goal:** {Sprint goal}
**Progress:** 0/{total} tasks (0%)

---

## Active Session

> **Read this section first** when starting a new session or after context compaction.

**Last Updated:** —

| Field | Value |
|-------|-------|
| **Current Task** | None |
| **Step** | — |
| **Branch** | — |
| **Complexity** | — |
| **Ticket** | — |

**Context:** _No active work._

**Next Actions:**
1. —

**Open Questions:** _None._

**Auto-Approved Decisions (this session):**

| Step | Decision | Rationale |
|------|----------|-----------|
| — | — | — |

---

## Tasks

### Backend

| # | Task | Status | Notes |
|---|------|--------|-------|
{backend_tasks}

### Frontend

| # | Task | Status | Notes |
|---|------|--------|-------|
{frontend_tasks}

**Status Legend:** ⬚ Pending | 🔄 In Progress | ✅ Complete | ⏸️ Blocked | ❌ Cancelled

---

## Completion Log

| Date | Task | Commit | Notes |
|------|------|--------|-------|

---

## Sprint Notes

_Key learnings, issues, or observations._
```
