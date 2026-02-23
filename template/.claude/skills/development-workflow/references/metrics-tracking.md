# Metrics & Time Tracking Guide

## Overview

Track time and metrics to improve estimation accuracy and identify bottlenecks.

---

## Time Tracking

### Per-Task Tracking

Each task should track:

| Metric | Description |
|--------|-------------|
| Started | When work began |
| Completed | When task finished |
| Total Time | Elapsed time |
| Estimated | Original estimate (if any) |
| Variance | Difference from estimate |

### On Completion

Update sprint tracker Completion Log:

| Date | Task | Commit | Notes |
|------|------|--------|-------|
| YYYY-MM-DD | B0.1 | abc1234 | 2h 15m (estimated 2h) |

---

## Task Complexity Estimation

### Complexity Levels

| Level | Description | Typical Time |
|-------|-------------|--------------|
| XS | Trivial change | < 30 min |
| S | Simple, well-defined | 30 min - 2h |
| M | Moderate complexity | 2h - 4h |
| L | Complex, multiple parts | 4h - 8h |
| XL | Very complex, uncertain | 1-2 days |

---

## Sprint Metrics

### Sprint Tracker Metrics Section

```markdown
## Sprint Metrics

| Metric | Planned | Actual | Variance |
|--------|---------|--------|----------|
| Total Tasks | 20 | 18 | -2 (10% under) |
| Backend | 10 | 10 | 0 |
| Frontend | 10 | 8 | -2 |
| Duration | 14 days | 16 days | +2 days |

### Quality Metrics

| Metric | Value | Target |
|--------|-------|--------|
| Bugs Found | 3 | < 5 |
| Bugs Fixed | 3 | 100% |
| Test Coverage | 85% | > 80% |
| PRs Merged | 18 | - |
| Avg PR Time | 4h | < 24h |
```

---

## Velocity Tracking

### What is Velocity?

Velocity = Tasks completed per sprint

### Tracking Velocity

```markdown
| Sprint | Planned | Completed | Velocity |
|--------|---------|-----------|----------|
| 0 | 20 | 18 | 18 |
| 1 | 18 | 18 | 18 |
| 2 | 20 | 17 | 17 |
| **Avg** | **19** | **18** | **18** |
```

### Using Velocity for Planning

- Use 3-sprint rolling average
- Don't overcommit based on best sprint
- Factor in holidays, vacations

---

## Bottleneck Analysis

### Identify Bottlenecks

Track which steps take longest:

```markdown
| Step | Avg Duration | % of Total | Notes |
|------|--------------|------------|-------|
| Setup | 5m | 3% | Consistent |
| Spec | 10m | 6% | Skip for Simple |
| Ticket | 15m | 10% | Varies with complexity |
| Plan | 15m | 10% | Std/Cplx only |
| **Develop** | **2h** | **55%** | **Bottleneck** |
| Validate | 10m | 6% | Depends on issues |
| Commit | 5m | 3% | Consistent |
| PR & Merge | 15m | 10% | Review time varies |
```

### Common Bottlenecks

| Bottleneck | Cause | Solution |
|------------|-------|----------|
| Long Develop | Unclear requirements | Better ticket generation |
| Many Validation Issues | Poor coding habits | Linting during development |
| Slow PR Reviews | Team availability | Async reviews |
| Frequent Blocks | Poor planning | Check dependencies early |

---

## Reporting

### Sprint Retrospective Data

```markdown
# Sprint N Retrospective

## What Went Well
- Task estimation improving
- TDD catching bugs early
- Validation preventing issues

## What Could Improve
- Ticket generation takes too long
- Some tasks were underestimated

## Action Items
- [ ] Create ticket templates for common patterns
- [ ] Add buffer for XL tasks
```

---

## Templates

### Complexity Estimation Checklist

Before estimating, consider:
- [ ] How many files affected?
- [ ] New vs modifying existing?
- [ ] External dependencies?
- [ ] Database changes?
- [ ] Clear requirements?
- [ ] Similar work done before?
