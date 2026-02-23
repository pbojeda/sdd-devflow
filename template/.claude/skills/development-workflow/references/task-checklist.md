# Task Checklist Template

Use this checklist for each task to ensure all steps are completed correctly.

---

## Task: [TASK-ID] - [Task Title]

**Sprint:** [Sprint Number]
**Type:** Backend / Frontend
**Started:** [YYYY-MM-DD]
**Completed:** [YYYY-MM-DD]

---

### Pre-Development

- [ ] Task validated against project plan
- [ ] Checked `decisions.md` for related architectural decisions
- [ ] Checked `bugs.md` for known issues in this area
- [ ] Verified dependencies are completed in sprint tracker
- [ ] Created feature branch: `feature/sprint_-____-____`
- [ ] Updated sprint tracker: task status to In Progress, "Active Task" section

---

### Spec Update (Standard/Complex)

- [ ] `spec-creator` reviewed/updated relevant specs
- [ ] Spec changes approved by user

---

### Ticket Generation (Standard/Complex)

- [ ] Generated detailed ticket
- [ ] Ticket includes clear acceptance criteria
- [ ] Ticket includes test specifications
- [ ] Ticket includes files to create/modify
- [ ] Ticket approved by user

---

### Plan Generation (Standard/Complex)

- [ ] Planner agent invoked (`backend-planner` or `frontend-planner`)
- [ ] Plan written into ticket's `## Implementation Plan` section
- [ ] Plan includes: Existing Code to Reuse, Files to Create/Modify, Implementation Order, Testing Strategy, Key Patterns
- [ ] Plan approved by user

---

### Development (TDD)

- [ ] **Cycle 1:**
  - [ ] Test written (RED)
  - [ ] Implementation (GREEN)
  - [ ] Refactored if needed

- [ ] **Cycle 2:**
  - [ ] Test written (RED)
  - [ ] Implementation (GREEN)
  - [ ] Refactored if needed

- [ ] **Cycle N:**
  - [ ] Test written (RED)
  - [ ] Implementation (GREEN)
  - [ ] Refactored if needed

- [ ] All tests passing
- [ ] Used appropriate developer agent:
  - [ ] `backend-developer` for backend implementation (B*.*)
  - [ ] `frontend-developer` for frontend implementation (F*.*)
  - [ ] `database-architect` for schema design (if needed)

---

### Code Validation

- [ ] Ran `production-code-validator` agent
- [ ] No console.log or debug statements
- [ ] No TODO/FIXME comments remaining
- [ ] No hardcoded credentials or localhost URLs
- [ ] No placeholder code
- [ ] Proper error handling implemented
- [ ] All TypeScript types complete
- [ ] All issues fixed (if any were found)

---

### Documentation (if applicable)

- [ ] API changes documented in `api-spec.yaml`
- [ ] Schema changes documented in `data-model.md`
- [ ] New env variables added to `.env.example`
- [ ] README updated if needed

---

### Commit

- [ ] Commit message follows conventional format
- [ ] Commit type is correct (feat/fix/docs/etc.)
- [ ] Co-Authored-By included
- [ ] Updated sprint tracker: task status to Completed, Completion Log
- [ ] Added bug to `bugs.md` if one was fixed
- [ ] Added decision to `decisions.md` if one was made

---

### Post-Task

- [ ] All tests still passing
- [ ] Branch ready for merge/PR
- [ ] Ready for next task

---

## Notes

_Add any notes, learnings, or issues encountered during this task:_

```
[Your notes here]
```

---

## Time Log (Optional)

| Phase | Time Spent |
|-------|------------|
| Spec Review | |
| Ticket Generation | |
| Planning | |
| Development | |
| Testing | |
| Documentation | |
| **Total** | |
