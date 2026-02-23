## 1. Core Principles

- **Spec First**: No implementation without an approved specification (`docs/specs/`)
- **Small tasks, one at a time**: Work in baby steps. Never skip ahead.
- **Test-Driven Development**: Red-Green-Refactor cycle strictly
- **Type Safety**: All code fully typed. Never use `any` unless absolutely necessary.
- **English Only**: All code, comments, docs, commits, and tickets in English.

## 2. Project Structure

<!-- CONFIG: Adjust directories to match your monorepo layout -->

This is a **monorepo** with separate directories:

```
project/
├── backend/     ← Backend (has its own package.json)
├── frontend/    ← Frontend (has its own package.json)
└── docs/        ← Documentation (no package.json)
```

**Critical**: NEVER install dependencies in the root directory.

| Action | Correct | Wrong |
|--------|---------|-------|
| Install backend dep | `cd backend && npm install pkg` | `npm install pkg` |
| Run backend tests | `cd backend && npm test` | `npm test` |
| Install frontend dep | `cd frontend && npm install pkg` | `npm install pkg` |

## 3. Pre-Commit Checklist

1. **Specs updated**: `docs/specs/` reflects changes
2. **Tests pass**: `npm test`
3. **Lint passes**: `npm run lint`
4. **Build succeeds**: `npm run build`
5. **Ticket updated**: Mark acceptance criteria `[x]`

## 4. Quality Gates

| Agent | When to Use |
|-------|-------------|
| `spec-creator` | Before planning — draft/update specs |
| `backend-planner` / `frontend-planner` | Before implementing — create plan |
| `backend-developer` / `frontend-developer` | TDD implementation |
| `production-code-validator` | Before every commit |
| `code-review-specialist` | Before merging PRs |
| `qa-engineer` | After review — edge cases and spec verification |
| `database-architect` | Schema design, migrations, query optimization |

## 5. Project Memory System

Institutional knowledge lives in `docs/project_notes/`:

- **sprint-X-tracker.md** — Sprint progress, active task, completion log
- **bugs.md** — Bug log with solutions and prevention notes
- **decisions.md** — Architectural Decision Records (ADRs)
- **key_facts.md** — Project configuration, ports, URLs

**Protocols:**
- Before architectural changes → check `decisions.md`
- When encountering bugs → search `bugs.md`
- When looking up config → check `key_facts.md`
- After completing tasks → update sprint tracker

## 6. Post-Compact Protocol

After context compaction, BEFORE continuing work:

1. Read the active skill file (`.claude/skills/*/SKILL.md`)
2. Read sprint tracker (`docs/project_notes/sprint-X-tracker.md`)
3. Do NOT proceed past any checkpoint without user confirmation
4. If "Active Task" shows a pending checkpoint, ask before continuing

## 7. Anti-Patterns (Avoid)

- Installing dependencies in root directory
- Skipping ticket/spec approval before coding
- Using `any` type without justification
- Creating files when existing ones can be extended
- Adding features not explicitly requested
- Committing without updating ticket acceptance criteria

## 8. Standards References

- [Base Standards](./ai-specs/specs/base-standards.mdc) — Core methodology
- [Backend Standards](./ai-specs/specs/backend-standards.mdc) — Backend patterns
- [Frontend Standards](./ai-specs/specs/frontend-standards.mdc) — Frontend patterns
- [Documentation Standards](./ai-specs/specs/documentation-standards.mdc) — Doc guidelines
