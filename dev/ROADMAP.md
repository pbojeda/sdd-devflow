# SDD DevFlow — Internal Roadmap

> Internal development tracking. Not published to npm (`files` in package.json excludes this directory).

## Current Version: 0.16.9

### v0.16.9 (2026-04-13) — Doctor check #13 for Gemini TOML commands

Closes gap #3 from the v0.16.8 template drift audit (highest-priority remaining: same class as BUG-DEV-GEMINI-CONFIG because upstream Gemini CLI silently skips broken TOML files via `coreEvents.emitFeedback`, never stdout/stderr).

- Doctor check #13 (`checkGeminiCommands`) parses `.gemini/commands/*.toml` with a narrow regex helper (`parseTomlTopLevelKey`) and validates required `prompt: string` + optional `description: string` to mirror Gemini CLI's `FileCommandLoader` Zod schema
- Scenario 42 smoke test with 7 sub-cases covering missing/invalid/multiline/literal TOML variants
- Empirical research confirmed: a functional smoke test like Scenario 41 does NOT work here because Gemini CLI does not emit command loading errors to stdout/stderr. The doctor check is the reliable detection surface
- No runtime dependency added — hand-rolled narrow parser matches our template use case (two top-level string keys). Upgrade to `@iarna/toml` if templates ever need richer TOML features
- Plan cross-model reviewed by Codex CLI 0.115.0 + Gemini CLI 0.34.0

### v0.16.8 (2026-04-13) — Meta-improvements to prevent silent failures

Follow-up to v0.16.7 targeting the root causes of why BUG-DEV-GEMINI-CONFIG went undetected for months.

- Planner agents (4 files, Claude + Gemini × backend + frontend) now require **Pre-Emission Verification** with `<command> → <observed fact> → <impact>` format. Explicit "do NOT hallucinate" constraint.
- review-spec / review-plan commands (4 files) now force an EMPIRICAL review not text-only — reviewers must list files read + commands executed.
- **Reviewer empirical asymmetry meta-check** with `awk` parser anchored to mandatory markdown headers. Triggers reprompt only on missing empirical evidence, not on low finding counts.
- New `cross-model-review.md` reference documenting the calibration pattern (Codex = agentic bug finder, Gemini = standards-compliance checker). Includes F-UX-B historical calibration data.
- **Scenario 41 functional smoke test** — invokes `gemini --version` + `gemini --help` against a scaffolded project with positive success signal AND differential test (inject known-broken obsolete format, assert rejection). Solves both false-pass cases (CLI unusable → positive assertion catches it; CLI stops loading config during --help → differential catches it).
- Template drift risk audit in `dev/testing-notes.md` — inventory of format-drift risks beyond `.gemini/settings.json`.
- Plan cross-model reviewed by Codex CLI 0.115.0 + Gemini CLI 0.34.0 (both APPROVE, then both REJECT on v1 draft — all consensus findings incorporated before merge)

### v0.16.7 (2026-04-13) — Gemini settings format fix

- Fix obsolete `model` string format in `template/.gemini/settings.json` (Gemini CLI ≥0.34 requires object)
- Add `--upgrade` migration that preserves user customizations and only transforms the broken `model` field
- Add doctor check #12 (`checkGeminiSettings`) — narrowly detects obsolete and malformed shapes only
- Smoke tests: 38 → 40 (add `testGeminiSettingsMigration` with 8 sub-cases + `testDoctorGeminiSettingsValid`)
- Plan cross-model reviewed by Codex CLI 0.115.0 + Gemini CLI 0.34.0 (both APPROVE WITH CHANGES, all critical findings incorporated)
- Discovered during foodXPlorer F-UX-B Spec v2 — agent had to invoke Gemini from `/tmp` because the project settings were rejected with `Expected object, received string`

---

## Phase 1: Core Generator & CLI (v0.1.x–v0.2.x) ✅

- [x] `create-sdd-project` wizard (new project generation)
- [x] `--init` mode (install SDD DevFlow into existing projects)
- [x] Scanner: detect stack (6 backend frameworks, 8 ORMs, 9 frontend frameworks)
- [x] Template system: agents, skills, standards for Claude Code + Gemini CLI
- [x] Smoke test suite (initial scenarios)
- [x] Improve README.md for npm (CLI output examples, download badge, --init showcase)
- [x] Add CHANGELOG.md (public, conventional commits)

## Phase 2: Real-World Validation ✅ (--init) / 🔲 (new project)

- [x] Test `--init` on i04_cgm (Express + Mongoose + MongoDB)
  - [x] Scanner dry-run validated (correct stack detection)
  - [x] Full --init executed and reviewed
  - [x] 6 issues found, all fixed (see `dev/testing-notes.md`)
  - [ ] Use SDD workflow to develop a real feature on i04_cgm
- [ ] Test `create-sdd-project` on a brand new project
  - Full wizard flow
  - Add first feature, develop with SDD workflow
- [x] Document findings and issues in `dev/testing-notes.md`

## Phase 3: Improvements from Real-World Testing (v0.3.x–v0.4.x) ✅

- [x] v0.3.0–v0.3.4: Initial fixes from i04_cgm testing
  - [x] Wizard: `layered` pattern label, autonomy level "(default)" fix
  - [x] Scanner: architecture detection improvements
  - [x] Init-generator: Zod/Prisma/DDD adaptation for non-default stacks
  - [x] Backend-standards: validation section, globs, Mongoose patterns
- [x] v0.4.0: Workflow improvements from F002 analysis
  - [x] 10 improvements to agent/skill templates based on real usage
  - [x] DDD/Zod adaptation regexes for Gemini agents
- [x] v0.4.1: Code review findings
  - [x] Fullstack workflow guidance in SKILL.md (Steps 2 & 3)
  - [x] DB-without-ORM fallback for Prisma refs
  - [x] qa-engineer standards adapted for single-stack
  - [x] Extracted shared logic to `lib/adapt-agents.js` (DRY)
  - [x] Scenario 14 + expanded test assertions (14 scenarios total)
- [x] v0.4.2: Close remaining testing issues
  - [x] AGENTS.md Standards References cleaned for single-stack projects
  - [x] All 6 i04_cgm testing issues closed
- [ ] Monorepo support improvements (pnpm workspaces, turbo)
- [x] SDD upgrade/migration (`--upgrade` flag with smart standards handling, custom agent preservation)
- [x] `--doctor` diagnostic command (10 checks: installation, version, agents, coherence, cross-tool sync, standards, hooks, memory)
- [x] CI/CD GitHub Actions template (auto-generated, stack-adapted: PostgreSQL, MongoDB, frontend-only)
- [x] `--diff` dry-run preview for `--init` and `--upgrade`
- [x] `--eject` clean uninstall (removes SDD files, preserves custom agents/commands/docs/settings)
- [x] Merge Checklist Evidence in ticket template (B+D) — survives context compaction, forces checkpoint execution
- [x] Compact hook: forces re-read of SKILL.md after /compact, PM-aware recovery
- [x] Plan Self-Review (Step 2.4) — agent re-reads own plan and self-critiques before Plan Approval
- [x] `/review-plan` custom command — optional cross-model plan review with external AI CLI
- [x] `/context-prompt` command — generates context recovery prompt with Workflow Recovery (prevents merge-checklist skip after /compact)
- [x] `/review-project` command — comprehensive project review using 3 AI models in parallel (Claude + Gemini + Codex)
- [x] Spec Self-Review (Step 0.4) — agent re-reads own spec and self-critiques before Spec Approval
- [x] `/review-spec` command — optional cross-model spec review with external AI CLI before planning
- [x] Automatic cross-model reviews — `/review-spec` and `/review-plan` run automatically when external CLIs are available
- [x] `ui-ux-designer` agent — design guidelines and feature design notes (manual invocation, like database-architect)
- [x] `docs/specs/design-guidelines.md` — living design system document consumed by frontend agents
- [x] Ticket Status lifecycle — merge checklist updates Status to `Ready for Merge`, Step 6 to `Done`

## Phase 4: Test Generation for Existing Projects

- [ ] `--init` detects low test coverage and offers to scaffold test files
- [ ] Generate test stubs based on detected architecture pattern
- [ ] Integration with Jest/Vitest config setup

## Phase 5: Advanced Features (v1.0)

- [ ] Agent Teams: parallel execution of independent tasks
- [x] PM Agent + L5 Autonomous: AI-driven feature orchestration (v0.16.0 — pm-orchestrator skill, 5 autonomy levels, 9 guardrails, cross-model reviewed)
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
| 2026-03-04 | Extract shared adaptation logic to `lib/adapt-agents.js` | Eliminate ~185 lines of duplicated code between generator.js and init-generator.js |
| 2026-03-04 | Parameterize `replaceInFileFn` in shared adapter | generator.js uses `.split().join()`, init-generator.js uses `.replaceAll()` — function parameter handles both |
| 2026-03-05 | Close all 6 i04_cgm testing issues before new features | Clear technical debt before expanding scope |
