# Bug Triage Guide

## Overview

Triage is the process of assessing a bug's severity, priority, and determining the appropriate response.

---

## Severity Assessment

### Questions to Ask

1. **Impact Scope** - How many users are affected? Which features are broken? Is there a workaround?
2. **Business Impact** - Is revenue affected? Is data at risk? Are SLAs being violated?
3. **Technical Impact** - Is the system stable? Are other services affected? Is it getting worse?

---

## Severity Definitions

### Critical

**Definition:** System unusable, data at risk, security compromised

**Characteristics:**
- Production is down or severely degraded
- Data loss or corruption occurring
- Security vulnerability being exploited
- No workaround available

**Response:** Drop everything. Fix within 1 hour. Consider rollback.

---

### High

**Definition:** Major feature broken, significant user impact

**Characteristics:**
- Key feature not working
- Many users affected
- Workaround is difficult or partial

**Response:** Priority over other work. Fix same day.

---

### Medium

**Definition:** Feature impaired but usable, workaround exists

**Characteristics:**
- Feature works but has issues
- Some users affected
- Workaround is available

**Response:** Schedule within current sprint.

---

### Low

**Definition:** Minor issue, cosmetic, rarely occurs

**Characteristics:**
- Cosmetic or minor UX issue
- Very few users affected
- No business impact

**Response:** Add to backlog. Fix when convenient.

---

## Priority Matrix

| Severity | In Production? | Users Affected | Priority |
|----------|----------------|----------------|----------|
| Critical | Yes | Many | P0 - Immediate |
| Critical | No | - | P1 - Today |
| High | Yes | Many | P1 - Today |
| High | Yes | Few | P2 - This week |
| Medium | Yes | Any | P3 - This sprint |
| Medium | No | - | P4 - Backlog |
| Low | Any | Any | P5 - When convenient |

---

## Triage Checklist

### Initial Assessment

- [ ] Bug confirmed (reproduced)
- [ ] Severity determined
- [ ] Scope identified (users, features)
- [ ] Workaround available?
- [ ] In production?
- [ ] Getting worse?

### Documentation

- [ ] Clear description written
- [ ] Reproduction steps documented
- [ ] Error messages captured
- [ ] Environment noted

### Assignment

- [ ] Priority assigned
- [ ] Developer assigned
- [ ] Path chosen (A/B/C/D)

---

## Triage Output Template

```markdown
## Bug Triage: [Brief Title]

**Reported:** YYYY-MM-DD
**Triaged By:** [Name]

### Assessment

| Criteria | Value |
|----------|-------|
| Severity | High |
| Priority | P1 - Today |
| In Production | Yes |
| Users Affected | ~500 |
| Workaround | Partial |

### Decision

**Path:** B (Standard Fix)
**Assigned To:** [Developer]
**Estimated Effort:** 2-3 hours
```

---

## Common Triage Mistakes

### Don't

- Assume severity without investigation
- Mark everything as Critical
- Skip documentation "to save time"
- Start fixing without understanding

### Do

- Reproduce before triaging
- Be honest about severity
- Document for future reference
- Consider business context
- Reassess if new info emerges
