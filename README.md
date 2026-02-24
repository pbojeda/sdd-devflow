# SDD DevFlow

**Spec-Driven Development workflow template for AI-assisted coding.**

A development methodology designed for Claude Code and Gemini that combines specialized AI agents, workflow orchestration with human checkpoints, and institutional memory. Built for creating robust, maintainable, and scalable TypeScript projects.

## What is SDD?

SDD DevFlow combines three proven practices:

1. **Spec-Driven Development** — Write specifications before code. Specs are the contract between planning and implementation.
2. **Test-Driven Development** — Red-Green-Refactor cycle for every feature. Tests define expected behavior before implementation.
3. **Human-in-the-Loop** — Strategic checkpoints (spec, ticket, plan, commit, merge) with configurable autonomy levels that reduce human intervention as trust increases.

## What's Inside

### 9 Specialized Agents

| Agent | Role | Step |
|-------|------|------|
| `spec-creator` | Draft/update specifications | 0 |
| `backend-planner` / `frontend-planner` | Create implementation plans | 2 |
| `backend-developer` / `frontend-developer` | TDD implementation | 3 |
| `production-code-validator` | Pre-commit quality scan | 4 |
| `code-review-specialist` | Pre-merge code review | 5 |
| `qa-engineer` | Edge cases, spec verification | 5 |
| `database-architect` | Schema design, optimization | Any |

### Workflow (Steps 0–6)

```
0. SPEC      → spec-creator drafts specs        → Spec Approval (Std/Cplx)
1. SETUP     → Branch, ticket, sprint tracker    → Ticket Approval (Std/Cplx)
2. PLAN      → Planner creates implementation plan → Plan Approval (Std/Cplx)
3. IMPLEMENT → Developer agent, TDD
4. FINALIZE  → Tests/lint/build, validator       → Commit Approval
5. REVIEW    → PR, code review, QA              → Merge Approval
6. COMPLETE  → Clean up, update tracker
```

**Step flow by complexity:**
- **Simple**: 1 → 3 → 4 → 5 → 6
- **Standard**: 0 → 1 → 2 → 3 → 4 → 5 (+QA) → 6
- **Complex**: 0 → 1 (+ADR) → 2 → 3 → 4 → 5 (+QA) → 6

### 3 Complexity Tiers

| Tier | Spec | Ticket | Plan | QA |
|------|:----:|:------:|:----:|:--:|
| Simple | Skip | Skip | Skip | Skip |
| Standard | Yes | Yes | Yes | Yes |
| Complex | Yes | Yes + ADR | Yes | Yes |

### 4 Autonomy Levels

Control how many human approval checkpoints are active:

| Level | Name | Human Checkpoints | Best For |
|-------|------|-------------------|----------|
| L1 | Full Control | All 5 | First sprint, learning SDD |
| L2 | Trusted | Plan + Merge | Normal development **(default)** |
| L3 | Autopilot | Merge only | Well-defined, repetitive tasks |
| L4 | Full Auto | None (CI/CD gates only) | Bulk simple tasks |

Quality gates (tests, lint, build, validators) **always run** regardless of level.

### Branching Strategy

Configurable per-project in `key_facts.md`:

- **GitHub Flow** (default): `main` + `feature/*` + `hotfix/*`. Best for MVPs.
- **GitFlow** (scaled): `main` + `develop` + `feature/*` + `release/*` + `hotfix/*`. For larger projects.

### Project Memory

Tracks institutional knowledge across sessions in `docs/project_notes/`:

- **sprint-X-tracker.md** — Sprint progress + Active Session (context recovery after compaction)
- **bugs.md** — Bug log with solutions and prevention notes
- **decisions.md** — Architectural Decision Records (ADRs)
- **key_facts.md** — Project configuration, ports, URLs, branching strategy

### Automated Hooks (Claude Code)

- **Quick Scan** — After developer agents finish, a fast grep-based scan (~2s, no API calls) checks for debug code, secrets, and TODOs. Critical issues block; warnings pass through.
- **Compaction Recovery** — After context compaction, injects a reminder to read the sprint tracker for context recovery.
- **Notifications** — Personal notification hooks (macOS/Linux) in `.claude/settings.local.json`.

### Multi-Tool Support

- **Claude Code**: Full support with agents, skills, hooks, and settings (`.claude/`)
- **Gemini**: Adapted agent format (`.gemini/`), same methodology via `ai-specs/specs/`
- **Other tools**: `AGENTS.md` provides universal instructions readable by 21+ AI coding tools

## Quick Start

### 1. Copy the template

```bash
cp -r template/ /path/to/your-project/
```

### 2. Configure for your project

Look for `<!-- CONFIG: ... -->` comments in these files:

| File | What to configure |
|------|-------------------|
| `CLAUDE.md` / `GEMINI.md` | Autonomy level (1-4) |
| `ai-specs/specs/backend-standards.mdc` | Backend tech stack |
| `ai-specs/specs/frontend-standards.mdc` | Frontend tech stack |
| `docs/project_notes/key_facts.md` | Project name, ports, URLs, branching strategy |
| `docs/specs/api-spec.yaml` | Server URLs |
| `AGENTS.md` | Monorepo layout |

### 3. Initialize and start

```
init sprint 0
start task B0.1
```

The workflow skill will guide you through each step with checkpoints based on your autonomy level.

## Template Structure

```
project/
├── AGENTS.md                            # Universal AI instructions (all tools)
├── CLAUDE.md                            # Claude Code config (autonomy, recovery)
├── GEMINI.md                            # Gemini config (autonomy)
├── .env.example                         # Environment variables template
├── .gitignore                           # Git ignore with secrets protection
│
├── .claude/
│   ├── agents/                          # 9 specialized agents
│   ├── skills/
│   │   ├── development-workflow/        # Main task workflow (Steps 0-6)
│   │   │   └── references/              # Templates, guides, examples
│   │   ├── bug-workflow/                # Bug triage and resolution
│   │   └── project-memory/              # Memory system setup
│   ├── hooks/quick-scan.sh              # Post-developer quality scan
│   ├── settings.json                    # Shared hooks (git-tracked)
│   └── settings.local.json              # Personal hooks (gitignored)
│
├── .gemini/
│   ├── agents/                          # 9 agents (Gemini format)
│   ├── settings.json                    # Gemini configuration
│   └── styles/default.md               # Response style
│
├── ai-specs/specs/
│   ├── base-standards.mdc              # Constitution + methodology
│   ├── backend-standards.mdc           # Backend patterns (DDD, Express, Prisma)
│   ├── frontend-standards.mdc          # Frontend patterns (Next.js, Tailwind, Radix)
│   └── documentation-standards.mdc     # Documentation update rules
│
└── docs/
    ├── project_notes/                   # Project memory
    │   ├── sprint-0-tracker.md          # Sprint tracker template
    │   ├── key_facts.md                 # Project configuration
    │   ├── bugs.md                      # Bug log
    │   └── decisions.md                 # ADRs
    ├── specs/
    │   ├── api-spec.yaml                # OpenAPI spec (backend)
    │   └── ui-components.md             # Component spec (frontend)
    └── tickets/                         # Task tickets (generated by workflow)
```

## Default Tech Stack

The template defaults to (configurable via `<!-- CONFIG -->` comments):

- **Backend**: Node.js + Express + Prisma + PostgreSQL
- **Frontend**: Next.js (App Router) + Tailwind CSS + Radix UI + Zustand
- **Shared Types**: Zod schemas in `shared/` workspace → `z.infer<>` for TypeScript types
- **Testing**: Jest (unit) + Playwright (e2e)
- **Methodology**: TDD + DDD + Spec-Driven Development

## Constitution (Immutable Principles)

These 6 principles apply to ALL tasks, ALL agents, ALL complexity levels:

1. **Spec First** — No implementation without an approved specification
2. **Small Tasks** — Work in baby steps, one at a time
3. **Test-Driven Development** — Write tests before implementation
4. **Type Safety** — Strict TypeScript, no `any`, runtime validation with Zod
5. **English Only** — All code, comments, docs, commits, and tickets in English
6. **Reuse Over Recreate** — Always check existing code before proposing new files

## Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) and/or [Gemini](https://gemini.google.com/)
- Node.js 18+
- `jq` (for quick-scan hook): `brew install jq` (macOS) or `apt install jq` (Linux)

## Roadmap

- **Agent Teams**: Parallel execution of independent tasks (waiting for Claude Code Agent Teams to stabilize)
- **PM Agent + L5 Autonomous**: AI-driven sprint orchestration with human review at sprint boundaries
- **Setup Script + npx**: Interactive installer (`npx create-sdd-project`) for automated setup

## License

MIT
