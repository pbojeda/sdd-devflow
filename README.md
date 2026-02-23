# SDD DevFlow

**Spec-Driven Development workflow template for AI-assisted coding.**

A battle-tested development methodology extracted from 50+ tasks across multiple projects, designed for Claude Code and Gemini. Combines specialized AI agents, workflow orchestration with human checkpoints, and institutional memory.

## What's Inside

### 9 Specialized Agents

| Agent | Role |
|-------|------|
| `spec-creator` | Draft specifications before planning |
| `backend-planner` | Create backend implementation plans |
| `frontend-planner` | Create frontend implementation plans |
| `backend-developer` | TDD implementation (backend) |
| `frontend-developer` | TDD implementation (frontend) |
| `production-code-validator` | Pre-commit quality scan |
| `code-review-specialist` | Pre-merge code review |
| `qa-engineer` | Edge cases and spec verification |
| `database-architect` | Schema design and optimization |

### 6-Step Workflow

```
1. SPEC       → spec-creator drafts specs           → Spec Approval
2. SETUP      → Branch, ticket, sprint tracker       → Ticket Approval
3. PLAN       → Planner creates implementation plan  → Plan Approval
4. IMPLEMENT  → Developer agent, TDD
5. FINALIZE   → Tests/lint/build, validator          → Commit Approval
6. REVIEW     → PR, reviewer, QA                     → Merge Approval
```

### 3 Complexity Tiers

- **Simple**: Skip spec/ticket/plan. Direct implement → commit → PR.
- **Standard**: Full 6-step workflow with all checkpoints.
- **Complex**: Standard + ADR review + mandatory QA engineer.

### Project Memory System

Tracks institutional knowledge across sessions:
- `bugs.md` — Bug solutions and prevention
- `decisions.md` — Architectural Decision Records
- `key_facts.md` — Project configuration
- `sprint-X-tracker.md` — Sprint progress

### Multi-Tool Support

Works with both Claude Code (`.claude/`) and Gemini (`.gemini/`). Same methodology, adapted formats.

## Quick Start

### 1. Copy the template

```bash
cp -r template/ /path/to/your-project/
```

### 2. Configure for your project

- Edit `CLAUDE.md` — adjust project structure section
- Edit `ai-specs/specs/backend-standards.mdc` — adjust tech stack
- Edit `ai-specs/specs/frontend-standards.mdc` — adjust tech stack
- Fill in `docs/project_notes/key_facts.md`

### 3. Initialize a sprint

```
start task B0.1
# or
init sprint 0
```

### 4. Start working

```
start task B0.1
```

The workflow will guide you through each step with checkpoints.

## Template Structure

```
template/
├── .claude/                          # Claude Code configuration
│   ├── agents/                       # 9 specialized agents
│   ├── skills/                       # 3 workflow skills
│   │   ├── development-workflow/     # Main task workflow (6 steps)
│   │   ├── bug-workflow/             # Bug triage and resolution
│   │   └── project-memory/           # Memory system setup
│   ├── commands/                     # Custom slash commands
│   └── settings.local.json           # Recommended permissions
├── .gemini/                          # Gemini configuration
│   ├── agents/                       # 9 agents (Gemini format)
│   └── styles/                       # Gemini style definitions
├── ai-specs/specs/                   # Development standards
│   ├── base-standards.mdc            # Core methodology
│   ├── backend-standards.mdc         # Backend patterns
│   ├── frontend-standards.mdc        # Frontend patterns
│   └── documentation-standards.mdc   # Documentation rules
├── docs/
│   ├── project_notes/                # Memory system
│   ├── specs/                        # API spec, UI spec
│   └── tickets/                      # Task tickets
├── CLAUDE.md                         # Main AI instruction file
├── GEMINI.md                         # Gemini entry point
└── .gitignore.template               # Recommended gitignore
```

## Stack Profiles

The `profiles/` directory contains stack configuration files. The default profile uses:

- **Backend**: Node.js + Express + Prisma + PostgreSQL
- **Frontend**: Next.js (App Router) + Tailwind CSS + Radix UI
- **Testing**: Jest (unit) + Playwright (e2e)
- **Methodology**: TDD + DDD + Spec-Driven Development

See `profiles/README.md` for customization options.

## Customization

Files marked with `<!-- CONFIG: ... -->` comments indicate stack-specific content that should be adjusted for your project. Key files to customize:

1. `CLAUDE.md` — Project structure and directory rules
2. `ai-specs/specs/backend-standards.mdc` — Backend tech stack
3. `ai-specs/specs/frontend-standards.mdc` — Frontend tech stack
4. `docs/specs/api-spec.yaml` — API specification template
5. `docs/project_notes/key_facts.md` — Project configuration

## Methodology

SDD DevFlow combines three proven practices:

1. **Spec-Driven Development** — Write specifications before code. Specs are the contract between planning and implementation.
2. **Test-Driven Development** — Red-Green-Refactor cycle for every feature. Tests define the expected behavior before implementation.
3. **Human-in-the-Loop** — Strategic checkpoints (spec, ticket, plan, commit, merge) ensure quality without slowing down autonomous work.

## License

MIT
