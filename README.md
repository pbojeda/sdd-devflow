# SDD DevFlow

[![npm version](https://img.shields.io/npm/v/create-sdd-project)](https://www.npmjs.com/package/create-sdd-project)
[![license](https://img.shields.io/npm/l/create-sdd-project)](LICENSE)
[![node](https://img.shields.io/node/v/create-sdd-project)](package.json)

**Spec-Driven Development workflow for AI-assisted coding.**

A complete development methodology for Claude Code and Gemini that combines specialized AI agents, workflow orchestration with human checkpoints, and institutional memory. Works with new and existing TypeScript/JavaScript projects.

## Quick Start

### New Project

```bash
npx create-sdd-project my-app
```

The interactive wizard asks about your stack, AI tools, and autonomy level. For defaults (fullstack Express+Next.js):

```bash
npx create-sdd-project my-app --yes
```

### Existing Project

```bash
cd your-existing-project
npx create-sdd-project --init
```

Scans your project, detects your stack and architecture, and installs SDD files adapted to your project. Never modifies existing code or overwrites existing files.

### After Setup

Open in your AI coding tool and run:

```
init sprint 0
start task B0.1
```

The workflow skill guides you through each step with checkpoints based on your autonomy level.

---

## What is SDD?

SDD DevFlow combines three proven practices:

1. **Spec-Driven Development** — Write specifications before code. Specs are the contract between planning and implementation.
2. **Test-Driven Development** — Red-Green-Refactor cycle for every feature.
3. **Human-in-the-Loop** — Strategic checkpoints with configurable autonomy levels that reduce human intervention as trust increases.

### Why use SDD DevFlow?

- **AI agents work better with structure.** Without guardrails, AI coding assistants produce inconsistent results. SDD provides the methodology, standards, and workflow that make AI output predictable and high-quality.
- **Institutional memory across sessions.** Sprint trackers, bug logs, and decision records survive context compaction and session boundaries.
- **Scales from solo to team.** Start at L1 (full control) while learning, scale to L4 (full auto) for repetitive tasks.
- **Works with your stack.** Not opinionated about frameworks — detects and adapts to Express, Fastify, NestJS, Next.js, Nuxt, Vue, Angular, and many more.

---

## What's Included

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

### 3 Skills (Slash Commands)

| Skill | Trigger | What it does |
|-------|---------|-------------|
| `development-workflow` | `start task B0.1`, `next task`, `init sprint N` | Orchestrates the complete 7-step workflow |
| `bug-workflow` | `report bug`, `fix bug`, `hotfix needed` | Bug triage, investigation, and resolution |
| `project-memory` | `set up project memory`, `log a bug fix` | Maintains institutional knowledge |

### Workflow (Steps 0–6)

```
0. SPEC      → spec-creator drafts specs        → Spec Approval
1. SETUP     → Branch, ticket, sprint tracker    → Ticket Approval
2. PLAN      → Planner creates implementation plan → Plan Approval
3. IMPLEMENT → Developer agent, TDD
4. FINALIZE  → Tests/lint/build, validator       → Commit Approval
5. REVIEW    → PR, code review, QA              → Merge Approval
6. COMPLETE  → Clean up, update tracker
```

**By complexity:**
- **Simple** (bug fixes, small tweaks): 1 → 3 → 4 → 5 → 6
- **Standard** (features): 0 → 1 → 2 → 3 → 4 → 5 (+QA) → 6
- **Complex** (architectural changes): 0 → 1 (+ADR) → 2 → 3 → 4 → 5 (+QA) → 6

### 4 Autonomy Levels

| Level | Name | Human Checkpoints | Best For |
|-------|------|-------------------|----------|
| L1 | Full Control | All 5 | First sprint, learning SDD |
| L2 | Trusted | Plan + Merge | Normal development **(default)** |
| L3 | Autopilot | Merge only | Well-defined, repetitive tasks |
| L4 | Full Auto | None (CI/CD gates only) | Bulk simple tasks |

Quality gates (tests, lint, build, validators) **always run** regardless of level.

### Project Memory

Tracks institutional knowledge across sessions in `docs/project_notes/`:

- **sprint-X-tracker.md** — Sprint progress + Active Session (context recovery after compaction)
- **bugs.md** — Bug log with solutions and prevention notes
- **decisions.md** — Architectural Decision Records (ADRs)
- **key_facts.md** — Project configuration, ports, URLs, branching strategy

### Automated Hooks (Claude Code)

- **Quick Scan** — After developer agents finish, a fast grep-based scan (~2s, no API calls) checks for debug code, secrets, and TODOs
- **Compaction Recovery** — After context compaction, injects a reminder to read the sprint tracker for context recovery

### Multi-Tool Support

| Tool | Support Level |
|------|--------------|
| **Claude Code** | Full — agents, skills, hooks, settings (`.claude/`) |
| **Gemini** | Full — agents, skills, commands, settings (`.gemini/`) |
| **Other AI tools** | `AGENTS.md` provides universal instructions (Cursor, Copilot, Windsurf, etc.) |

---

## `--init` Stack Detection

When running `--init` on an existing project, the scanner automatically detects:

| Category | Detected |
|----------|----------|
| **Backend frameworks** | Express, Fastify, Koa, NestJS, Hapi, AdonisJS |
| **ORMs** | Prisma, Mongoose, TypeORM, Sequelize, Drizzle, Knex, MikroORM, Objection.js |
| **Databases** | PostgreSQL, MySQL, SQLite, MongoDB, SQL Server, CockroachDB (from Prisma schema, `.env`, or dependencies) |
| **Frontend frameworks** | Next.js, Nuxt, Remix, Astro, SolidJS, React, Vue, Angular, Svelte |
| **Styling** | Tailwind CSS, styled-components, Emotion, Sass |
| **Component libraries** | Radix UI, Headless UI, Material UI, Chakra UI, Ant Design |
| **State management** | Zustand, Redux, Jotai, TanStack Query, Recoil, Pinia, MobX |
| **Testing** | Jest, Vitest, Mocha (unit) + Playwright, Cypress (e2e) |
| **Architecture** | MVC, DDD, feature-based, handler-based, flat |
| **Project type** | Monorepo (workspaces, Lerna, Turbo, pnpm) or single-package |

Standards files are adapted to match your actual architecture — not generic defaults.

---

## Template Structure

```
project/
├── AGENTS.md                            # Universal AI instructions (all tools)
├── CLAUDE.md                            # Claude Code config (autonomy, recovery)
├── GEMINI.md                            # Gemini config (autonomy)
├── .env.example                         # Environment variables template
│
├── .claude/
│   ├── agents/                          # 9 specialized agents
│   ├── skills/
│   │   ├── development-workflow/        # Main task workflow (Steps 0-6)
│   │   │   └── references/              # Templates, guides, examples
│   │   ├── bug-workflow/                # Bug triage and resolution
│   │   └── project-memory/              # Memory system setup
│   ├── hooks/quick-scan.sh              # Post-developer quality scan
│   └── settings.json                    # Shared hooks (git-tracked)
│
├── .gemini/
│   ├── agents/                          # 9 agents (Gemini format)
│   ├── skills/                          # Same 3 skills
│   ├── commands/                        # Slash command shortcuts
│   └── settings.json                    # Gemini configuration
│
├── ai-specs/specs/
│   ├── base-standards.mdc              # Constitution + methodology
│   ├── backend-standards.mdc           # Backend patterns
│   ├── frontend-standards.mdc          # Frontend patterns
│   └── documentation-standards.mdc     # Documentation rules
│
└── docs/
    ├── project_notes/                   # Project memory
    │   ├── sprint-0-tracker.md
    │   ├── key_facts.md
    │   ├── bugs.md
    │   └── decisions.md
    ├── specs/                           # API and UI specs
    └── tickets/                         # Task tickets (workflow-generated)
```

## Default Tech Stack

Configurable via the wizard or `<!-- CONFIG -->` comments in template files:

- **Backend**: Node.js + Express + Prisma + PostgreSQL
- **Frontend**: Next.js (App Router) + Tailwind CSS + Radix UI + Zustand
- **Shared Types**: Zod schemas with `z.infer<>` for TypeScript types
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

## Manual Setup (Alternative)

If you prefer manual configuration over the CLI wizard:

```bash
cp -r template/ /path/to/your-project/
```

Then look for `<!-- CONFIG: ... -->` comments in the files to customize.

## Roadmap

- **Agent Teams**: Parallel execution of independent tasks (waiting for Claude Code Agent Teams to stabilize)
- **PM Agent + L5 Autonomous**: AI-driven sprint orchestration with human review at sprint boundaries
- **Retrofit Testing**: Automated test generation for existing projects with low coverage

## License

MIT
