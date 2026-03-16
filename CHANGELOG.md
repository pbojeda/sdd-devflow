# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
