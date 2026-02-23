# Automation & Hooks Guide

## Overview

This document describes how to automate repetitive workflow tasks using hooks and conventions.

---

## Available Hook Points

| Hook | Triggers When |
|------|---------------|
| `pre-commit` | Before git commit |
| `post-commit` | After git commit |
| `on-task-start` | When starting a task |
| `on-task-complete` | When completing a task |

---

## Recommended Hooks

### Hook 1: Pre-Commit Validation

**Purpose:** Run production-code-validator before every commit.

**Actions:**
1. Get list of staged files
2. Run validation on each
3. If issues found: Block commit, show issues, suggest fixes
4. If clean: Allow commit to proceed

### Hook 2: Post-Commit Memory Update

**Purpose:** Automatically update sprint tracker after commits.

**Actions:**
1. Read sprint tracker "Active Task" section
2. If task is active, update status
3. Add commit hash to completion log

### Hook 3: Task Start Automation

**Purpose:** Automate task initialization.

**Actions:**
1. Verify no active task (check sprint tracker)
2. Validate task exists in project plan
3. Check dependencies in sprint tracker
4. Create branch automatically
5. Update sprint tracker "Active Task" section

### Hook 4: Task Complete Automation

**Purpose:** Automate task finalization.

**Actions:**
1. Calculate total time
2. Update sprint tracker (clear active task, mark completed, add to log)
3. Clean up branch
4. Suggest next task

---

## Memory File Auto-Updates

### When to Update Each File

| Event | sprint-tracker | bugs.md | decisions.md |
|-------|---------------|---------|--------------|
| Start task | Active Task, status | | |
| Change step | Active Task step | | |
| Complete | Clear Active, status, Log | | |
| Bug found | | Add entry | |
| Decision made | | | Add entry |
| Blocked | Active Task, status | | |

---

## Workflow State Machine

```
            IDLE (No Task)
                |
                | start task
                v
            SPEC (Step 0)
                |
                | spec approved
                v
            SETUP (Step 1)
                |
                | ticket approved
                v
            PLAN (Step 2)
                |
                | plan approved
                v
            IMPLEMENT (Step 3)
                |
                | code ready
                v
            FINALIZE (Step 4)
                |
                | commit approved
                v
            REVIEW (Step 5)
                |
                | merged
                v
            COMPLETE (Step 6)
                |
                v
            IDLE (Next Task)
```

---

## Future Automation Ideas

### 1. Notifications
- Notify team when task started/completed
- Alert on blockers

### 2. Time Tracking Integration
- Connect to time tracking tools
- Auto-start/stop timers

### 3. CI/CD Triggers
- Run tests on task completion
- Deploy preview on PR

### 4. AI Insights
- Analyze patterns in time data
- Suggest task complexity
- Predict sprint completion

---

## Implementation Priority

| Priority | Automation | Effort | Impact |
|----------|------------|--------|--------|
| 1 | Pre-commit validation | Low | High |
| 2 | Task start/complete | Medium | High |
| 3 | Sprint initialization | Low | Medium |
| 4 | Progress updates | Low | Medium |
| 5 | External integrations | High | Medium |
