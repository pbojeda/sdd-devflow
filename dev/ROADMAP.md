# SDD DevFlow — Internal Roadmap

> Internal development tracking. Not published to npm (`files` in package.json excludes this directory).

## Current Version: 0.17.0

### v0.17.0 (2026-04-13) — Provenance tracking + unified stack adaptations

Closes the Codex P1 finding from v0.16.10 cross-model review: cross-version upgrades no longer false-positive-preserve pristine user files. Hash-based smart-diff via `.sdd-meta.json` answers "did the user edit this file since the last tool-write?" precisely, independent of template evolution across versions. Also unifies `--init` and `--upgrade` stack-adaptation pipelines so init-adapted projects converge cleanly on upgrade.

**New modules**:
- `lib/meta.js` — provenance helper (computeHash, readMeta, writeMeta, pruneExpectedAbsent, POSIX normalization, graceful fallback on corrupted/missing files).
- `lib/stack-adaptations.js` — shared stack-adaptation rules (Zod → validation, Prisma → detected ORM, DDD → layered, shared/src/schemas/ cleanup). Two entry points: file-based `applyStackAdaptations(dest, scan, config, allowlist)` and pure in-memory `applyStackAdaptationsToContent(content, posixPath, scan, config)`. Extracted from `lib/init-generator.js`'s old `adaptCopiedFiles` body. Idempotent by rule design — smoke scenario 56 enforces this.

**Hash-based decision tree** (in `lib/upgrade-generator.js`):
1. File missing / `--force-template` → unconditional write + hash update.
2. Stored hash exists → compare current file hash → match replaces, mismatch preserves (no hash update — Codex M1 invariant).
3. No stored hash → fall back to v0.16.10 content compare against the FULL adapted target (applyStackAdaptationsToContent applied in-memory — Gemini M1 fix). Match replaces, mismatch preserves.

After the loop, `applyStackAdaptations` is called with the `filesToAdapt` allowlist (only replaced-or-new files). Preserved user-edited files are NEVER touched by stack adaptations. Hashes are then recomputed for allowlisted files, pruned by expected-presence (not on-disk-presence — Gemini M3 fix), and written to `.sdd-meta.json`.

**Doctor check #15** (`lib/doctor.js`) — validates `.sdd-meta.json` structural integrity (schema version, hash shape, no orphans). Does NOT warn on hash mismatches (Codex M3 fix — mismatches are normal customization, not integrity issues). Brings total 14 → 15.

**Related fix**: `adaptAgentsMd` now uses `meaningfulDirs` (not `rootDirs`) to build the project-tree block, so the output is stable between install-time (when `ai-specs/` and `docs/` don't exist yet) and upgrade-time (when SDD has installed those dirs). Without this fix, `--init` projects would false-positive-preserve AGENTS.md on every upgrade because the tree section would include SDD-infrastructure dirs on upgrade but not on install.

**Cross-model review trail**:
- **Round 1 (plan v1.0)** — Codex REJECT (2 M1 + M2 + M3), Gemini APPROVE WITH CHANGES (M1 + 2 M2 + M3). All 8 consensus findings incorporated into plan v1.1.
- **Round 2 (post-implementation patch)** — Gemini APPROVE (all 7 invariants verified), Codex P1 + P2 on `--init` path (pre-existing-files hashed, `.sdd-meta.json` not gitignored on init). Both fixed with regression guard (scenario 58b).

**Smoke tests**: 49 → **59** (+10). Three primary regression guards: scenario 53 (Codex P1), scenario 54 (Codex M1), scenario 55 (Gemini M1). Plus scenario 58b (Codex round 2 P1).

**Known limitation**: provenance tracking scope is limited to template agents + AGENTS.md. `SKILL.md`, `ticket-template.md`, `documentation-standards.mdc`, and `ai-specs/specs/*.mdc` standards continue with v0.16.10 behavior (wholesale-recopy + stack-adaptation / existing isStandardModified compare). First-class smart-diff for those files is a v0.17.x candidate.

### v0.17.x (next) — First-class smart-diff for SKILL.md / ticket-template.md / documentation-standards.mdc

Extends v0.17.0's hash-based smart-diff to the remaining stack-adapted files currently handled via wholesale-recopy. Same decision tree, same `.sdd-meta.json` schema extension. Codex M1 option 2 from v0.17.0 plan review, deferred.

### v0.16.10 (2026-04-13) — Smart-diff protection + backup safety net for --upgrade

Closes the foodXPlorer v0.16.9 regression where `npx create-sdd-project --upgrade --force --yes` silently overwrote customized `AGENTS.md` + `.claude/agents/backend-planner.md` + `.gemini/agents/backend-planner.md`. Recovery done via `git show f8e5929:<path>` on branch `fix/restore-customizations-lost-in-v0.16.9-upgrade`.

- **Smart-diff for template agents** (mirrors standards smart-diff since v0.15): per-file comparison against `adaptAgentContentString(rawTemplate, file, projectType)`. Customizations preserved, `.new` backup contains adapted target.
- **Smart-diff for `AGENTS.md`**: compares existing file against `adaptAgentsMd(template, config, scan)`.
- **Backup-before-replace**: `.sdd-backup/<YYYYMMDD-HHMMSS-NNNN>/` nuclear safety net for every file the upgrade replaces. Idempotent per run, non-fatal on failure, millisecond suffix for collision safety. `.gitignore` entry added to template + idempotently appended to existing projects' `.gitignore`.
- **Pure-function extraction**: `adaptAgentContentString(content, filename, projectType)` + `AGENT_ADAPTATION_RULES` data table extracted from `adapt-agents.js` so the upgrade smart-diff shares the exact same rules as the install adapter.
- **Root-cause fix in `adaptAgentsMd`** (`lib/init-generator.js`): no longer produces `Backend patterns ()` empty parens when scanner can't detect framework. Uses `config.projectType` as authoritative source for pruning `[Frontend Standards]` / `[Backend Standards]` links instead of unreliable scanner detection. Guards the project-tree rewrite to only trigger when scanner found non-SDD directories. This is the exact shape of the broken AGENTS.md foodXPlorer ended up with.
- **`--force-template` CLI flag**: escape hatch to accept new template content in bulk without preservation warnings. Backup still happens.
- **Doctor check #14: AGENTS.md standards references**: detects `Backend patterns ()` empty parens + unsubstituted placeholders. Severity WARN. Brings doctor total 13 → 14.
- **Generalized planner template examples**: removed foodXPlorer-specific strings (`PortionContext`, `StandardPortion`, `formatPortionTermLabel`, `@foodxplorer`, `dishId`, `croqueta`, `pgvector`, `racion`, `tapa`, `pincho`) from all 4 planner templates. Replaced with neutral examples (`Status`, `cuid()`, `formatStatusLabel`, `src/shared/`). Smoke test #47 guards against future overfit regressions.
- **CRLF-safe comparison** (Gemini cross-model finding): `normalizeForCompare` helper strips CR, trailing whitespace per-line, and leading/trailing blank lines before comparing. Prevents Windows false positives under `git core.autocrlf=true`.
- **Seven new smoke tests (43–49)**: customization preservation, pristine fullstack, pure-function unit test for `adaptAgentContentString`, doctor #14 empty parens detection, project-agnostic examples guard, idempotent `.gitignore` append, `--force-template` override. Total 42 → 49.

**Known limitation (accepted trade-off, documented in CHANGELOG)**: cross-version pristine upgrades (v0.16.10 → v0.16.11+ when template files change) will trigger conservative preserve warnings on files the user never touched, because the smart-diff compares against the NEW template's adapted output. Users should re-run with `--force-template` to accept the new template content, or manually merge from `.sdd-backup/<ts>/<path>.new`. Backup always happens; recovery is always possible. Codex cross-model review raised this as P1 in post-implementation; the finding was already raised as H-severity in the plan review and explicitly deferred to v0.17.0. v0.16.10 ships with improved summary output that tells the user exactly what to do.

**Cross-model review (post-implementation)**:
- **Codex**: P1 × 2 — cross-version drift (both agents and AGENTS.md). Re-escalation of the deferred plan finding. **Status**: accepted trade-off per plan, escape hatch via `--force-template`, v0.17.0 provenance planned next.
- **Gemini**: M2 CRLF mismatch on Windows (FIXED via `normalizeForCompare`). M2 overly broad doctor regex catching user markdown links (FIXED by restricting to placeholder-shaped `[...]` with hint words like "your", "example", "framework"). M3 split/join vs `.replace()` inconsistency (deferred — low impact, target strings appear once per template). First Gemini pass flagged a mangled string in the templates — verified as a hallucination, files are correct.

### v0.17.0 (next) — Provenance tracking for accurate smart-diff

**Priority**: HIGH. Closes the Codex P1 finding from v0.16.10.

- Write `.sdd-content-hashes.json` at install/upgrade time storing SHA-256 of each template file's adapted output.
- At upgrade time, compare the user's file against the stored hash (not against the new template). Match → pristine, replace. No match → customized, preserve.
- Fall back to current v0.16.10 behavior (conservative compare-against-new-template) when hashes are missing (first v0.17.0 upgrade from pre-v0.17.0).
- Plan needs its own cross-model review round before implementation.
- Eliminates false positives on cross-version upgrades from v0.17.0 onwards.
- Also lays groundwork for richer metadata: track install date, modifying tool, previous version.

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
