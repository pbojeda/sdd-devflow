# Hotfix Process Guide

## Overview

A hotfix is an emergency fix deployed directly to production to resolve a critical issue. Speed is essential, but so is not making things worse.

---

## When to Hotfix

### Criteria (ALL must be true)

- [ ] Issue is in production NOW
- [ ] Severity is Critical or High
- [ ] Users are actively impacted
- [ ] Cannot wait for normal release cycle
- [ ] Fix is understood and contained

---

## Hotfix Process

### Phase 1: Confirm (5-10 min)

**STOP. Breathe. Verify.**

1. **Confirm the issue is real** - Check monitoring, try to reproduce
2. **Confirm severity** - Is it really Critical?
3. **Confirm you understand it** - Do you know the cause and the fix?

**If unsure about any of the above → Get help first**

---

### Phase 2: Alert (2 min)

Communicate immediately to team lead and relevant team members.

---

### Phase 3: Branch (2 min)

```bash
git checkout main
git pull origin main
git checkout -b hotfix/<brief-description>
```

---

### Phase 4: Fix (10-30 min)

**Rules for hotfix code:**

1. **Minimal change only** - Fix the immediate problem, nothing else
2. **No refactoring** - Don't clean up code
3. **No new features** - Even if "quick"
4. **Document shortcuts** - Add TODO for proper fix later
5. **Keep it reversible** - Easy to rollback if needed

---

### Phase 5: Test (5-10 min)

**Minimal but essential:**
1. Fix works - issue no longer occurs
2. Nothing else broke - critical paths still work
3. Quick smoke test

---

### Phase 6: Deploy (5-10 min)

```bash
git add .
git commit -m "hotfix(<area>): <description>

Emergency fix for production issue.
Proper fix to follow in TICKET-XXX.

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin hotfix/<description>
gh pr create --title "HOTFIX: <description>" --body "CRITICAL - Deploy immediately"
```

---

### Phase 7: Verify (5 min)

1. Check monitoring - error rates dropping
2. Manual verification in production
3. Update stakeholders

---

### Phase 8: Document (10 min)

Update bugs.md:

```markdown
### YYYY-MM-DD - HOTFIX: Brief Title

- **Severity:** Critical (Production Down)
- **Duration:** X minutes
- **Impact:** Description of impact
- **Root Cause:** Why it happened
- **Hotfix:** What was done
- **Proper Fix:** TICKET-XXX (scheduled)
- **Commit:** abc123
```

Create follow-up ticket if hotfix was temporary.

---

### Phase 9: Post-mortem (Later)

Schedule within 48 hours. Questions to answer:
1. What happened?
2. Why did it happen?
3. How was it detected?
4. How was it fixed?
5. What was the impact?
6. How do we prevent recurrence?

---

## Hotfix Checklist

```
[ ] CONFIRM - Issue verified, severity confirmed, cause understood
[ ] ALERT - Team notified, stakeholders informed
[ ] BRANCH - From production/main, named hotfix/description
[ ] FIX - Minimal change only, documented with TODO, reversible
[ ] TEST - Fix verified, no regression, smoke test passed
[ ] DEPLOY - PR created/merged, deployed to production
[ ] VERIFY - Monitoring checked, manual test in prod
[ ] DOCUMENT - bugs.md updated, follow-up ticket created
```

---

## Anti-patterns

### Don't

- Panic and rush without thinking
- Deploy untested changes
- Add "quick improvements" while fixing
- Skip documentation
- Forget to tell anyone
- Leave without verifying fix

### Do

- Stay calm
- Verify before acting
- Communicate constantly
- Keep changes minimal
- Test critical paths
- Document everything
- Learn from incident
