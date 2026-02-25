# SDD DevFlow — Internal Roadmap

> Internal development tracking. Not published to npm (`files` in package.json excludes this directory).

## Current Version: 0.2.2

---

## Phase 1: Documentation & Polish (v0.2.x)

- [ ] Improve README.md for npm (better examples, badges, GIFs/screenshots)
- [ ] Add CHANGELOG.md (public, conventional commits)

## Phase 2: Real-World Validation

- [ ] Test `--init` on i04_cgm (Express + Mongoose + MongoDB)
  - Run scanner dry-run first
  - Execute full --init
  - Validate generated files against real project structure
  - Use SDD workflow to develop a real feature
- [ ] Test `create-sdd-project` on a brand new project
  - Full wizard flow
  - Start sprint 0, develop first feature with SDD workflow
- [ ] Document findings and issues in `dev/testing-notes.md`

## Phase 3: Improvements from Real-World Testing (v0.3.x)

- [ ] Fixes discovered during Phase 2
- [ ] Monorepo support improvements (pnpm workspaces, turbo)
- [ ] SDD upgrade/migration (projects that already have SDD — version bumps)

## Phase 4: Test Generation for Existing Projects

- [ ] `--init` detects low test coverage and offers to scaffold test files
- [ ] Generate test stubs based on detected architecture pattern
- [ ] Integration with Jest/Vitest config setup

## Phase 5: Advanced Features (v1.0)

- [ ] Agent Teams: parallel execution of independent tasks
- [ ] PM Agent + L5 Autonomous: AI-driven sprint orchestration
- [ ] Plugin system for custom agents/skills
- [ ] Web UI for project setup (alternative to CLI wizard)

---

## Known Issues

| ID | Description | Found In | Status |
|----|-------------|----------|--------|
| — | npm publish requires OTP (2FA) — `postversion` script fails silently | v0.2.2 | Accepted (manual publish after version bump) |

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-25 | Use `dev/` for internal docs, excluded via `files` field | Keeps internal tracking in git without polluting npm package |
| 2026-02-25 | Expanded scanner to 6 backend frameworks, 8 ORMs, 9 frontend frameworks | Cover most common Node.js stacks for `--init` |
| 2026-02-25 | Robust regex patterns in init-generator | Prevent silent failures when template structure changes |
