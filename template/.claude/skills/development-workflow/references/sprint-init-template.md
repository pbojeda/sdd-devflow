# Sprint Initialization Template

Use this template when running `init sprint N` to create a new sprint tracker.

---

## How to Initialize a Sprint

### Step 1: Create Sprint Tracker File

Copy template below to:
```
docs/project_notes/sprint-{N}-tracker.md
```

### Step 2: Populate Tasks

Read the sprint section from your project plan and extract:
- Sprint goal
- Backend tasks (B*.*)
- Frontend tasks (F*.*)
- Deliverables checklist

### Step 3: Set Dates

- Start Date: Current date or planned start
- End Date: Start + 2 weeks (sprint duration)

### Step 4: Start Working

Use "start task B0.1" to begin the first task. The sprint tracker's "Active Task" section will be updated automatically.

---

## Sprint Tracker Template

```markdown
# Sprint {N}: {Sprint Title}

**Goal:** {Sprint goal}
**Start Date:** YYYY-MM-DD
**End Date:** YYYY-MM-DD
**Status:** In Progress

---

## Progress Overview

Progress: [          ] 0%

Completed: 0/{total} tasks
In Progress: 0 tasks
Pending: {total} tasks
Blocked: 0 tasks

---

## Backend Tasks

| ID | Task | Priority | Status | Branch | Notes |
|----|------|----------|--------|--------|-------|
{backend_tasks}

---

## Frontend Tasks

| ID | Task | Priority | Status | Branch | Notes |
|----|------|----------|--------|--------|-------|
{frontend_tasks}

---

## Status Legend

| Icon | Status |
|------|--------|
| Pending | Not started |
| In Progress | Currently being worked on |
| Completed | Done and merged |
| Blocked | Waiting on dependency |

---

## Active Task

**Status:** Idle

_No task currently in progress._

---

## Deliverables Checklist

{deliverables}

---

## Completion Log

| Date | Task | Commit | Notes |
|------|------|--------|-------|

---

## Sprint Notes

_Key learnings, issues, or observations:_

---

*Created: YYYY-MM-DD*
*Last Updated: YYYY-MM-DD*
```

---

## Example: Initializing Sprint 0

### Input Command
```
init sprint 0
```

### Actions Performed

1. **Read project plan** for Sprint 0 section
2. **Create file** `docs/project_notes/sprint-0-tracker.md` from template
3. **Populate tasks** from plan into tracker tables

### Output
```
Sprint 0 initialized

Tracker: docs/project_notes/sprint-0-tracker.md
Tasks: 10 backend + 10 frontend = 20 total
Duration: YYYY-MM-DD to YYYY-MM-DD

Next: Run "start task B0.1" to begin first task
```

---

## Sprint Completion

When all tasks in a sprint are completed:

1. Update sprint tracker status to "Completed"
2. Calculate final metrics
3. Archive or keep for reference
4. Initialize next sprint if continuing

### Sprint Completion Checklist

- [ ] All tasks marked as Completed
- [ ] All deliverables checked off
- [ ] Sprint notes documented
- [ ] Metrics recorded
- [ ] Next sprint initialized (if applicable)
