# SDD DevFlow

[![npm version](https://img.shields.io/npm/v/create-sdd-project)](https://www.npmjs.com/package/create-sdd-project)
[![npm downloads](https://img.shields.io/npm/dm/create-sdd-project)](https://www.npmjs.com/package/create-sdd-project)
[![license](https://img.shields.io/npm/l/create-sdd-project)](LICENSE)
[![node](https://img.shields.io/node/v/create-sdd-project)](package.json)

**Spec-Driven Development workflow for AI-assisted coding.**

A complete development methodology for Claude Code and Gemini that combines specialized AI agents, workflow orchestration with human checkpoints, and institutional memory. Works with new and existing TypeScript/JavaScript projects.

## Quick Start

### New Project

```bash
npx create-sdd-project my-app
```

The interactive wizard asks about your stack, AI tools, and autonomy level:

```
🚀 Create SDD DevFlow Project

── Step 1: Project Basics ──────────────────────
  Project name: my-app
  Brief project description: Task management API

── Step 3: Project Type & Tech Stack ──────────
  1) Backend + Frontend (monorepo)  ← default
  2) Backend only
  3) Frontend only

── Step 4: AI Tools ────────────────────────────
  1) Claude Code + Gemini  ← default
  2) Claude Code only
  3) Gemini only

── Step 5: Workflow Configuration ──────────────
  Autonomy level:
  1) L1 Full Control — Human approves every checkpoint
  2) L2 Trusted — Human reviews plans + merges only  ← default
  3) L3 Autopilot — Human only approves merges
  4) L4 Full Auto — No human checkpoints, CI/CD gates only
```

For defaults (fullstack Express+Next.js, L2 autonomy):

```bash
npx create-sdd-project my-app --yes
```

### Existing Project

```bash
cd your-existing-project
npx create-sdd-project --init
```

The scanner detects your stack and installs adapted SDD files:

```
🔍 Scanning project...

    Project:       my-api
    Language:      TypeScript
    Backend:       Express + Mongoose + MongoDB
    Frontend:      Not detected
    Architecture:  Layered (controllers + handlers + managers)
    Tests:         Jest (3 test files)
    Monorepo:      No

Adding SDD DevFlow to my-api...

  ✓ Installing Claude Code config (agents, skills, commands, hooks)
  ✓ Installing Gemini config (agents, skills, commands)
  ✓ Creating ai-specs/specs/ (4 standards files)
  ✓ Creating docs/project_notes/ (product tracker, memory)
  ✓ Creating AGENTS.md
  ✓ Setting autonomy level: L2 (Trusted)

Done! Next steps:
  git add -A && git commit -m "chore: add SDD DevFlow to existing project"
  # Open in your AI coding tool and run: add feature "your first feature"
```

Never modifies existing code or overwrites existing files.

### Upgrade

When a new version of SDD DevFlow is released, upgrade your project's template files:

```bash
cd your-existing-project
npx create-sdd-project@latest --upgrade
```

```
🔄 SDD DevFlow Upgrade

  Current version:  0.4.2
  New version:      0.5.0
  AI tools:         Claude Code + Gemini
  Project type:     backend

  Will replace:
    ✓ .claude/ (agents, skills, hooks)
    ✓ .gemini/ (agents, skills, commands)
    ✓ AGENTS.md, CLAUDE.md / GEMINI.md
    ✓ .env.example

  Will preserve:
    ⊘ .claude/settings.local.json (personal settings)
    ⊘ docs/project_notes/* (project memory)
    ⊘ docs/specs/* (your specs)
    ⊘ docs/tickets/* (your tickets)
    ⊘ .gitignore

  Standards:
    ✓ ai-specs/specs/base-standards.mdc — unchanged, will update
    ⚠ ai-specs/specs/backend-standards.mdc — modified by you, preserved

  Proceed? (y/N)
```

**What gets upgraded:**
- Agent definitions, skills, hooks, and commands
- `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.env.example`
- Standards files (`.mdc`) — only if you haven't customized them

**What is always preserved:**
- Your project documentation (`docs/project_notes/`, `docs/specs/`, `docs/tickets/`)
- Custom agents you added to `.claude/agents/` or `.gemini/agents/`
- Custom commands in `.claude/commands/`
- Personal settings (`.claude/settings.local.json`)
- Your `.gitignore`
- Autonomy level setting

For non-interactive upgrades (CI/scripts): `npx create-sdd-project@latest --upgrade --yes`

### Doctor (Diagnose Installation)

Check that your SDD installation is healthy:

```bash
cd your-project
npx create-sdd-project --doctor
```

```
🩺 SDD DevFlow Doctor

  ✓ SDD installed (v0.5.0)
  ✓ Version up to date (0.5.0)
  ✓ AI tools: Claude Code + Gemini
  ✓ Top-level configs present (AGENTS.md, CLAUDE.md, GEMINI.md)
  ✓ Agents: 8/8 present
  ✓ Project type coherence: OK (fullstack)
  ✓ Cross-tool consistency: Claude and Gemini in sync
  ✓ Standards: 4/4 present
  ✓ Hooks: quick-scan.sh executable, jq installed, settings.json valid
  ✓ Project memory: 4/4 files present

  Overall: HEALTHY
```

**What it checks:** SDD files present, version, agents for your project type, no stray frontend agents in backend projects (and vice versa), Claude and Gemini agents in sync, standards files, hooks and dependencies (`jq`), settings.json integrity, project memory files.

Exit code 1 if errors found — useful for CI pipelines.

### Eject (Uninstall SDD)

Cleanly remove all SDD DevFlow files from your project:

```bash
cd your-project
npx create-sdd-project --eject
```

```
🗑️  SDD DevFlow Eject

  Installed version:  0.7.0
  AI tools:           Claude Code + Gemini
  Project type:       backend

  Will remove:
    ✗ .claude/agents/           template agents
    ✗ .claude/skills/
    ✗ .claude/hooks/
    ✗ .claude/settings.json
    ✗ .gemini/                  entire directory
    ✗ ai-specs/                 standards
    ✗ AGENTS.md
    ✗ CLAUDE.md / GEMINI.md
    ✗ .env.example
    ✗ .sdd-version
    ✗ .github/workflows/ci.yml  (SDD-generated)

  Will preserve:
    ⊘ .claude/agents/my-agent.md   (custom agent)
    ⊘ .claude/settings.local.json  (personal settings)
    ⊘ docs/                        (project notes, specs, tickets)

  Proceed? (y/N)
```

**What gets removed:** All SDD-generated files (agents, skills, hooks, standards, configs, CI workflow).

**What is always preserved:** Custom agents, custom commands, personal settings, project documentation (`docs/`), customized CI workflows (without SDD marker).

For non-interactive eject: `npx create-sdd-project --eject --yes`

Preview what would be removed: `npx create-sdd-project --eject --diff`

To re-install later: `npx create-sdd-project --init`

### Preview Changes (--diff)

See what `--init`, `--upgrade`, or `--eject` would do without modifying anything:

```bash
cd your-existing-project
npx create-sdd-project --init --diff      # Preview init
npx create-sdd-project --upgrade --diff   # Preview upgrade
npx create-sdd-project --eject --diff    # Preview eject
```

Shows detected stack, files that would be created/replaced/preserved, and standards status — zero filesystem writes.

### CI/CD (Auto-Generated)

Every project gets a GitHub Actions CI workflow at `.github/workflows/ci.yml`, adapted to your stack:

- **PostgreSQL** projects get a `postgres:16` service with health checks
- **MongoDB** projects get a `mongo:7` service with health checks
- **Frontend-only** projects get a lightweight workflow without DB services
- **GitFlow** projects trigger on both `main` and `develop` branches

Customize the generated workflow as your project grows.

### After Setup

Open your project in Claude Code or Gemini and start building:

**Claude Code:**
```
/add-feature "user authentication with JWT"
/start-task F001
/show-progress
/next-task
```

**Gemini:**
```
/add-feature "user authentication with JWT"
/start-task F001
/show-progress
/next-task
```

The workflow skill guides you through each step — from spec writing to implementation to code review — with checkpoints based on your autonomy level.

---

## What is SDD?

SDD DevFlow combines three proven practices:

1. **Spec-Driven Development** — Write specifications before code. Specs are the contract between planning and implementation.
2. **Test-Driven Development** — Red-Green-Refactor cycle for every feature.
3. **Human-in-the-Loop** — Strategic checkpoints with configurable autonomy levels that reduce human intervention as trust increases.

### Why use SDD DevFlow?

- **AI agents work better with structure.** Without guardrails, AI coding assistants produce inconsistent results. SDD provides the methodology, standards, and workflow that make AI output predictable and high-quality.
- **Institutional memory across sessions.** Product tracker, bug logs, and decision records survive context compaction and session boundaries.
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

### 4 Skills (Slash Commands)

| Skill | Trigger | What it does |
|-------|---------|-------------|
| `development-workflow` | `start task F001`, `next task`, `add feature` | Orchestrates the complete 7-step workflow |
| `bug-workflow` | `report bug`, `fix bug`, `hotfix needed` | Bug triage, investigation, and resolution |
| `project-memory` | `set up project memory`, `log a bug fix` | Maintains institutional knowledge |
| `health-check` | `health check`, `project health` | Quick scan: tests, build, specs sync, secrets, docs freshness |

### 2 Custom Commands

| Command | What it does |
|---------|-------------|
| `/review-plan` | Sends Implementation Plan to external AI models (Codex CLI, Gemini CLI) for independent critique |
| `/context-prompt` | Generates a context recovery prompt after `/compact` with Workflow Recovery to prevent checkpoint skipping |

### Plan Quality

Every Standard/Complex feature plan goes through a **built-in self-review** (Step 2.4) where the agent re-reads its own plan and checks for errors, vague steps, wrong assumptions, and over-engineering before requesting approval.

For additional confidence, the optional `/review-plan` command sends the plan to external AI models (Codex CLI and/or Gemini CLI in parallel) for independent critique — catching blind spots that same-model review misses.

### Workflow (Steps 0–6)

```
0. SPEC      → spec-creator drafts specs        → Spec Approval
1. SETUP     → Branch, ticket, product tracker    → Ticket Approval
2. PLAN      → Planner creates plan + self-review → Plan Approval
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
| L1 | Full Control | All 5 | First feature, learning SDD |
| L2 | Trusted | Plan + Merge | Normal development **(default)** |
| L3 | Autopilot | Merge only | Well-defined, repetitive tasks |
| L4 | Full Auto | None (CI/CD gates only) | Bulk simple tasks |

Quality gates (tests, lint, build, validators) **always run** regardless of level.

### Merge Checklist (B+D Mechanism)

Every ticket includes a `## Merge Checklist Evidence` table that the agent must fill before requesting merge approval. This mechanism:

- **Survives context compaction** — the ticket is always re-read via product tracker, so the empty evidence table acts as a persistent reminder
- **Forces sequential execution** — agent must read `references/merge-checklist.md`, execute 9 actions (0–8), and record evidence
- **Works at all tiers** — Simple tasks get a lite ticket with the same evidence table

Validated across 16+ features with 87% first-attempt pass rate (failures led to iterative improvements in v0.8.7–v0.9.8).

### Project Memory

Tracks institutional knowledge across sessions in `docs/project_notes/`:

- **product-tracker.md** — Feature backlog + Active Session (context recovery after compaction)
- **bugs.md** — Bug log with solutions and prevention notes
- **decisions.md** — Architectural Decision Records (ADRs)
- **key_facts.md** — Project configuration, ports, URLs, branching strategy

### Automated Hooks (Claude Code)

- **Quick Scan** — After developer agents finish, a fast grep-based scan (~2s, no API calls) checks for debug code, secrets, and TODOs
- **Compaction Recovery** — After context compaction, injects a reminder to read the product tracker for context recovery

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
| **Architecture** | MVC, DDD, feature-based, handler-based, layered, flat |
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
├── .github/
│   └── workflows/ci.yml                 # CI pipeline (adapted to your stack)
│
├── .claude/
│   ├── agents/                          # 9 specialized agents
│   ├── skills/
│   │   ├── development-workflow/        # Main task workflow (Steps 0-6)
│   │   │   └── references/              # Templates, guides, examples
│   │   ├── bug-workflow/                # Bug triage and resolution
│   │   ├── health-check/               # Project health diagnostics
│   │   └── project-memory/              # Memory system setup
│   ├── commands/                        # Custom slash commands
│   │   ├── review-plan.md              # Cross-model plan review
│   │   └── context-prompt.md           # Post-compact context recovery
│   ├── hooks/quick-scan.sh              # Post-developer quality scan
│   └── settings.json                    # Shared hooks (git-tracked)
│
├── .gemini/
│   ├── agents/                          # 9 agents (Gemini format)
│   ├── skills/                          # Same 4 skills
│   ├── commands/                        # Slash commands (workflow + review + context)
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
    │   ├── product-tracker.md
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
- **Shared Types**: Validation schemas with TypeScript type inference
- **Testing**: Jest (unit) + Playwright (e2e)
- **Methodology**: TDD + DDD + Spec-Driven Development

## Constitution (Immutable Principles)

These 6 principles apply to ALL tasks, ALL agents, ALL complexity levels:

1. **Spec First** — No implementation without an approved specification
2. **Small Tasks** — Work in baby steps, one at a time
3. **Test-Driven Development** — Write tests before implementation
4. **Type Safety** — Strict TypeScript, no `any`, runtime validation at boundaries
5. **English Only** — All code, comments, docs, commits, and tickets in English
6. **Reuse Over Recreate** — Always check existing code before proposing new files

## Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) and/or [Gemini](https://gemini.google.com/)
- Node.js 18+
- `jq` (for quick-scan hook): `brew install jq` (macOS) or `apt install jq` (Linux)

## Manual Setup

If you prefer manual configuration over the CLI wizard, copy the template directory and look for `<!-- CONFIG: ... -->` comments in the files to customize:

```bash
cp -r node_modules/create-sdd-project/template/ /path/to/your-project/
```

## Roadmap

- **PM Agent + L5 Autonomous**: AI-driven feature orchestration — sequential feature loop with automatic checkpoint approval and session state persistence
- **`/review-project` command**: Comprehensive project review using multiple AI models in parallel (Claude + Gemini + Codex) with consolidated action plan
- **Monorepo improvements**: Better support for pnpm workspaces and Turbo
- **Retrofit Testing**: Automated test generation for existing projects with low coverage
- **Agent Teams**: Parallel execution of independent tasks

## Contributing

Found a bug or have a suggestion? [Open an issue on GitHub](https://github.com/pbojeda/sdd-devflow/issues).

## License

MIT
