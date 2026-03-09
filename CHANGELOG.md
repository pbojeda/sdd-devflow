# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
