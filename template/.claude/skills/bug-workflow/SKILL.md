---
name: bug-workflow
description: "Handles bug discovery, triage, investigation, and resolution. Use this skill when a bug is found during development, reported by users, or discovered in production. Invoke with: 'report bug', 'fix bug', 'hotfix needed', 'investigate bug', or 'triage bug'. For complex bugs that require significant work, this skill can escalate to development-workflow."
---

# Bug Workflow Skill

## Overview

This skill manages the complete lifecycle of bug resolution, from discovery to fix, with proper documentation and prevention measures.

## When to Use

| Command | Situation |
|---------|-----------|
| `report bug` | Document a newly discovered bug |
| `triage bug` | Assess severity and priority |
| `investigate bug` | Find root cause |
| `fix bug` | Resolve a known bug |
| `hotfix needed` | Critical production bug |

---

## Bug Severity Levels

| Severity | Description | Response Time | Examples |
|----------|-------------|---------------|----------|
| Critical | Production down, data loss, security breach | Immediate (< 1h) | Auth broken, data corruption, security vulnerability |
| High | Major feature broken, no workaround | Same day | Checkout fails, API errors, crash on common action |
| Medium | Feature impaired, workaround exists | Within sprint | Slow performance, UI glitch, edge case failure |
| Low | Minor issue, cosmetic | Backlog | Typo, minor UI inconsistency, rare edge case |

---

## Workflow Paths

### Path A: Quick Fix (Low/Medium Severity)

```
1. Triage → 2. Investigate → 3. Fix → 4. Test → 5. Document → 6. Commit
```

### Path B: Standard Fix (Medium/High Severity)

```
1. Triage → 2. Create Branch → 3. Investigate → 4. Fix (TDD) → 5. Validate → 6. Document → 7. PR
```

### Path C: Hotfix (Critical Severity)

```
1. Confirm Critical → 2. Hotfix Branch → 3. Minimal Fix → 4. Test → 5. Deploy → 6. Document → 7. Post-mortem
```

### Path D: Complex Bug → Escalate

```
1. Triage → 2. Determine Complexity → 3. Create Task → 4. → development-workflow
```

When bug requires significant refactoring or architectural changes.

---

## Workflow Steps

### Step 1: Report/Detect Bug

**Immediate Actions:**
1. Document what happened
2. Note reproduction steps
3. Capture error messages/logs
4. Identify affected area

---

### Step 2: Triage

**Assess:**
1. **Severity** - How bad is the impact?
2. **Urgency** - How soon must it be fixed?
3. **Scope** - How many users/features affected?
4. **Complexity** - How hard to fix?

See `references/bug-triage.md` for detailed triage guide.

---

### Step 3: Create Branch (Path B, C)

| Path | Convention | Example |
|------|------------|---------|
| Standard | `bugfix/<area>-<description>` | `bugfix/auth-session-expiry` |
| Hotfix | `hotfix/<description>` | `hotfix/critical-login-fix` |

---

### Step 4: Investigate

**Goal:** Find the root cause, not just the symptom.

See `references/investigation.md` for detailed investigation guide.

---

### Step 5: Fix (TDD Approach)

**Even for bugs, use TDD:**

1. **Write test that reproduces the bug (RED)**
2. **Run test - confirm it fails** (proves we understand the bug)
3. **Fix the code (GREEN)** - minimal change
4. **Run test - confirm it passes**
5. **Run all tests** - ensure no regression

**For Hotfixes (Path C):**
- Minimal fix only
- Skip refactoring
- Add TODO for proper fix later
- See `references/hotfix-process.md`

---

### Step 6: Validate

**Run production-code-validator:**
- Ensure no debug code left
- Proper error handling
- No TODO (except intentional for hotfix)

---

### Step 7: Document in bugs.md

```markdown
### YYYY-MM-DD - Brief Title

- **Severity:** High
- **Area:** Authentication
- **Issue:** Token validation failed when token contained special characters
- **Root Cause:** URL encoding not applied before validation
- **Solution:** Added encodeURIComponent() before token comparison
- **Prevention:** Added test case for special characters in tokens
- **Commit:** def456
```

---

### Step 8: Commit/PR

**Commit Message Format:**

```
fix(<area>): <description>

<What was the bug>
<What was the root cause>
<How it was fixed>

Fixes #issue-number (if applicable)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Hotfix Process (Critical Bugs)

See `references/hotfix-process.md` for the complete hotfix guide.

### When to Use

- Production is down
- Security vulnerability discovered
- Data corruption occurring
- Critical business function broken

### Hotfix Checklist

- [ ] Team alerted
- [ ] Issue confirmed and understood
- [ ] Hotfix branch created from production
- [ ] Minimal fix implemented
- [ ] Critical paths tested
- [ ] Deployed to production
- [ ] Monitoring confirmed fix works
- [ ] Documented in bugs.md
- [ ] Post-mortem scheduled (if needed)
- [ ] Proper fix scheduled (if hotfix was temporary)

---

## Escalation to Development Workflow

### When to Escalate

- Bug fix requires > 1 day of work
- Multiple files/components affected
- Architectural changes needed
- New feature needed to properly fix
- Significant refactoring required

### How to Escalate

1. Document findings so far
2. Create task in sprint tracker or backlog
3. Reference bug in task description
4. Use `development-workflow` for implementation
5. Close bug when task is complete

---

## Memory Integration

### Files Updated

| File | When |
|------|------|
| `sprint-X-tracker.md` | Bug being worked on (Active Task section) |
| `bugs.md` | Always (bug documented) |
| `decisions.md` | If architectural decision made |

---

## Prevention

### After Fixing a Bug

Ask these questions:

1. **Why wasn't this caught earlier?**
2. **Can this happen elsewhere?**
3. **What can prevent recurrence?**

---

## Integration with Development Workflow

| Scenario | Use |
|----------|-----|
| New feature | `development-workflow` |
| Planned task | `development-workflow` |
| Bug found | `bug-workflow` |
| Bug is complex | `bug-workflow` → escalate → `development-workflow` |
| Bug during task | `bug-workflow` (pause task) → resume task |
