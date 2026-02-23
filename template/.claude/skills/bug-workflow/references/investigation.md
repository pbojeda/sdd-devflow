# Bug Investigation Guide

## Overview

Investigation is the most critical step in bug resolution. A thorough investigation leads to a proper fix; a rushed investigation leads to more bugs.

---

## Investigation Mindset

### Principles

1. **Understand before fixing** - Never fix what you don't understand
2. **Find root cause** - Treat the disease, not the symptom
3. **Question assumptions** - The obvious cause is often wrong
4. **Document as you go** - Future you will thank present you
5. **Time-box wisely** - Know when to ask for help

---

## Investigation Process

### Phase 1: Reproduce (15-30 min)

**Goal:** Confirm the bug exists and understand exact conditions.

**Steps:**
1. Follow reported reproduction steps exactly
2. Note if it fails consistently or intermittently
3. Try variations (different user, browser, data)
4. Identify minimal reproduction case

---

### Phase 2: Isolate (30-60 min)

**Goal:** Narrow down the location and cause.

**Techniques:**

#### Binary Search (Git Bisect)

```bash
git bisect start
git bisect bad              # Current is bad
git bisect good abc123      # Known good commit
git bisect good/bad         # Mark each until found
```

#### Layer Isolation

```
Frontend → API → Service → Database
    ↓         ↓        ↓         ↓
  Check    Check   Check    Check
  console  network  logs    queries
```

#### Component Isolation

1. Test each component in isolation
2. Mock dependencies
3. Check interfaces between components

---

### Phase 3: Understand (30-60 min)

**Goal:** Know exactly why the bug happens.

**Questions to Answer:**

1. **What should happen?** - Expected behavior
2. **What actually happens?** - Actual behavior
3. **Why does it happen?** - Root cause
4. **Why wasn't it caught?** - Missing test? Edge case?

---

### Phase 4: Verify Understanding (15 min)

**Goal:** Confirm your analysis is correct before fixing.

**Red Flags (go back and investigate more):**
- "I'm not sure why, but this fix works"
- "It works on my machine"
- "I couldn't reproduce it but..."

**Green Lights (proceed to fix):**
- Can explain bug to non-technical person
- Know exact line(s) causing issue
- Understand why it wasn't caught
- Have idea for test that would catch it

---

## Investigation Tools

### Frontend

| Tool | Use For |
|------|---------|
| Browser DevTools | Console errors, network, DOM |
| React DevTools | Component state, props |
| Network Tab | API requests/responses |

### Backend

| Tool | Use For |
|------|---------|
| Server Logs | Error messages, stack traces |
| Database Client | Query data directly |
| Postman/curl | Test API in isolation |
| Node Inspector | Step-through debugging |

### General

| Tool | Use For |
|------|---------|
| Git Bisect | Find when bug was introduced |
| Git Blame | See who changed what when |
| Git Log | Recent changes to file |
| Grep/Search | Find related code |

---

## Time Limits

| Severity | Investigation Limit | Then |
|----------|---------------------|------|
| Critical | 30 min | Escalate + consider rollback |
| High | 2 hours | Escalate to senior dev |
| Medium | 4 hours | Pair with someone |
| Low | 1 day | Document and backlog |

---

## Investigation Output Template

```markdown
## Investigation Report: [Bug Title]

**Investigated By:** [Name]
**Date:** YYYY-MM-DD

### Summary
One paragraph explaining the bug and its cause.

### Reproduction
- **Reproducible:** Yes/No/Sometimes
- **Minimal Steps:** [Numbered list]

### Root Cause
**What:** [Technical description]
**Where:** [File:line or component]
**When Introduced:** [Commit or date]
**Why:** [How it got past review/testing]

### Proposed Fix
**Approach:** [Brief description]
**Files to Change:** [List]
**Risk Level:** Low/Medium/High

### Prevention
- **Test to Add:** [Description]
- **Process Change:** [If any]
```

---

## Common Investigation Mistakes

1. **Fixing Too Fast** - Jump to fix without understanding → new bugs
2. **Tunnel Vision** - Assume cause, only look for confirmation → miss real issue
3. **Not Documenting** - Figure it out but don't write it down → waste time if it recurs
4. **Working Alone Too Long** - Spend hours stuck → set time limits, ask for help
