# Skills & Agents Integration Guide

## Overview

This document describes how the development-workflow skill integrates with other skills and agents in the project.

---

## Skills Architecture

```
+---------------------------------------------------------------------+
|                     DEVELOPMENT WORKFLOW                             |
|                   (Orchestration Layer)                              |
+---------------------------------------------------------------------+
|                                                                      |
|  Step 0: Spec          Step 3: Implement      Step 4: Finalize      |
|  +------------------+  +------------------+  +------------------+   |
|  | spec-creator     |  | backend-developer|  | production-code- |   |
|  |                  |  | frontend-developer| | validator        |   |
|  +--------+---------+  +--------+---------+  +--------+---------+   |
|                                                                      |
+---------------------------------------------------------------------+
|                                                                      |
|                         AGENTS LAYER                                 |
|  +------------------+  +------------------+  +------------------+   |
|  | backend-planner  |  | frontend-planner |  | database-        |   |
|  +------------------+  +------------------+  | architect        |   |
|                                               +------------------+   |
|  +------------------+  +------------------+                          |
|  | code-review-     |  | qa-engineer      |                         |
|  | specialist       |  |                  |                          |
|  +------------------+  +------------------+                          |
|                                                                      |
+---------------------------------------------------------------------+
|                                                                      |
|                      MEMORY LAYER                                    |
|  +------------------+  +------------------+  +------------------+   |
|  | project-memory   |  | sprint-tracker   |  | bugs.md          |   |
|  |                  |  |                  |  | decisions.md     |   |
|  +------------------+  +------------------+  +------------------+   |
|                                                                      |
+---------------------------------------------------------------------+
```

---

## Agents Reference

### spec-creator

**Purpose:** Draft or update project specs before planning.

**When to Use:**
- Step 0 for Standard/Complex tasks
- Before any task that changes APIs, data models, or UI

**Invocation:**
```
"Use spec-creator to review specs for task B1.2"
```

---

### backend-planner / frontend-planner

**Purpose:** Generate implementation plans for tasks.

**When to Use:**
- Step 2 for Standard/Complex tasks
- Before developer agents

**Invocation:**
```
"Use backend-planner to generate plan for docs/tickets/B2.3-xxx.md"
"Use frontend-planner to generate plan for docs/tickets/F1.2-xxx.md"
```

---

### backend-developer / frontend-developer

**Purpose:** Implement tasks from approved ticket + plan using TDD.

**When to Use:**
- Step 3 for Standard/Complex tasks
- After plan is approved by user

**Invocation:**
```
"Use backend-developer to implement docs/tickets/B2.3-xxx.md"
"Use frontend-developer to implement docs/tickets/F1.2-xxx.md"
```

---

### production-code-validator

**Purpose:** Validate code is production-ready before commit.

**Checks:**
| Category | What It Checks |
|----------|----------------|
| Debug code | console.log, debugger, print |
| Incomplete | TODO, FIXME, HACK |
| Security | Hardcoded secrets, localhost URLs |
| Quality | Empty catch, missing types |

**When to Use:**
- Step 4 (Finalize) - MANDATORY for Std/Cplx
- Before any commit

---

### code-review-specialist

**Purpose:** Thorough code review focusing on quality, security, and best practices.

**When to Use:**
- Step 5 for Standard/Complex tasks
- Before merging important PRs

---

### qa-engineer

**Purpose:** Verify edge cases and spec compliance.

**When to Use:**
- Step 5 for Complex tasks (mandatory)
- When spec compliance is critical

---

### database-architect

**Purpose:** Design optimal database schemas and queries.

**When to Use:**
- During development when creating new models/tables
- When optimizing queries or planning migrations

---

## Integration Patterns

### Pattern 1: Full Task Workflow (Standard)

```
1. spec-creator → Updates specs
2. User approves specs
3. Ticket generated
4. User approves ticket
5. Planner agent → Writes plan
6. User approves plan
7. Developer agent → TDD implementation
8. production-code-validator → Validates
9. User approves commit
10. code-review-specialist → Reviews
11. Human review → Merge
```

### Pattern 2: Complex Task (with QA)

```
Same as Standard, plus:
- ADR review during setup
- qa-engineer runs after code-review-specialist
```

---

## State Sharing

All skills share state through:
- `docs/project_notes/sprint-N-tracker.md` - Sprint progress, active task, completion log
- `docs/project_notes/decisions.md` - Architectural decisions
- `docs/project_notes/bugs.md` - Bug log
- `docs/project_notes/key_facts.md` - Project configuration
