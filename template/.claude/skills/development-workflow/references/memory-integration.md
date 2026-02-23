# Memory System Integration

## Files Updated During Workflow

- `sprint-X-tracker.md` — Every step change, complete, task status
- `bugs.md` — Bug discovered and fixed during development
- `decisions.md` — Architectural decision made during implementation
- `key_facts.md` — New configuration or environment details added
- `docs/tickets/*.md` — Ticket generated (Step 1)

## Before Each Task

1. Read `docs/project_notes/sprint-X-tracker.md` - Verify no active task
2. Read `docs/project_notes/decisions.md` - Check for relevant decisions
3. Read `docs/project_notes/bugs.md` - Check for known issues
4. Check sprint tracker task tables - Verify dependencies completed

## After Each Task

1. Update sprint tracker - Clear "Active Task", update task status to Completed
2. Update sprint tracker - Add entry to "Completion Log"
3. If bug fixed - Add to `docs/project_notes/bugs.md`
4. If decision made - Add to `docs/project_notes/decisions.md`
