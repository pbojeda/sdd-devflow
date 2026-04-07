# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.15.0] - 2026-04-07

### Added

- **`/audit-merge` command** — automated compliance audit that runs 11 checks before merge approval: ticket Status, AC/DoD completion, workflow checklist, merge checklist evidence, completion log, tracker sync, key_facts.md, merge base divergence, working tree, and data file integrity. Fixes issues automatically when possible and includes audit output in the merge approval request so human reviewers can skip compliance checks and focus on code/architecture review.
  - Integrated into merge checklist as Action 9 (before Request Approval, now Action 10)
  - Works with both Claude Code and Gemini CLI
  - 5th custom command (alongside review-spec, review-plan, review-project, context-prompt)

## [0.14.0] - 2026-04-07

### Added

- **Merge base check in merge checklist** — new Action 7 runs `git merge-base --is-ancestor` to verify the feature branch is up to date with the target branch before merge approval. If diverged, instructs the agent to merge the target branch and re-run quality gates. Prevents merge conflicts discovered at PR time. (Actions renumbered: Evidence is now Action 8, Request Approval is Action 9)
- **Data file validation in `production-code-validator`** — new check category (section 9) validates JSON/seed files for case consistency in string arrays, duplicate IDs, inconsistent object shapes, and suspicious value ranges. Catches data quality issues like mixed-case aliases that break case-sensitive queries.

### Fixed

- **Ticket Status field now updates at every workflow step** — explicit Status transitions added to SKILL.md: `Spec` (Step 0) → `In Progress` (Step 1) → `Planning` (Step 2) → `In Progress` (Steps 3-4) → `Review` (Step 5) → `Ready for Merge` (merge checklist) → `Done` (Step 6). Previously only the merge checklist (Step 5) and Step 6 set Status, leaving tickets stuck on "In Progress" during most of the workflow. Valid Status values expanded from 3 to 6 in ticket template.

## [0.13.2] - 2026-03-29

### Fixed

- **Enforce strict sequential step execution** — agents can no longer parallelize steps (e.g., generating Implementation Plan while Spec Approval is still pending). Includes Auto checkpoint clarification: auto-approval happens in order, not in parallel. Reviewed by Codex GPT-5.4.

## [0.13.1] - 2026-03-28

### Fixed

- **Ticket Status field now updates during workflow** — merge checklist Action 1 sets Status to `Ready for Merge`, Step 6 sets it to `Done` (previously stayed `In Progress` forever — caught in 3 consecutive audits)
- Ticket template now documents valid Status values: `In Progress | Ready for Merge | Done`

## [0.13.0] - 2026-03-25

### Added

- **`ui-ux-designer` agent** — produces actionable design specifications (never code)
  - **Design System Setup mode**: creates/updates `docs/specs/design-guidelines.md` with 11 sections (visual direction, colors, typography, spacing, components, animations, states, content hierarchy, accessibility, imagery, anti-patterns)
  - **Feature Design Notes mode**: writes `### Design Notes` in the ticket for feature-specific visual and interaction decisions
  - Invoked manually (like `database-architect`) — not forced into the workflow
  - Removed automatically for backend-only projects
- **`docs/specs/design-guidelines.md`** — new living spec document consumed by `frontend-planner` and `frontend-developer`
- **Passive design reminder** in Step 0: workflow suggests invoking `ui-ux-designer` when a feature includes UI changes (non-blocking)
- `frontend-planner` and `frontend-developer` now read `design-guidelines.md` when it exists

### Fixed

- `spec-creator` no longer creates per-feature spec files in `docs/specs/` — feature specs belong exclusively in the ticket's `## Spec` section
- Global spec files (`api-spec.yaml`, `ui-components.md`) are still updated as before

## [0.12.1] - 2026-03-25

### Fixed

- `spec-creator` adaptation rules updated for backend-only and frontend-only projects

## [0.12.0] - 2026-03-25

### Changed

- `/review-spec` and `/review-plan` are now **automatic** in the development workflow (Steps 0 and 2)
  - After self-review, the workflow automatically runs the cross-model review command
  - Only triggers when at least one external CLI is available (`gemini`/`codex` for Claude, `claude`/`codex` for Gemini)
  - If no external CLIs are detected, the step is skipped (self-review is sufficient)
  - Previously both commands were optional and required manual invocation

## [0.11.1] - 2026-03-25

### Fixed

- `/review-spec` extraction now captures Spec + Acceptance Criteria (was stopping at `## Implementation Plan`, missing AC needed for testability review)
- Removed `--full-auto` flag from Codex invocations in `/review-spec` — review commands should be read-only, not grant write permissions

### Improved

- **Shell hardening across `/review-spec` and `/review-plan`:**
  - `which` → `command -v` (POSIX-portable CLI detection)
  - Fixed `/tmp/` paths → project-scoped temp dirs (`/tmp/review-{spec|plan}-$PROJECT/`) to prevent cross-project collisions
  - `TICKET=$(ls ...)` → safer glob expansion with comment to verify single match
  - Path A now tracks PIDs and validates exit codes per reviewer — failed CLIs are flagged instead of silently treated as valid reviews
  - `sed` patterns anchored with `^`/`$` to prevent false matches on subsection headers

## [0.11.0] - 2026-03-24

### Added

- `/review-spec` command template for reviewing feature specs before planning
  - 7 spec-focused review criteria: Completeness, Ambiguity, Edge cases, API contract, Scope, Consistency, Testability
  - Same Path A/B/C architecture as `/review-plan` (Gemini CLI + Codex CLI + self-review fallback)
  - Includes project context (`key_facts.md`, `decisions.md`) for architectural consistency checks
  - Extracts Spec + Acceptance Criteria sections from ticket — reviewers can validate both requirements and testability
- **Spec Self-Review** (Step 0.4) added to development workflow SKILL.md
  - Built-in adversarial self-review after `spec-creator` runs, before planning
  - Checks: completeness, edge cases, API contract, testability, architectural consistency

## [0.10.0] - 2026-03-22

### Added

- `/review-project` command template for comprehensive project-level review at MVP milestones
  - 4-phase architecture: Discovery → Audit Context + Digest + Launch → Domain-by-domain Review → Consolidation
  - Uses up to 3 AI models in parallel (Claude + Gemini CLI + Codex CLI) with graceful degradation (Path A/B/C)
  - **Audit context generation** (Step 1a): primary agent reads project docs and generates a concise project brief prepended to the digest — external models get architecture, decisions, and risk-specific audit focus, not just raw code
  - 6 review domains: Architecture, Source Quality, Data Layer, Testing/CI, Security/Reliability, Documentation
  - Project-scoped state directory (`/tmp/review-project-{name}/`) prevents cross-project contamination
  - Compaction-resilient: progress file tracks completed domains, resumable after /compact
  - Robust CLI detection (`command -v` + real invocation test, not just `which`)
  - Each domain output includes "Files Reviewed" manifest for coverage verification
  - External model output validation (checks for severity markers + VERDICT before trusting)
  - Outputs `review-project-report.md` (findings with confidence levels) and `review-project-actions.md` (prioritized action plan)
  - Portable bash: `find -not -path` instead of `grep -v`, `IFS= read -r` for safe path handling, no `timeout` dependency
  - `.mjs`/`.cjs` support in digest assembly, safe `sh -c` quoting via `export`, digest resume skip, `grep -qE` portability
  - Available for both Claude Code and Gemini CLI

## [0.9.9] - 2026-03-22

### Changed

- README updated: 4 skills (added `health-check`), 2 custom commands (`/review-plan`, `/context-prompt`), new Merge Checklist (B+D) section, template structure with `commands/` and `health-check/`, current roadmap
- Internal roadmap updated with `/context-prompt` (done) and `/review-project` (planned)

## [0.9.8] - 2026-03-21

### Added

- `/context-prompt` command template for context recovery after `/compact` or new sessions
  - Includes **Workflow Recovery** section (points 11-14) that explicitly reminds the agent about merge-checklist.md, checkpoint order, and Evidence table
  - Prevents the agent from skipping Step 5 (Merge Approval) after context compaction — addresses F028 regression where Evidence table was left empty
  - Available for both Claude Code and Gemini CLI
  - Added to `TEMPLATE_COMMANDS` config — `--upgrade` delivers it automatically, `collectCustomCommands()` filters it correctly

## [0.9.7] - 2026-03-19

### Fixed

- `--upgrade` now overwrites SDD template commands (e.g., `review-plan.md`) with the latest version
  - Root cause: v0.9.4 fix only copied *new* template commands but skipped overwriting *existing* ones, so updated templates never reached projects that already had the old version
  - Added `TEMPLATE_COMMANDS` config list (parallel to `TEMPLATE_AGENTS`) to distinguish SDD-owned commands from user custom commands
  - `collectCustomCommands()` no longer counts template-owned commands as custom — fixes misleading display in `--upgrade`, `--diff`, and `--eject` summaries
  - Test: Scenario 16 now verifies outdated template commands are overwritten (not just that new ones are copied)

## [0.9.6] - 2026-03-19

### Changed

- `/review-plan` command rewritten for dual-model review (Gemini CLI + Codex CLI in parallel)
  - Spec included alongside plan so reviewers can check spec↔plan consistency
  - Three paths: Path A (both CLIs, parallel), Path B (one CLI), Path C (self-review fallback when no CLI available)
  - Uses stdin pipes instead of shell argument expansion (avoids ARG_MAX on large plans)
  - Anti-hallucination prompt: "do not manufacture issues that are not there"
  - No hardcoded model names — CLIs use their latest default model automatically
  - Claude and Gemini templates updated symmetrically

## [0.9.5] - 2026-03-18

### Fixed

- `--upgrade` no longer duplicates the "Project-specific variables" comment in `.env.example` on repeated upgrades
  - Root cause: the merge logic collected the injected header comment as a "custom line" and re-prepended it each time
  - Now filters out the header before collecting custom lines, making the operation idempotent

## [0.9.4] - 2026-03-18

### Fixed

- `--upgrade` now copies new template commands to `.claude/commands/` without overwriting user's custom commands
  - Root cause: upgrade logic for `.claude/commands/` only ensured the directory existed but never copied new template files (comment said "template only has .gitkeep", which was true before v0.9.3 added `review-plan.md`)
  - Gemini commands were unaffected (`.gemini/commands/` is fully replaced on upgrade)
  - Projects upgraded to v0.9.3 are missing `.claude/commands/review-plan.md` — upgrading to v0.9.4 fixes this

## [0.9.3] - 2026-03-18

### Added

- **Plan Self-Review** (Step 2.4): agent automatically re-reads its own Implementation Plan and checks for errors, vague steps, wrong assumptions, dependency ordering issues, and over-engineering before requesting Plan Approval
  - Runs automatically for all Standard/Complex features — zero configuration needed
  - Inspired by [cross-model plan review patterns](https://medium.com/flow-specialty/ai-assisted-coding-automating-plan-reviews-with-claude-code-and-codex-for-higher-quality-plans-c7e373a625ca)
- `/review-plan` command (optional): sends the Implementation Plan to an external AI model (Codex CLI, Gemini CLI, or Claude Code) for independent critique
  - Cross-model review catches blind spots that same-model self-review misses
  - Includes structured prompt template with CRITICAL/IMPORTANT/SUGGESTION severity levels
  - Works with any CLI-based AI tool that accepts text prompts
  - Symmetric support for Claude Code (`.claude/commands/review-plan.md`) and Gemini (`.gemini/commands/review-plan.toml`)

## [0.9.2] - 2026-03-17

### Fixed

- Compact recovery hook now instructs agent to re-read SKILL.md after context compaction
  - Root cause: after `/compact`, agents recover context from tracker Active Session but never re-read SKILL.md, so Step 5's "STOP. Read merge-checklist.md" instruction is lost. Validated: F018 (Standard) went through 2 compactions and skipped merge checklist entirely despite having the B+D evidence table in the ticket.
  - Hook now includes 3 explicit steps: (1) read tracker, (2) re-read SKILL.md for current step, (3) if at Step 5+, read merge-checklist.md and fill evidence table
- Session Recovery protocol in CLAUDE.md updated with explicit merge-checklist reminder at Step 5+

## [0.9.1] - 2026-03-16

### Fixed

- Simple tasks now generate a **lite ticket** (header, AC, DoD, Workflow Checklist, Completion Log, Merge Checklist Evidence)
  - Root cause: Simple complexity skipped ticket creation entirely, so the B+D evidence table had nowhere to live — merge checklist was unreachable for Simple tasks
  - Lite ticket uses same `ticket-template.md` but with minimal Spec (one-liner) and `Implementation Plan: N/A — Simple task`
  - Workflow Checklist for Simple: Steps 1, 3, 4, 5 only
- Merge checklist Actions 0 and 1 no longer marked "(Std/Cplx)" — now apply to all tiers
  - Action 0 includes note for Simple lite tickets (Spec and Plan may be minimal)
  - Action 1 clarifies which Workflow Checklist steps apply per tier
- Complexity guide updated: Simple effect now mentions lite ticket and merge checklist
- Symmetric changes in both Claude and Gemini templates

## [0.9.0] - 2026-03-16

### Added

- `## Merge Checklist Evidence` section in ticket template (option B+D)
  - Empty evidence table in every ticket acts as anchor that survives context compaction
  - Agent must read `references/merge-checklist.md`, execute all 11 actions (0–10), and fill evidence for actions 0–7
  - Root cause: after `/compact` or long sessions, agents lose SKILL.md context and never reach the "Read merge-checklist.md" instruction. The ticket is always re-read (via tracker Active Session), making it the ideal anchor for forcing the checkpoint.
  - v0.8.9 external reference (option B) works at session start but fails post-compact (validated: F010 PASS, F011 FAIL)
  - New Action 7 (Fill Evidence) + Action 8 (Request Merge) replace old Action 7
- Step 1 ticket validation now checks for 7 sections (added Merge Checklist Evidence)
- Symmetric changes in both Claude and Gemini templates

## [0.8.9] - 2026-03-16

### Changed

- Merge Approval checkpoint actions moved from inline SKILL.md text to `references/merge-checklist.md`
  - Forces agent to perform a Read tool call to load the checklist, bringing actions into active context
  - Root cause: agents in long sessions lost SKILL.md context and skipped the inline checkpoint actions (observed in F007b, F008, F009 despite v0.8.8 fixes)
  - The 8 actions are identical to v0.8.8 but now live in a dedicated reference file

## [0.8.8] - 2026-03-13

### Fixed

- Step 1 ticket generation now includes post-generation validation: agent must verify all 6 sections exist in correct order (Spec → Implementation Plan → Acceptance Criteria → Definition of Done → Workflow Checklist → Completion Log)
- Merge Approval checkpoint now validates ticket structure (action 0) before marking items — if any required section is missing, agent must add it from `references/ticket-template.md` before proceeding
  - Root cause: agents generating tickets in long sessions would omit sections (Workflow Checklist, Completion Log) due to context loss, then checkpoint couldn't enforce marking

## [0.8.7] - 2026-03-12

### Changed

- Merge Approval checkpoint rewritten as action-oriented steps instead of passive checklist
  - Forces agent to re-read ticket file and product tracker (brings them into active context)
  - Sequential numbered actions: read → mark → update → commit → verify → request
  - Addresses recurring issue where agents skipped documentation updates (F004, F005, F006)

## [0.8.6] - 2026-03-12

### Added

- Desktop notifications via Notification hooks in `settings.json` (cross-platform: macOS, Linux, terminal bell fallback)
  - `permission_prompt`: notifies when Claude needs approval
  - `idle_prompt`: notifies when Claude finishes and waits for input
  - Delivered automatically on `--upgrade` (hooks in `settings.json` are replaced, user permissions preserved)

### Changed

- Moved Notification hooks from `settings.local.json` to `settings.json` (shared, upgradeable)
- `settings.local.json` now contains only permissions (personal, preserved on upgrade)

## [0.8.5] - 2026-03-12

### Fixed

- Step 1 ticket generation now explicitly requires ALL template sections (Definition of Done, Workflow Checklist, Completion Log were being omitted by agents)

## [0.8.4] - 2026-03-11

### Fixed

- Pre-merge checklist now marks ticket items as `Std/Cplx only` — Simple tasks don't have tickets

## [0.8.3] - 2026-03-11

### Fixed

- Pre-merge checklist: documentation updates now part of the Merge Approval checkpoint (blocker, not suggestion)
- Per-step tracker updates now explicitly include ticket Workflow Checklist marking
- QA agent no longer creates "QA PASS" entries in bugs.md when no bugs are found

## [0.8.2] - 2026-03-10

### Fixed

- QA agent now records bugs in `bugs.md` when issues are found (was only documented in Step 6)
- Workflow Step 5 (Review) now includes explicit fix-commit loop after code-review/QA findings
- Product tracker Features table now updated at every workflow step (was only updated in Step 6)

## [0.8.1] - 2026-03-10

### Fixed

- New projects now include `package.json` (minimal, with `private: true`)
- `.gitignore` now correctly included in npm package (renamed to avoid npm stripping)
- `--upgrade` creates missing `package.json` and `.gitignore` for projects created with v0.8.0
- `--upgrade`, `--eject`, `--doctor` no longer require `package.json` (use `ai-specs/` as primary signal)

## [0.8.0] - 2026-03-09

### Added

- `--eject` flag to cleanly uninstall SDD DevFlow from a project
  - Removes all SDD-generated files (agents, skills, hooks, standards, configs)
  - Preserves custom agents, custom commands, personal settings, and project docs
  - Smart settings.json handling: removes SDD hooks, preserves user permissions
  - CI workflow removal only if SDD-generated (detects marker comment)
  - Cleans .gitignore SDD entries
  - Interactive confirmation (skip with `--yes`)
  - Combine with `--diff` for dry-run preview: `--eject --diff`
  - 6 new test scenarios (32 total)

## [0.7.0] - 2026-03-09

### Added

- `--diff` flag for dry-run preview of `--init` and `--upgrade` operations
  - Shows detected stack, files that would be created/replaced/preserved
  - For `--upgrade`: shows standards diff (customized vs unchanged), custom agents, new files
  - Zero filesystem writes — safe to run anytime
  - Combine with `--init` or `--upgrade`: `--init --diff`, `--upgrade --diff`
  - 3 new test scenarios (26 total)

## [0.6.1] - 2026-03-09

### Added

- CI/CD GitHub Actions workflow template (`.github/workflows/ci.yml`)
  - Auto-generated for new projects, `--init`, and `--upgrade`
  - Adapts DB services to detected stack: PostgreSQL (default), MongoDB, or none (frontend-only)
  - Health checks for both PostgreSQL and MongoDB services
  - Branches adapted to branching strategy (github-flow: `main`, gitflow: `main` + `develop`)
  - `--upgrade` only adds CI workflow if not already present (respects customization)
  - 3 new test scenarios (23 total)

## [0.6.0] - 2026-03-09

### Added

- `--doctor` flag to diagnose SDD installation health
  - 10 checks: installation, version, AI tool config, top-level configs, agents completeness, project type coherence, cross-tool consistency, standards, hooks/dependencies, project memory
  - Exit code 1 on errors (useful for CI)
  - 3 new test scenarios (20 total)

## [0.5.0] - 2026-03-06

### Added

- `--upgrade` flag to update SDD template files in existing projects
  - Smart standards handling: preserves user-customized `.mdc` files, replaces unmodified ones
  - Preserves custom agents, commands, personal settings (`settings.local.json`), and all project documentation
  - Detects installed AI tools and project type automatically
  - Preserves autonomy level across upgrades
  - Interactive confirmation with detailed summary (skip with `--yes`)
  - `--force` flag to re-install same version
- `.sdd-version` file written by all modes (create, init, upgrade) for version tracking
- `CHANGELOG.md` with full version history
- 3 new test scenarios (17 total): upgrade basic, upgrade preserves customizations, .sdd-version in new projects

### Fixed

- Upgrade now preserves user permissions and additionalDirectories in `settings.json` (merges hooks from template)
- Upgrade now preserves project-specific variables in `.env.example`

## [0.4.2] - 2026-03-05

### Fixed

- AGENTS.md Standards References now cleaned for single-stack projects (`generator.js` + `init-generator.js`)
- Backend-only projects no longer reference `frontend-standards.mdc` in AGENTS.md
- Frontend-only projects no longer reference `backend-standards.mdc` in AGENTS.md

## [0.4.1] - 2026-03-04

### Fixed

- Fullstack workflow guidance in SKILL.md (Steps 2 & 3)
- DB-without-ORM fallback for Prisma references
- qa-engineer standards adapted for single-stack projects
- Extracted shared adaptation logic to `lib/adapt-agents.js` (DRY — eliminated ~185 lines of duplicated code)
- Expanded test suite: Scenario 14 + new assertions (14 scenarios total)

## [0.4.0] - 2026-03-04

### Added

- 10 workflow improvements to agent/skill templates based on real-world F002 analysis
- DDD/Zod adaptation regexes for Gemini agents
- Rule to prioritize `backend-standards.mdc` over legacy code patterns
- Backend agent templates adapted for non-DDD architectures during `--init`

### Fixed

- `backend-standards.mdc` now replaces Technology Stack and Validation sections based on scan results (no more hardcoded Zod)
- File globs filtered to `ts,js` only for backend-only projects (no `.tsx/.jsx`)
- Mongoose/MongoDB best practices pre-generated in `backend-standards.mdc` (was empty TODO)
- Schema path adaptation for Gemini agents

## [0.3.2] - 2026-02-26

### Fixed

- Frontend/backend references removed from agents and skills for single-stack projects

## [0.3.1] - 2026-02-26

### Fixed

- Agent/skill templates adapted to detected stack during `--init`
- Frontend/backend references cleaned for single-stack projects

## [0.3.0] - 2026-02-26

### Changed

- Replaced sprint-based tracking with feature-based model in product tracker template

### Fixed

- `--init` improvements for backend-only projects (from real-world testing on i04_cgm)

## [0.2.4] - 2026-02-25

### Fixed

- `--init` improvements for backend-only projects based on real-world testing

## [0.2.3] - 2026-02-25

### Changed

- Improved README with badges, stack detection table, and value proposition

## [0.2.2] - 2026-02-25

### Fixed

- Hardened regex patterns for template adaptation
- Expanded scanner detection (6 backend frameworks, 8 ORMs, 9 frontend frameworks)
- Added edge case tests

## [0.2.1] - 2026-02-25

### Fixed

- Corrected `package.json` bin path and npm metadata
- Improved `--init` stack detection and file adaptation

## [0.2.0] - 2026-02-24

### Added

- `--init` flag to install SDD DevFlow into existing projects
- Interactive wizard for existing project setup
- Stack scanner: detects backend/frontend frameworks, ORMs, databases, architecture patterns

## [0.1.2] - 2026-02-24

### Added

- Gemini CLI support: agents, skills, commands, and project memory (parity with Claude Code)

## [0.1.1] - 2026-02-24

### Added

- Initial release
- Interactive CLI wizard (`npx create-sdd-project my-app`)
- 9 specialized AI agents for Claude Code
- 3 skills: development-workflow, bug-workflow, project-memory
- 4 autonomy levels (L1–L4)
- Template system: agents, skills, standards, documentation
- Smoke test suite

[0.15.0]: https://github.com/pbojeda/sdd-devflow/compare/v0.14.0...v0.15.0
[0.14.0]: https://github.com/pbojeda/sdd-devflow/compare/v0.13.2...v0.14.0
[0.13.2]: https://github.com/pbojeda/sdd-devflow/compare/v0.13.1...v0.13.2
[0.13.1]: https://github.com/pbojeda/sdd-devflow/compare/v0.13.0...v0.13.1
[0.13.0]: https://github.com/pbojeda/sdd-devflow/compare/v0.12.1...v0.13.0
[0.12.1]: https://github.com/pbojeda/sdd-devflow/compare/v0.12.0...v0.12.1
[0.12.0]: https://github.com/pbojeda/sdd-devflow/compare/v0.11.1...v0.12.0
[0.11.1]: https://github.com/pbojeda/sdd-devflow/compare/v0.11.0...v0.11.1
[0.11.0]: https://github.com/pbojeda/sdd-devflow/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/pbojeda/sdd-devflow/compare/v0.9.9...v0.10.0
[0.9.9]: https://github.com/pbojeda/sdd-devflow/compare/v0.9.8...v0.9.9
[0.9.8]: https://github.com/pbojeda/sdd-devflow/compare/v0.9.7...v0.9.8
[0.9.7]: https://github.com/pbojeda/sdd-devflow/compare/v0.9.6...v0.9.7
[0.9.6]: https://github.com/pbojeda/sdd-devflow/compare/v0.9.5...v0.9.6
[0.9.5]: https://github.com/pbojeda/sdd-devflow/compare/v0.9.4...v0.9.5
[0.9.4]: https://github.com/pbojeda/sdd-devflow/compare/v0.9.3...v0.9.4
[0.9.3]: https://github.com/pbojeda/sdd-devflow/compare/v0.9.2...v0.9.3
[0.9.2]: https://github.com/pbojeda/sdd-devflow/compare/v0.9.1...v0.9.2
[0.9.1]: https://github.com/pbojeda/sdd-devflow/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/pbojeda/sdd-devflow/compare/v0.8.9...v0.9.0
[0.8.9]: https://github.com/pbojeda/sdd-devflow/compare/v0.8.8...v0.8.9
[0.8.8]: https://github.com/pbojeda/sdd-devflow/compare/v0.8.7...v0.8.8
[0.8.7]: https://github.com/pbojeda/sdd-devflow/compare/v0.8.6...v0.8.7
[0.8.6]: https://github.com/pbojeda/sdd-devflow/compare/v0.8.5...v0.8.6
[0.8.5]: https://github.com/pbojeda/sdd-devflow/compare/v0.8.4...v0.8.5
[0.8.4]: https://github.com/pbojeda/sdd-devflow/compare/v0.8.3...v0.8.4
[0.8.3]: https://github.com/pbojeda/sdd-devflow/compare/v0.8.2...v0.8.3
[0.8.2]: https://github.com/pbojeda/sdd-devflow/compare/v0.8.1...v0.8.2
[0.8.1]: https://github.com/pbojeda/sdd-devflow/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/pbojeda/sdd-devflow/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/pbojeda/sdd-devflow/compare/v0.6.1...v0.7.0
[0.6.1]: https://github.com/pbojeda/sdd-devflow/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/pbojeda/sdd-devflow/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/pbojeda/sdd-devflow/compare/v0.4.2...v0.5.0
[0.4.2]: https://github.com/pbojeda/sdd-devflow/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/pbojeda/sdd-devflow/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/pbojeda/sdd-devflow/compare/v0.3.2...v0.4.0
[0.3.2]: https://github.com/pbojeda/sdd-devflow/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/pbojeda/sdd-devflow/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/pbojeda/sdd-devflow/compare/v0.2.4...v0.3.0
[0.2.4]: https://github.com/pbojeda/sdd-devflow/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/pbojeda/sdd-devflow/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/pbojeda/sdd-devflow/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/pbojeda/sdd-devflow/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/pbojeda/sdd-devflow/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/pbojeda/sdd-devflow/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/pbojeda/sdd-devflow/releases/tag/v0.1.1
