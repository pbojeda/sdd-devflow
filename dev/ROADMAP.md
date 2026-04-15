# SDD DevFlow — Internal Roadmap

> Internal development tracking. Not published to npm (`files` in package.json excludes this directory).

## Current Version: 0.17.2

### Known follow-ups (v0.17.3 or v0.18.x candidates)

**1. Scanner detection for language / tests / architecture is NOT workspace-aware** (discovered during fx v0.17.2 empirical validation, 2026-04-15). v0.17.1 and v0.17.2 made `detectBackend` / `detectFrontend` workspace-aware via `enumerateWorkspaces`, but these other detection functions still run only against the project root:

   - `detectLanguage(projectDir)` — checks root `tsconfig.json` + root `src/*.ts`. For fx (monorepo with TS code in `packages/*/src/`), the root has no tsconfig.json and no `src/*.ts`, so it returns `'javascript'`. `adaptBackendStandards` then writes `Runtime: Node.js with JavaScript` even though the actual backend is TypeScript.
   - `detectTests(projectDir, pkg)` — similarly looks at root for jest/vitest config + root test dirs. fx's tests live in `packages/api/__tests__/` etc., so the root scan misses them → `Testing: Not configured`.
   - `detectArchitecture(projectDir, pkg)` — inspects root `src/` for domain/application/infrastructure/layered patterns. fx has no root `src/`, so returns `pattern: 'unknown'` → `Architecture — Custom` with generic placeholder.
   - `detectFrontend` sparse result for fx: detects `Next.js` from `packages/web/package.json` via the v0.17.2 workspace fallback, but `styling`, `components`, `state` all stay null → doctor check #14 fires the WARN `"Frontend patterns has only 1 entry (Next.js) — scanner detection may be incomplete"`. Cosmetic WARN (exit 0) but a UX signal that the frontend detection needs the same workspace-aware treatment.

   **Action**: extend `detectLanguage`, `detectTests`, `detectArchitecture`, and `detectFrontend`'s auxiliary detection (styling/components/state) to use the same workspace-enumeration path added in v0.17.1/v0.17.2 for framework detection. Likely pattern: when `isMonorepo && !<field>.framework_detected_at_root`, run the auxiliary detector against the same workspace that provided the framework (via `backend.workspaceSource` / `frontend.workspaceSource`), falling back to root if absent.

   **Severity**: Medium. Not a correctness bug — the library still ships correct code and preserves user customizations. But `adaptBackendStandards` / `adaptFrontendStandards` produce lower-quality output for monorepos than for single-package projects. Cosmetic impact on standards file content + doctor WARN noise.

   **Discovery**: fx v0.17.2 upgrade produced `backend-standards.mdc` with `Runtime: Node.js with JavaScript` (should be TypeScript) and `Testing: Not configured` (fx has Jest). AGENTS.md post-upgrade Frontend patterns line is `(Next.js)` single-entry → doctor sparse-patterns check WARN.

### v0.17.2 (2026-04-15) — Scanner monorepo partial-detection hotfix

Closes a defect in v0.17.1's scanner monorepo fix discovered via empirical validation against foodXPlorer on 2026-04-15 (less than 2h after v0.17.1 publish).

**The bug**: v0.17.1's `scan()` guarded workspace enumeration on `!backend.detected || !frontend.detected`. But `detectBackend` has a partial-detection fallback at scanner.js:258-261 that sets `result.detected = true` when only `db` or `orm` is found, even if `framework` is null. A root `.env.example` with `DATABASE_URL=postgresql://...` + `PORT=3001` (common pattern in monorepos where the real backend stack lives in `packages/api/`) was enough to trigger it. Under the v0.17.1 guard, fx's root detectBackend returned `{detected: true, framework: null, orm: null, db: "PostgreSQL", port: 3001}` → enumeration skipped for backend → scan.backend.framework stayed null → adaptBackendStandards produced generic placeholders → adaptAgentsMd fell back to the `(DDD, Express, Prisma)` template literal in `.new` backups.

**User-facing impact on fx**: `AGENTS.md` was preserved byte-identical (user had manually restored the Fastify/Prisma/Kysely line during an earlier incident), but `backend-standards.mdc` was replaced via the v0.17.1 fallback compare path with degraded content — generic `Node.js + JavaScript + PostgreSQL + Custom architecture` instead of proper Fastify/Prisma stack-aware content.

**The fix** (`lib/scanner.js` `scan()`):
1. Outer guard: `!backend.framework || !frontend.framework` instead of `!detected`. Strictly looser than v0.17.1, so enumeration runs in a strict superset of cases.
2. Inner per-slot guards: same change — promote to workspace when root lacks a framework.
3. Merge strategy: replaced `Object.assign(backend, wsBackend, ...)` with a field-by-field loop that only overwrites when the workspace value is non-null. Preserves root-level env-derived fields (`db`, `port`) when the workspace didn't detect them.
4. Field iteration via `Object.keys(wsBackend)` / `Object.keys(wsFrontend)` (Gemini round-4 finding) — automatically forwards future additions to detectBackend/detectFrontend without requiring dual-updates here.

**Cross-model review trail**:
- **Round 4 (post-implementation diff)** — Codex APPROVE (no findings); Gemini APPROVE WITH CHANGES (1 HIGH: hardcoded field list would drop future additions, valid — applied `Object.keys` fix).

**Smoke tests**: 72 → **73** (+1). Scenario 71 (`testMonorepoScannerWithRootEnvFallback`) directly reproduces fx's shape.

**Empirical validation**: post-publish, re-upgraded fx against v0.17.2 and verified AGENTS.md.new produces the correct `Backend patterns (Fastify, Prisma, ...)` stack line.

**Meta-lesson**: empirical validation against a real monorepo caught a bug that the smoke test fixtures didn't. The fixtures didn't include a root `.env.example`, which was the specific trigger for the partial-detection fallback. v0.17.2's scenario 71 now covers that exact shape.

### v0.17.1 (2026-04-15) — Smart-diff expansion + scanner monorepo fix + CLI message cleanup

Closes three gaps from v0.17.0: (1) smart-diff only covered template agents + `AGENTS.md` (21 paths), leaving the B+D checkpoint mechanism vulnerable to silent customization loss; (2) `lib/scanner.js` only read root `package.json`, producing `(DDD, Express, Prisma)` fallback literals on monorepos (foodXPlorer 2026-04-14 incident); (3) the post-upgrade CLI warning claimed provenance tracking was "future work".

**Smart-diff expansion — 10 new tracked files** (31 total):
- 4 standards (`ai-specs/specs/{base,backend,frontend,documentation}-standards.mdc`), project-type-filtered
- 6 development-workflow skill core files (SKILL.md + ticket-template.md + merge-checklist.md × 2 tools), aiTools-filtered
- Each uses the full hash decision tree (missing/force → write, stored hash match → replace, stored hash mismatch → preserve + `.new` backup, no stored hash → fallback compare against FULL adapted target or raw template). **Codex M1 invariant holds**: preserved files never get a new hash entry.
- The 6 workflow-core files are captured into `workflowCoreBackup` Map BEFORE the wholesale `skills/` delete-and-copy, then smart-diffed post-copy against the backup. The B+D checkpoint mechanism (SKILL.md + ticket-template + merge-checklist) is now protected — closes "el problema central de la librería" gap.

**Scanner monorepo fix** (`lib/scanner.js`):
- `enumerateWorkspaces(dir, pkg)` + `expandWorkspacePattern(dir, pattern)` — parse `pkg.workspaces` (array or object form), expand single-wildcard patterns, filter to dirs containing `package.json` (Codex round-3 finding 1), deduplicate by normalized POSIX path with first-occurrence-wins.
- `scan()` runs workspace enumeration as FALLBACK when `isMonorepo && (!backend.detected || !frontend.detected)`. First workspace with `detected: true` wins per backend + frontend slot.
- Adds `scan.backend.workspaceSource` / `scan.frontend.workspaceSource` fields for observability.
- **Scanner additive invariant**: single-package projects produce byte-identical output to v0.17.0. Enforced by scenario 63c.
- **Scope limitations**: no pnpm-workspace.yaml, no `**` recursive patterns, no `!exclude` negation — deferred to v0.17.2.

**CLI message cleanup** (`lib/upgrade-generator.js` runUpgrade preserved-customizations warning):
- Removed the stale v0.16.10-era claim that "Provenance tracking (v0.17.0) will eliminate these false positives" (misleading in v0.17.0, wrong in v0.17.1).
- New wording: fallback path is expected only on first v0.17.0+ upgrade from pre-v0.17.0 projects; subsequent upgrades use hash-based precision.

**Related fixes**:
- `adaptFrontendStandards` Project Structure regex is now idempotent (was duplicating the trailing TODO marker on repeat applications).
- Upgrade fallback compare now accepts BOTH adapted target AND raw template as valid pristine states (critical for v0.17.0 → v0.17.1 upgrades — `generator.js` scaffolds raw templates while `init-generator.js` adapts them).
- `isStandardModified` removed, renamed to `normalizedContentEquals` (file-agnostic helper), collocated with `normalizeForCompare` in `lib/meta.js`.

**Doctor check #14 extension**: sparse-entry observability for `Backend patterns` / `Frontend patterns` in AGENTS.md — WARN when exactly 1 entry (scanner detection likely incomplete). Informational only, exit 0.

**New module exports** (`lib/adapt-agents.js`):
- `adaptWorkflowCoreContentForProjectType(content, posixPath, projectType)` — pure helper for workflow-core project-type rules (SKILL.md + ticket-template.md)
- `adaptBaseStandardsContentForProjectType(content, projectType)` — pure helper for base-standards project-type rules
- Same `WORKFLOW_CORE_PROJECT_TYPE_RULES` / `BASE_STANDARDS_PROJECT_TYPE_RULES` tables feed both the install-time disk-writing path and the upgrade-time fallback comparison target. **Single source of truth** for project-type rules going forward.

**Cross-model review trail**:
- **Round 1 (plan v1.0)** — Codex APPROVE WITH CHANGES (7 findings), Gemini APPROVE WITH CHANGES (6 findings including CRITICAL scope sizing). → plan v1.1 addresses 10/13.
- **Round 2 (plan v1.1)** — both APPROVE WITH CHANGES + "proceed to implementation" (9 tightening findings → plan v1.2).
- **Round 3 (post-implementation diff)** — Gemini APPROVE WITH CHANGES (1 HIGH, 2 false positives verified against code); Codex REJECT (1 HIGH, 2 MEDIUM test-hardening deferred). Both HIGH findings fixed; scenario 70 added as explicit regression guard.

**Smoke tests**: 59 → **72** (+13). New scenarios 60–70 + sub-scenarios 63b, 63c. Primary regression guards: scenario 63c (scanner additive), scenario 67 (full upgrade idempotency), scenario 70 (Gemini round-3 workflow-core preserve invariant).

### v0.17.2 (next) — Full smart-diff coverage for remaining template files

Extends v0.17.1's smart-diff scope to ~30 additional files currently under wholesale-recopy semantics.

- **Additional skill files**: `bug-workflow/SKILL.md`, `health-check/SKILL.md`, `pm-orchestrator/SKILL.md`, `project-memory/SKILL.md` + their template references (`pm-session-template.md`, `bugs_template.md`, `decisions_template.md`, `key_facts_template.md`)
- **development-workflow/references/**: `pr-template.md` (highest-risk customization — teams have company-specific PR templates), `branching-strategy.md`, `failure-handling.md`, `workflow-example.md`, `complexity-guide.md`, `add-feature-template.md`, `cross-model-review.md`
- **Scanner extensions**: pnpm-workspace.yaml support, `**` recursive patterns, `!exclude` negation
- **Test hardening** (Codex round-3 findings 2 + 3): scenario 61 dedicated raw-template branch assertion; scenario 63c frozen snapshot for byte-exact single-package invariant check
- **Design refinement**: data-driven enumeration — `expectedSmartDiffTrackedPaths` returns ALL template-provided files. No per-file adaptation logic for the new batch (they're static templates). Fallback compare uses `normalizeForCompare` directly.
- **Dependency**: empirical validation of v0.17.1 against foodXPlorer (in progress, post-publish)

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

**Known limitation** (closed in v0.17.1): provenance tracking scope was limited to template agents + AGENTS.md. `SKILL.md`, `ticket-template.md`, `documentation-standards.mdc`, and `ai-specs/specs/*.mdc` standards continued with v0.16.10 behavior until v0.17.1 extended first-class smart-diff to them.

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
