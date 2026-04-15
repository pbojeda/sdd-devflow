# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.17.2] - 2026-04-15

### Fixed

- **Scanner monorepo fix now fires when root `.env.example` triggers partial detection** — v0.17.1's scanner monorepo fix gated workspace enumeration on `!backend.detected || !frontend.detected`. Empirical validation against foodXPlorer on 2026-04-15 revealed this guard was too tight: `detectBackend` has a partial-detection fallback (`lib/scanner.js:258-261`) that sets `result.detected = true` when only `db` or `orm` was found, even if `framework` is still null. A root `.env.example` declaring `DATABASE_URL=postgresql://...` + `PORT=3001` is enough to trigger it. Under the v0.17.1 guard, fx's root `detectBackend` returned `{detected: true, framework: null, orm: null, db: "PostgreSQL", port: 3001}` → enumeration was skipped → `scan.backend.framework` stayed null → `adaptBackendStandards` produced generic placeholders → `adaptAgentsMd` fell back to the `(DDD, Express, Prisma)` template literal in the `.new` backup. Fix: gate the enumeration on `!framework` instead of `!detected`. The guard is strictly looser than v0.17.1's, so the enumeration runs in a strict superset of cases.
- **Workspace merge preserves root-level env-derived fields** — v0.17.1's workspace merge used `Object.assign(backend, wsBackend, ...)`, which overwrote root-level fields with workspace nulls. A root `.env` with `DATABASE_URL` would set `root.db = "PostgreSQL"`, but if `packages/api` didn't have its own `.env`, `wsBackend.db = null` → `Object.assign` wiped the root value. Fix: field-by-field merge using `Object.keys(wsBackend)` with a null-guard, so the workspace only overrides fields it actually detected while preserving root-level env-derived info (`db`, `port`). The `Object.keys` form (vs a hardcoded field list) forwards any future additions to `detectBackend` / `detectFrontend` automatically (Gemini round-4 finding 1).

### Added

- **Scenario 71 `testMonorepoScannerWithRootEnvFallback`** — direct reproduction of the foodXPlorer shape: declaration-order workspaces (`packages/shared`, `packages/api`, `packages/web`), root `.env.example` with `DATABASE_URL` + `PORT`, Fastify + Prisma in `packages/api`, Next.js in `packages/web`. Asserts both framework promotion from the middle workspace AND preservation of root-level `db`/`port` through the merge. Brings total 72 → **73** smoke scenarios.

### Cross-model reviewed

**Round 4 — post-implementation diff review** (2026-04-15):
- **Codex**: APPROVE — no findings.
- **Gemini**: APPROVE WITH CHANGES — 1 HIGH finding: the initial fix used a hardcoded field list in the merge loop (`['framework', 'orm', 'db', 'port', 'validation']`), which would silently drop any future field added to `detectBackend`/`detectFrontend`. Finding verified correct: current `detectBackend` returns 6 fields but the hardcoded list had only 5 (missing `detected`, set explicitly after the loop). Fixed by iterating `Object.keys(wsBackend)` / `Object.keys(wsFrontend)` dynamically, removing the now-redundant explicit `.detected = true` assignment (`detected` is always `true` when `framework` is truthy in detectBackend's framework-detection loop).

## [0.17.1] - 2026-04-15

### Fixed

- **Scanner monorepo fix — `adaptAgentsMd` no longer falls back to the `(DDD, Express, Prisma)` literal on monorepos** — `lib/scanner.js`'s `detectBackend` / `detectFrontend` only read the root `package.json`, so a monorepo whose real dependencies live under `packages/*` or `apps/*` would scan as empty → `config.backend.framework === null` → `adaptAgentsMd` emitted the template-literal `Backend patterns (DDD, Express, Prisma)` into the user's `AGENTS.md`. Exposed by the foodXPlorer v0.16.10 → v0.17.0 upgrade, which silently wrote `(DDD, Express, Prisma)` over the correct `(Fastify, Prisma, Kysely)`. v0.17.1 adds an `enumerateWorkspaces(dir, pkg)` fallback that parses `pkg.workspaces` (array or object form), deterministically expands single-wildcard patterns (`packages/*`, `apps/*`), filters to directories containing `package.json` (npm/yarn workspace spec compliance — Codex round-3 finding 1), and iterates with first-match-wins across backend + frontend detection. Adds `scan.backend.workspaceSource` / `scan.frontend.workspaceSource` fields for observability. pnpm-workspace.yaml, `**` recursive patterns, and `!exclude` negation are **out of scope for v0.17.1**, deferred to v0.17.2.
- **`adaptFrontendStandards` Project Structure regex is now idempotent** — `lib/init-generator.js`'s adapter replaced the `## Project Structure` block but did not consume the trailing `<!-- TODO: Expand the structure above ... -->` marker, so applying the adapter twice duplicated the marker. Scenario 66 (idempotency) caught this during Phase 2 implementation. Fixed with an optional-group in the regex so repeat applications are no-ops.
- **Upgrade fallback compare now accepts both adapted target AND raw template content as "pristine"** (`lib/upgrade-generator.js` standards + workflow-core fallback paths). `generator.js` scaffolds by copying raw templates to disk; `init-generator.js` additionally runs stack adaptations. Both paths produce a valid "pristine state" for the smart-diff fallback, but v0.17.0 only compared against the adapted target — so a fresh-scaffolded v0.17.0 project upgrading to v0.17.1 would false-positive-preserve all 4 standards on its first upgrade. Fix: fallback compare now matches against `normalizedContentEquals(existing, adapted) || normalizedContentEquals(existing, rawTemplate)`.
- **`isStandardModified` helper removed and renamed to `normalizedContentEquals`** (`lib/meta.js`) — standards-specific in name but file-agnostic in logic. Rename makes the helper's purpose explicit and collocates it with `normalizeForCompare`. `lib/diff-generator.js` keeps a thin local wrapper to preserve its internal API.
- **Post-upgrade CLI warning no longer claims provenance tracking is future work** — v0.17.0 shipped with a stale v0.16.10-era message: _"v0.16.10 uses conservative preserve semantics... Provenance tracking (v0.17.0) will eliminate these false positives"_. Confusing in v0.17.0 and wrong in v0.17.1. Replaced with wording that explains the fallback path is expected only on the first v0.17.0+ upgrade from a pre-v0.17.0 project, and that subsequent upgrades use hash-based precision.

### Added

- **Smart-diff expansion — 10 additional files now provenance-tracked**. v0.17.0 covered template agents + `AGENTS.md` (21 paths). v0.17.1 extends this to 31 paths:
  - **4 standards**: `ai-specs/specs/{base,backend,frontend,documentation}-standards.mdc` (project-type-filtered: backend-only projects skip `frontend-standards.mdc` and vice versa)
  - **6 development-workflow skill core files**: `SKILL.md`, `references/ticket-template.md`, `references/merge-checklist.md` × `.claude/` and `.gemini/` (aiTools-filtered)
  - Each file follows the same hash decision tree: missing/force → write, stored hash match → replace, stored hash mismatch → preserve + `.new` backup, no stored hash → fallback compare against the fully-adapted target (stack rules + project-type rules) OR the raw template. Codex M1 invariant holds: preserved files never get a new hash entry.
  - **The B+D checkpoint mechanism** (`SKILL.md`, `ticket-template.md`, `merge-checklist.md` — the core workflow files that define the Merge Approval step users rely on) is now protected from silent customization loss on upgrade. This closes the long-standing "el problema central de la librería" gap.
- **Workflow-core smart-diff block (step c2) in `runUpgrade`** — captures `workflowCoreBackup` Map BEFORE the wholesale `skills/` delete-and-copy (step b), then runs the hash decision tree against the backup after step b has overwritten disk with fresh templates. Restores the backup on customization mismatch. The backup is map-keyed by absolute path to avoid POSIX/Windows slash ambiguity.
- **Standards hash decision tree in `runUpgrade`** — replaces the v0.17.0 `isStandardModified` main-path compare with the unified decision tree. A `standardsSpecs` dispatch table maps each standard's POSIX path to its adapter (`adaptBaseStandards`, `adaptBackendStandards`, `adaptFrontendStandards`, or `applyStackAdaptationsToContent` for documentation-standards), with `projectType` filtering via an `include` flag.
- **`lib/adapt-agents.js` exports pure helpers for project-type rules** — `adaptWorkflowCoreContentForProjectType(content, posixPath, projectType)` and `adaptBaseStandardsContentForProjectType(content, projectType)`. Same rule tables (`WORKFLOW_CORE_PROJECT_TYPE_RULES`, `BASE_STANDARDS_PROJECT_TYPE_RULES`) feed both the install-time disk-writing path (`adaptAgentContentForProjectType`) and the upgrade-time fallback comparison target — single source of truth for project-type rules. Exposed to let `upgrade-generator.js`'s c2 fallback and standards block build the correct "what init would have produced" comparison target (was missing these rules in earlier v0.17.1 drafts, which false-positive-preserved single-stack projects; surfaced by scenario 55 regression during round-3 remediation).
- **Doctor check #14 extension — `Backend patterns` / `Frontend patterns` sparse-entry observability** (`lib/doctor.js` `checkAgentsMdStandardsRefs`). Warns when `adaptAgentsMd`'s pattern line has exactly 1 entry, suggesting scanner detection missed framework or ORM. Permissive WARN (exit code 0), informational only — projects legitimately vary (ORM-only backends, component-less frontends) so the check is scoped narrowly. Gemini round-1 Q10 observability item.
- **13 new smoke scenarios (60–70 + sub-scenarios 63b, 63c)**, bringing total from 59 → **72**:
  - **60** `testHashBasedStandardsUpgrade` — customized standards preserved, hash unchanged
  - **61** `testFallbackCompareForWorkflowCore` — no stored hash, fallback pristine replace
  - **62** `testMonorepoScannerDetection` — scanner finds backend in `packages/api` monorepo workspace
  - **63** `testAgentsMdMonorepoOutput` — `adaptAgentsMd` produces detected stack for monorepo
  - **63b** `testMonorepoGlobOrdering` — `enumerateWorkspaces` deterministic + dedupes overlapping patterns
  - **63c** `testScannerAdditiveInvariant` — single-package scan unchanged, monorepo scan strict superset
  - **64** `testDeletedStandardFileRestored` — deleted standard file recreated on upgrade
  - **65** `testMetaReadCompatibilityContract` — D3 contract test: v0.17.0 readMeta prunes v0.17.1 extra keys (non-corrupting, lossy)
  - **66** `testIdempotencyExtendedRules` — standards adapters idempotent (second apply is no-op)
  - **67** `testFullUpgradeIdempotency` — two consecutive upgrades produce byte-identical `.sdd-meta.json` and zero new `.new` backups on second run
  - **68** `testNormalizationResilienceAllTrackedFiles` — CRLF drift across all tracked files treated as pristine (parameterized over the full tracked set)
  - **69** `testUpgradeMessageCopy` — post-upgrade warning uses new wording, stale v0.16.10 wording absent
  - **70** `testWorkflowCorePreservesOnHashMismatch` — **Gemini round-3 finding 1 regression guard**. Customized SKILL.md survives upgrade AND stored hash unchanged (catches the Codex M1 violation of the pre-round-3 `filesToAdapt.add` masking)

### Cross-model reviewed

**Round 1 — plan v1.0 review** (2026-04-14):
- **Codex**: APPROVE WITH CHANGES — 7 findings (phase order, dispatch table structure, downgrade path characterization, doctor check extension, scope sizing).
- **Gemini**: APPROVE WITH CHANGES — 6 findings (CRITICAL scope sizing, scenario 68 drift wording, D2 ordering determinism, observability for sparse patterns, fallback path rollout).
- Consolidated into plan v1.1 (10 findings addressed, 3 deferred to v0.17.2).

**Round 2 — plan v1.1 review** (2026-04-15):
- Both models APPROVE WITH CHANGES + explicit "proceed to implementation".
- 9 tightening findings incorporated into plan v1.2 (dispatch table acceptance criterion, D2 three-level ordering, scanner additive invariant enforcement via scenario 63c, D3 empirical correction).
- One v1.0 claim corrected: `readMeta` does not "ignore extra keys gracefully" — `pruneExpectedAbsent` actively drops unknown keys. Rewritten as "Meta read compatibility (limited)" trade-off.

**Round 3 — post-implementation diff review** (2026-04-15):
- **Gemini**: APPROVE WITH CHANGES — HIGH finding on `filesToAdapt` leak for preserved workflow-core files (Codex M1 violation). Two additional findings verified as false positives: #2 claimed the sparse-patterns doctor check would cause CI failure (actually WARN → exit 0); #3 claimed workflow-core preserves shown under "Agents" in output (actual header is neutral `"Review preserved customizations"`).
- **Codex**: REJECT — HIGH finding that `expandWorkspacePattern` enumerated directories without `package.json` (npm/yarn spec violation); two MEDIUM test-hardening findings (scenarios 61 and 63c could be stricter — deferred to v0.17.2).
- Gemini HIGH fix: removed the pre-v0.17.1 unconditional `filesToAdapt.add` calls at the tail of `runUpgrade`. Exposed a latent gap — the c2 fallback comparison target missed project-type rules applied by init — which was previously masked by those same unconditional adds force-hashing the files on first upgrade. Fix: extracted project-type rules for workflow-core + base-standards into pure helpers and used them in the fallback compare targets. Single source of truth now lives in `lib/adapt-agents.js`.
- Codex HIGH fix: `expandWorkspacePattern` now filters candidate dirs to those containing `package.json` (both the wildcard and literal-path branches).
- Scenario 70 added as explicit regression guard for the Gemini finding.

### Out of scope (deferred to v0.17.2)

- Additional skills (`bug-workflow/SKILL.md`, `health-check/SKILL.md`, `pm-orchestrator/SKILL.md`, `project-memory/SKILL.md`) and their template references (`pm-session-template.md`, `bugs_template.md`, `decisions_template.md`, `key_facts_template.md`) — ~30 files remain under wholesale-recopy semantics and are known vulnerable to silent customization loss.
- `references/pr-template.md` (highest-risk customization file — teams often have company-specific PR templates).
- Remaining `development-workflow/references/*.md` files (`branching-strategy`, `failure-handling`, `workflow-example`, `complexity-guide`, `add-feature-template`, `cross-model-review`).
- pnpm-workspace.yaml support, `**` recursive workspace patterns, `!exclude` negation.
- Round-3 test-hardening findings: scenario 61 dedicated raw-template branch assertion, scenario 63c frozen snapshot (currently uses structural proxy).

**Why staged** (Option C from plan v1.2): patch release sizing, blast radius control for `normalizeForCompare` edge cases, empirical validation feasibility (foodXPlorer has real customizations in v0.17.1 scope but not in the deferred scope), and — most importantly — the B+D checkpoint mechanism is protected in v0.17.1, closing the "problema central" gap without waiting for the full scope.

## [0.17.0] - 2026-04-13

### Fixed

- **`--upgrade` no longer false-positive-preserves pristine files across versions** — v0.16.10's smart-diff compared the user's file against the NEW template's adapted output. When a template agent or `AGENTS.md` changed between releases (the normal state of affairs), a pristine file from the older version wouldn't match the new adapted target → preserved → user had to run `--force-template` or manually merge every file on every cross-version upgrade. v0.17.0 introduces content-addressable provenance tracking: every install/init/upgrade writes a `.sdd-meta.json` file with SHA-256 hashes of the post-adaptation content of each tracked file. At upgrade time, the smart-diff compares the user's current hash against the stored hash — if they match, the file is genuinely untouched since the last tool-write and is safely replaced. If they differ, the file is preserved (same as v0.16.10). This closes Codex's P1 finding from the v0.16.10 cross-model review.
- **Cross-path drift between `--init` and `--upgrade` stack adaptations resolved** — v0.16.10's `lib/init-generator.js` applied rich stack adaptations (Zod → validation, Prisma → detected ORM, DDD → layered, `shared/src/schemas/` path cleanup) via its local `adaptCopiedFiles` function. `lib/upgrade-generator.js` did NOT mirror those adaptations, so a project installed via `--init` would see its stack customizations silently reverted on every upgrade. v0.17.0 extracts the adaptation logic into a shared `lib/stack-adaptations.js` module with two entry points: `applyStackAdaptations(dest, scan, config, allowlist)` (file-based, allowlist-aware) and `applyStackAdaptationsToContent(content, posixPath, scan, config)` (pure, in-memory). Both init and upgrade call the shared module, so the same `(scan, config)` input produces identical output regardless of code path. The in-memory variant is used by upgrade's fallback path (when `.sdd-meta.json` is missing) to construct the "what init would have written" comparison target — without this, pre-v0.17.0 `--init` projects would have every stack-adapted file false-positive as customized on their first v0.17.0 upgrade (Gemini M1 fix from plan review).
- **`adaptAgentsMd` uses `meaningfulDirs` instead of `rootDirs` for the project tree** — v0.16.10's guard filtered `ai-specs/` and `docs/` out of the "meaningful" set for the Standards-Reference-pruning decision, but still used the unfiltered `rootDirs` when building the tree block. At install time, `ai-specs/` and `docs/` don't exist yet → absent from rootDirs → tree reflects only user source dirs. At upgrade time, those dirs DO exist (installed by SDD itself) → included in rootDirs → tree now contains them too. Different inputs → different outputs → hash drift → false-positive preserve warning on every upgrade of an `--init` project. Fix: use `meaningfulDirs` consistently for tree generation so the output is stable across install and upgrade regardless of whether SDD infrastructure is on disk.

### Added

- **`lib/meta.js` — provenance tracking helper module** (~260 lines). Exports `META_FILE`, `CURRENT_SCHEMA_VERSION`, `computeHash`, `hashFileOnDisk`, `toPosix`, `normalizeForCompare`, `readMeta`, `writeMeta`, `expectedSmartDiffTrackedPaths`, `pruneExpectedAbsent`, `computeInstallHashes`. SHA-256 over CRLF-normalized UTF-8 content, format `sha256:<hex>` (algorithm-tagged so v0.17.x can introduce alternatives without breaking v0.17.0 readers). `readMeta` never throws: corrupted/missing/unparseable files return `null` so the upgrade path can fall back to v0.16.10 content comparison. `writeMeta` is non-fatal: I/O failures log a warning but don't crash the upgrade.
- **`lib/stack-adaptations.js` — shared stack-adaptation module** (~330 lines). Data-driven rule table extracted from the previous imperative body of `init-generator.js`'s `adaptCopiedFiles`. Public API: `applyStackAdaptations(dest, scan, config, allowlist)` runs the rules on disk with optional allowlist scoping, `applyStackAdaptationsToContent(content, posixPath, scan, config)` is the pure in-memory variant used by the upgrade fallback path, plus lower-level helpers `computeRulesFor`, `applyRulesToContent`, `candidateFilesFor`. Rules cover 9 files: `backend-developer.md` (both `.claude/` and `.gemini/`), `backend-planner.md`, `spec-creator.md`, `production-code-validator.md`, `database-architect.md`, `development-workflow/SKILL.md`, `development-workflow/references/ticket-template.md`, and `ai-specs/specs/documentation-standards.mdc` (project-type-driven pruning).
- **Hash-based smart-diff in `lib/upgrade-generator.js`** — the template-agent smart-diff loop now follows a three-branch decision tree: (1) file missing / `--force-template` → unconditional write + hash update; (2) stored hash exists → compare current file hash against stored hash → match replaces, mismatch preserves; (3) no stored hash → fall back to v0.16.10 content comparison against the full adapted target (core + stack adaptations applied in-memory). **Critical Codex M1 invariant**: the hash map is updated ONLY for files that were replaced or newly written this run. Preserved files leave their hash entry untouched — otherwise next upgrade would hash-match the user's customized content, treat it as pristine, and silently overwrite it. Scenario 54 is the primary regression guard for this invariant.
- **`AGENTS.md` follows the same hash-based decision tree**. `adaptAgentsMd` is an existing shared function (already used by both init and upgrade), so AGENTS.md has no separate stack-adaptation phase — the hash comparison is direct against `adaptAgentsMd(template, config, scan)` output.
- **Upgrade allowlist for `applyStackAdaptations`** — the upgrade path builds a `filesToAdapt` Set containing the POSIX paths of every file that was replaced or newly written in this run (template agents via smart-diff + SKILL.md / ticket-template.md / documentation-standards.mdc via wholesale recopy). The shared module is called with this Set as the allowlist, so stack adaptations only touch replaced files. Preserved user-edited files are NEVER touched by stack adaptations, preventing rule replacements from mangling user content.
- **`writeMeta` called at the end of `generate`, `generateInit`, and `generateUpgrade`** — all three install/upgrade paths now write `.sdd-meta.json` with hashes of the final on-disk content. `computeInstallHashes(dest, aiTools, projectType)` walks the expected tracked set and hashes every existing file.
- **Doctor check #15: `.sdd-meta.json` structural integrity** (`lib/doctor.js`). Validates valid JSON, `schemaVersion ≤ current`, `hashes` is an object, every hash value matches `^sha256:[0-9a-f]{64}$`, keys are not absolute or `..`-traversal suspicious, and no orphan entries exist for the current `(aiTools, projectType)`. Does NOT validate hash match against current file content (Codex M3 fix — hash mismatches are the expected result of legitimate user customization, not a doctor-level integrity issue). Severity: PASS when missing (informational: "no provenance tracking (pre-v0.17.0 project or fresh install)") or valid, WARN on structural corruption. Brings doctor total from 14 → 15.
- **`template/gitignore` adds `.sdd-meta.json`**. The upgrade path idempotently appends the entry to existing projects' `.gitignore` (same pattern as v0.16.10's `.sdd-backup/` append), so pre-v0.17.0 projects don't accidentally commit the provenance file.
- **POSIX path normalization** (Gemini M2 fix) — `.sdd-meta.json` hash-map keys are always POSIX form (forward slashes). On Windows where `path.join` produces backslashes, the upgrade path calls `toPosix(relativePath)` before every read/write against `meta.hashes`. Prevents Windows false-negative lookups that would route pristine files into the fallback path.
- **`normalizeForCompare` only strips `\r`/`\r\n`** (Gemini M2 fix) — v0.16.10's version also stripped per-line trailing whitespace, which silently destroyed markdown hard-breaks (two trailing spaces = `<br>`). v0.17.0 strips line endings only, preserving markdown semantics. Trade-off: editors configured to "trim trailing whitespace on save" (e.g. VSCode `files.trimTrailingWhitespace: true`) produce a conservative false-positive preserve warning — `--force-template` is the escape hatch.
- **Hash map pruning by expected-presence, not on-disk-presence** (Gemini M3 fix) — `pruneExpectedAbsent` removes only hashes for paths that are not in the tracked set for the current `(aiTools, projectType)` (e.g., single-stack project removed frontend agents). A user who temporarily deletes an agent file keeps its hash; next upgrade will recreate the file from template and the hash remains valid.
- **Nine new smoke tests (50–58)**, bringing total from 49 → 58:
  - **50** `testCreateWritesMetaJson` — fresh scaffold produces valid `.sdd-meta.json` with 21 hash entries for default fullstack-both.
  - **51** `testInitWritesMetaJsonAfterStackAdaptations` — synthetic Express+Mongoose project via `--init` produces a meta file AND the backend-developer.md content reflects stack adaptations (no "Prisma ORM").
  - **52** `testUpgradeUpdatesMetaJson` — round-trip scaffold → upgrade → meta file still valid and populated.
  - **53** `testUpgradeHashPathReplacesWithoutWarning` — **PRIMARY CODEX P1 REGRESSION GUARD**. Second upgrade on a pristine v0.17.0 project must NOT produce a preserved-customizations block. Proves the hash path replaces cleanly regardless of same-version or cross-version drift.
  - **54** `testUpgradeHashMismatchPreservesAndKeepsOldHash` — **PRIMARY CODEX M1 REGRESSION GUARD**. Customize backend-planner → upgrade → file preserved AND the stored hash unchanged. Second upgrade: still preserved, hash still unchanged. Proves preserved files never get hashed with their customized content.
  - **55** `testFallbackPathHandlesInitStackAdaptedFiles` — **PRIMARY GEMINI M1 REGRESSION GUARD**. Simulate a pre-v0.17.0 `--init` project (delete meta after init). First upgrade via fallback path must NOT flag stack-adapted files as customized. Proves `applyStackAdaptationsToContent` is wired correctly into the fallback comparison target. Second upgrade via the hash path must be clean.
  - **56** `testStackAdaptationsIdempotent` — apply every rule to 7 template files twice, assert second pass is a no-op. Protects the rule-design invariant "replacement value must not reintroduce the source pattern".
  - **57** `testDoctorMetaJsonValidity` — fresh scaffold = PASS, missing meta = informational PASS, corrupted JSON = WARN, orphan entry = WARN.
  - **58** `testScannerOverridesWizardOnUpgrade` — scaffold via `create-sdd-project` then add Mongoose to `package.json`, upgrade. Assert post-upgrade `backend-developer.md` no longer contains "Prisma ORM" (scanner detected the real stack and re-adapted). Documents the "scanner-as-source-of-truth" design semantic.

### Documented design semantics

- **Hashes represent tool-owned canonical state**, not "file existed at some point". A hash is written only when the tool actually wrote canonical content to a file in the current run. Preserved files leave their hash entry untouched. This is the invariant that prevents the v0.16.10 class of silent-clobber-one-upgrade-later.
- **Scanner is the authoritative source of truth post-install**. The wizard's `bPreset` config is an initial guess at scaffold time. After install, the user may add/remove/change dependencies. Upgrades re-scan the project and re-apply adaptations based on current reality. Hash-based replacement means if the user hasn't edited the file, the tool can safely overwrite with the new adapted output — including changes driven by scanner evolution. If the user's prediction matched reality, the re-adapted output is identical → no visible change. If not, the file now reflects the actual stack.
- **v0.17.0's smart-diff scope is template agents + `AGENTS.md`**. `SKILL.md`, `ticket-template.md`, and `documentation-standards.mdc` continue with wholesale-recopy + stack-adaptation on every upgrade (v0.16.10 behavior — they were never user-customizable via smart-diff). First-class smart-diff for those files is a v0.17.x candidate (Codex M1 option 2 from plan review, deferred).

### Cross-model reviewed

**Round 1 — plan review**:
- **Codex**: REJECT v1.0 — M1 × 2 (preserved-file hashing, SKILL.md tracking), M2 (create→upgrade adaptation divergence), M3 (doctor hash-mismatch noise).
- **Gemini**: APPROVE WITH CHANGES — M1 (fallback path false-positive explosion), M2 × 2 (Windows paths, markdown hard-breaks), M3 (hash map pruning).

All 8 consensus findings incorporated into plan v1.1 before implementation. See `dev/v0.17.0-provenance-plan.md` § Cross-model review (round 1, plan v1.0).

**Round 2 — patch review**:
- **Gemini**: APPROVE (no findings — explicitly verified all 7 invariants against the patch).
- **Codex**: two new findings on `--init` path:
  - **P1** `lib/init-generator.js:257` — `computeInstallHashes` hashed user-owned pre-existing files (skipped by `copyFileIfNotExists`), marking them as tool-canonical. Next upgrade would silently overwrite user content. **FIXED**: `computeInstallHashes` accepts an `excludeSet` parameter, `generateInit` passes the `skipped` set (POSIX-normalized). Scenario 58b is the regression guard.
  - **P2** `lib/init-generator.js:appendGitignore` — `--init` wrote `.sdd-meta.json` but didn't idempotently append it (or `.sdd-backup/`) to the user's `.gitignore`. **FIXED**: `appendGitignore` now appends both entries idempotently, matching the upgrade path behavior.

### Known limitation

Provenance tracking for `SKILL.md`, `ticket-template.md`, `documentation-standards.mdc`, and `ai-specs/specs/*.mdc` standards files is NOT implemented in v0.17.0. Those files continue with wholesale-recopy + stack-adaptation on every upgrade. First-class smart-diff for them is a v0.17.x candidate.

## [0.16.10] - 2026-04-13

### Fixed

- **`--upgrade` no longer silently overwrites customized template agents or `AGENTS.md`** — v0.16.9's upgrade path had smart-diff protection for `ai-specs/specs/*.mdc` standards but not for template agent files or `AGENTS.md`. Template agents were wholesale-deleted and recopied; `AGENTS.md` was unconditionally overwritten. User customizations were silently lost on every upgrade. This landed in production when foodXPlorer ran `npx create-sdd-project@0.16.9 --upgrade --force --yes` and lost the Project Context section of `AGENTS.md` plus stack-specific customizations in `.claude/agents/backend-planner.md` and `.gemini/agents/backend-planner.md`. Recovered via `git show f8e5929:<path>`, then v0.16.10 was built to close the class.
- **Root-cause fix: `adaptAgentsMd` no longer produces `"Backend patterns ()"` empty parens** — when the scanner cannot detect a backend framework/ORM on a scaffolded project (no real source code yet), the previous code ran `parts.filter(Boolean).join(', ')` with an empty array, emitting broken output. Now guarded: only replace the Standards Reference line when `parts.length > 0`; otherwise leave the template default (`Backend patterns (DDD, Express, Prisma)`). This was the exact shape of the broken `AGENTS.md` foodXPlorer ended up with after the v0.16.9 upgrade.
- **`adaptAgentsMd` uses `config.projectType` as the authoritative source for pruning Standards links** — previously the function used `scan.frontend.detected` / `scan.backend.detected` to decide whether to remove `[Frontend Standards]` or `[Backend Standards]` entries. Scanner detection is unreliable on freshly-scaffolded projects (there's no real source code for the scanner to find), which caused cross-path drift: the scaffold path kept both links (because the user declared fullstack), but the upgrade path removed one or both. Now the pruning reads `config.projectType` (which is user-declared at scaffold time or detected from existing files at upgrade time), making scaffold and upgrade converge on pristine projects.
- **`adaptAgentsMd` no longer rewrites the project tree when the scanner only found SDD-infrastructure directories** — the previous code unconditionally rewrote the `<!-- CONFIG: Adjust directories -->` block using `scan.rootDirs`, which on a scaffolded project returns `['ai-specs/', 'docs/']` and produced a duplicate-`docs/` trivial tree. Now guarded: only rewrite when the scan detected at least one non-SDD directory (`src/`, `backend/`, etc.).

### Added

- **Smart-diff protection for template agent files** (`lib/upgrade-generator.js`) — the agents subdirectory of `.claude/` / `.gemini/` is no longer wholesale-deleted and recopied. Instead, each file listed in `TEMPLATE_AGENTS` is individually compared against the output of `adaptAgentContentString(rawTemplate, file, projectType)`. If the user's file matches the adapted target, the file is replaced (with a cheap-insurance backup first). If it differs, the file is preserved in place and the new adapted content is saved as `<path>.new` inside the backup directory for manual re-merge. Custom (non-template) agents are never touched — the filter on `TEMPLATE_AGENTS.includes(e.name)` leaves them alone. Mirrors the standards smart-diff pattern already in place since v0.15.
- **Smart-diff protection for `AGENTS.md`** (`lib/upgrade-generator.js`) — the unconditional overwrite is replaced with a comparison against `adaptAgentsMd(template, config, scan)`. Customized `AGENTS.md` is preserved, with the fresh adapted version saved as `.sdd-backup/<ts>/AGENTS.md.new`.
- **Backup-before-replace for every file the upgrade replaces** (`lib/upgrade-generator.js`) — module-level `backupBeforeReplace(dest, relativePath, backupTimestamp)` helper writes a copy of the existing file to `.sdd-backup/<YYYYMMDD-HHMMSS-NNNN>/<relative-path>` before any modification. `NNNN` is the last 4 digits of `Date.now()` for collision safety (cross-model review finding). Idempotent per run via module-level `backedUpPaths` Set. Non-fatal on copy failure. Covers template agents, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`. Nuclear safety net so even when smart-diff has false negatives (cross-version drift), recovery is always possible via `diff .sdd-backup/<ts>/<path> <path>`.
- **`.new` backups contain the ADAPTED output, not the raw template** (`lib/adapt-agents.js`) — cross-model review found that a raw-template `.new` backup would force the user to manually redo the project-type adaptation when merging. Extracted `adaptAgentContentString(content, filename, projectType)` as a pure function from `adaptAgentContentForProjectType` so both the install path and the upgrade smart-diff can share the exact same rules. The `.new` file now contains the fully-adapted output the upgrade WOULD have written if the file had been pristine.
- **`AGENT_ADAPTATION_RULES` data table** (`lib/adapt-agents.js`) — the per-file adaptation rules for backend/frontend single-stack projects are now a declarative table keyed by filename. Accessible as a module export so smoke tests can verify every referenced template file exists (regression guard against renaming a template without updating the rules).
- **`--force-template` CLI flag** (`bin/cli.js`, `lib/upgrade-generator.js`) — users who know they have not customized template agents or `AGENTS.md` can re-run upgrade with `--upgrade --force --force-template --yes` to accept new template content without preservation warnings. Backup still happens so recovery is always possible. Motivated by cross-model review's recommendation: v0.16.10 accepts conservative preserve semantics as the trade-off, and provides an escape hatch for users who want the new template content.
- **Idempotent `.gitignore` append of `.sdd-backup/`** (`lib/upgrade-generator.js`) — new projects get `.sdd-backup/` via `template/gitignore`. Existing projects upgraded from v0.16.9 have the entry appended during upgrade via a regex-guarded idempotent block (matches `.sdd-backup`, `.sdd-backup/`, `/.sdd-backup`, or `/.sdd-backup/` on any line). Running upgrade twice is a no-op on the second run. Prevents users from accidentally committing their backup directories.
- **Upgrade summary output extension** (`lib/upgrade-generator.js`) — when `modifiedAgentsResults` is non-empty, the upgrade prints a dedicated `⚠ Review preserved customizations` block listing each preserved file, pointing at the backup directory, and showing both the manual re-merge command (`cp .sdd-backup/<ts>/<path>.new <path>`) and the `--force-template` escape hatch.
- **Doctor check #14: AGENTS.md standards references** (`lib/doctor.js`) — detects the two broken shapes that foodXPlorer's `AGENTS.md` ended up in after the v0.16.9 upgrade: (a) empty-parens adapter failure (`Backend patterns ()` / `Frontend patterns ()`), (b) unsubstituted placeholder labels like `[Framework, runtime, version]` (filtered to exclude the four known-good standards link labels: `[Backend Standards]`, `[Frontend Standards]`, `[Base Standards]`, `[Documentation Standards]`). Severity WARN, not FAIL — an empty-parens `AGENTS.md` doesn't break the project, it just leaves agents without full stack context. Brings doctor total from 13 to 14.
- **Generalized Pre-Emission Verification examples in planner templates** (`template/.claude/agents/backend-planner.md`, `template/.gemini/agents/backend-planner.md`, `template/.claude/agents/frontend-planner.md`, `template/.gemini/agents/frontend-planner.md`) — v0.16.8 had injected foodXPlorer-specific examples (`PortionContext`, `StandardPortion`, `formatPortionTermLabel`, `@foodxplorer/shared`, `dishId`, `packages/api/prisma/schema.prisma:318-330`, `racion`, `tapa`, `pincho`, `croqueta`, `pgvector`) into the examples. Replaced with project-agnostic neutral examples (`Status` enum, `cuid()` primary keys, `formatStatusLabel`, `src/shared/`). Smoke scenario 47 guards against future overfit regressions.
- **Seven new smoke test scenarios (43–49)** in `test/smoke.js`, bringing total from 42 to 49:
  - **43** `testUpgradePreservesCustomAgents` — scaffolds fullstack, customizes `backend-planner.md` + `AGENTS.md`, runs upgrade, asserts both preserved + `.new` backups contain adapted content + warning in output.
  - **44** `testUpgradeReplacesPristineAgentsFullstack` — scaffolds fullstack, upgrades immediately, asserts no `Review preserved customizations` block and no `.new` files for agents or `AGENTS.md`.
  - **45** `testUpgradeReplacesPristineAgentsBackendOnly` — unit-level regression guard for the `adaptAgentContentString` pure function: asserts fullstack is a no-op, backend strips frontend refs, frontend strips backend refs, output is deterministic, and every filename in `AGENT_ADAPTATION_RULES` exists under `template/.claude/agents/`. The full init→upgrade round-trip was out of scope because init-generator.js applies stack-specific adaptations (DDD → layered, ORM swaps) that are not mirrored in upgrade-generator.js; cross-adapter convergence is deferred to v0.17.0 (provenance tracking).
  - **46** `testDoctorAgentsMdEmptyParens` — corrupts `AGENTS.md` with `Backend patterns ()`, runs doctor, asserts check #14 WARNs.
  - **47** `testAgentExamplesAreProjectAgnostic` — reads all four planner templates, asserts none contain any foodXPlorer-specific string from the forbidden list. Regression guard against template overfit.
  - **48** `testUpgradeGitignoreAppend` — strips `.sdd-backup/` from a scaffolded `.gitignore` to simulate a pre-v0.16.10 project, upgrades, asserts exactly one `.sdd-backup/` line is appended. Upgrades a second time, asserts still exactly one line (idempotent).
  - **49** `testForceTemplateFlag` — customizes `AGENTS.md`, runs `--upgrade --force --force-template --yes`, asserts the customization is wiped and the pre-replace content is recoverable from `.sdd-backup/<ts>/AGENTS.md`.

### Documented limitation

Cross-version pristine upgrades may trigger conservative preserve warnings. If the template content drifted between versions (e.g., v0.16.7 → v0.16.10), a pristine user file will look "customized" to the smart-diff because it matches the OLD template's adapted output, not the NEW template's adapted output. The warnings are advisory — users can either manually merge via `cp .sdd-backup/<ts>/<path>.new <path>` or re-run with `--force-template` to accept the new template content in bulk. Backup always happens, so recovery is always possible. **Provenance tracking via `.sdd-meta.json`** (content hashes keyed by template version) is deferred to v0.17.0; that will let the smart-diff distinguish "file matches version-N template" from "file was customized" cleanly. v0.16.10's trade-off was explicitly accepted in cross-model review (Codex finding H, accepted).

### Cross-model reviewed

Plan and patch reviewed by Codex CLI 0.115.0 and Gemini CLI 0.34.0 in parallel. Consensus findings from the plan review (pre-implementation) already incorporated into the v1.1 plan before coding started: timestamp collision safety (`Date.now()` ms suffix), `.new` contains adapted output not raw template (via `adaptAgentContentString` pure function), idempotent `.gitignore` append for existing projects, expanded test coverage from 4 to 7 scenarios, neutral example strings (`Status` / `cuid()` / `formatStatusLabel` instead of `UserRole` / `uuid` / `@/shared`), `backupBeforeReplace` tries copy before mkdir to avoid empty dirs on failure, explicit filename-filtered `readdirSync` loop documenting the invariant that only files in `TEMPLATE_AGENTS` are processed (custom agents untouched), and the v0.17.0 provenance deferral with `--force-template` escape hatch. Second round of cross-model review run on the patch itself before commit.

## [0.16.9] - 2026-04-13

### Added

- **Doctor check #13: Gemini TOML commands format** — validates `.gemini/commands/*.toml` slash command files for required `prompt` field (must be string) and optional `description` field (if present, must be string). Required because Gemini CLI's `FileCommandLoader` silently skips invalid TOML files at startup — errors only reach the interactive UI event system via `coreEvents.emitFeedback`, never stdout/stderr. Without this check, a schema drift (e.g., Gemini renaming `prompt` → `content`) would silently break every scaffolded project's slash commands, exactly the BUG-DEV-GEMINI-CONFIG failure class. Check brings doctor total from 12 to 13.
- **Smoke test Scenario 42: testDoctorGeminiCommandsValid** — 16 sub-cases covering the full parser matrix: valid template TOML (PASS), missing required `prompt` field (FAIL), `prompt` as non-string integer (FAIL), `description` as non-string boolean (FAIL), empty file (FAIL), triple-quoted multiline (PASS), single-quoted literal (PASS), unterminated basic string (FAIL), unterminated literal string (FAIL), unterminated triple-quoted (FAIL), trailing junk after string close (FAIL), duplicate top-level key (FAIL), `#` inside a quoted string (PASS — not misclassified as comment), trailing inline comment after string close (PASS), escaped quotes inside basic string (PASS), symlink as TOML file (FAIL — refused with "symlink" in message). Smoke total: 41 → 42.
- **Strict TOML grammar subset validator** (`validateTomlCommandFile`) in `lib/doctor.js` — hand-rolled parser that enforces a narrow subset sufficient for our templates: top-level `key = <string-literal>` only, bare keys only, all four TOML string forms (basic, literal, triple-quoted basic, triple-quoted literal), rejects unterminated strings, rejects duplicate top-level keys, rejects trailing content after a closed string (only `#` comments allowed), handles `#` inside quoted strings correctly, handles `\\.` escapes in basic strings. Stops scanning at the first `[table]` or `[[array-table]]` section. No runtime dependency added — stays consistent with the library's zero-deps design. If templates ever need richer TOML features, upgrade to `@iarna/toml` as a dep at that point.
- **Symlink guard** in `checkGeminiCommands` — uses `lstatSync` to detect symlinks in `.gemini/commands/` and refuses to follow them. Low severity in a local CLI, but closes a theoretical path-traversal vector.

### Context: why a doctor check instead of a functional test

Gap #3 from the v0.16.8 template drift audit was "no functional test for Gemini TOML commands". Empirical research for v0.16.9 showed that `gemini --help` and `gemini -p ...` do NOT expose command loading errors to stdout/stderr — the `FileCommandLoader.loadCommands()` emits `coreEvents.emitFeedback('error', ...)` events that only the interactive UI sees. A functional smoke test like Scenario 41 (differential baseline/broken) cannot work here because there is no observable error surface.

The reliable alternative is to mirror the Gemini CLI schema in our doctor check — we encode the same invariants (`prompt: z.string()`, `description: z.string().optional()`) using a narrow TOML parser. If upstream Gemini CLI changes those invariants, our check will pass while user projects silently break; we then investigate and update the check in sync. This is the pattern that BUG-DEV-GEMINI-CONFIG should have caught but didn't, because no equivalent check existed for settings.json before v0.16.7.

### Cross-model reviewed

Plan and patch reviewed by Codex CLI 0.115.0 and Gemini CLI 0.34.0 in parallel. Divergent verdicts:

- **Gemini: APPROVE** — "excellent, pragmatic patch. The regex-based parser is cleverly constrained. Good to merge."
- **Codex: REJECT** — identified 5 real false-negative cases in the initial draft: unterminated basic strings (`prompt = "abc`), unterminated literal strings (`prompt = 'abc`), unterminated triple-quoted strings, trailing junk after string close (`prompt = "ok" garbage`), and duplicate top-level keys (`prompt = "a"\nprompt = "b"`). Also flagged a theoretical symlink-following path-traversal vector and a false positive against quoted-key TOML syntax.

**Arbitrage: Codex wins on technical correctness.** The initial "shallow key sniffing" approach left the same class of silent failures that v0.16.9 is supposed to close. Rewrote the parser as a **strict grammar subset validator** that enforces:

- Each TOML string form must have a matching closing quote (basic, literal, triple-quoted basic, triple-quoted literal)
- Duplicate top-level keys are rejected
- Trailing content after a closed string is rejected (only `#` comments allowed)
- `#` inside a quoted string is NOT treated as a comment start (previous implementation had this pitfall)
- Escaped quotes inside basic strings (`"he said \\"hi\\""`) are accepted
- Symlinks in `.gemini/commands/` are refused via `lstat` check

Also **9 new test sub-cases** added for the hardened parser: cases 8-16 covering unterminated basic/literal/triple, trailing junk, duplicate keys, hash in string, trailing comment, escaped quotes, symlink refusal. Scenario 42 now has 16 sub-cases total. Running `npm test` re-runs all 42 scenarios on every commit.

Codex also suggested using `@iarna/toml` as a runtime dependency instead of hand-rolling. Rejected: the library ships with ZERO runtime and ZERO dev dependencies as a design feature. Breaking that for one doctor check is not justified when a hardened grammar-subset validator reaches zero known false negatives for our narrow template use case. If templates ever need richer TOML features (tables, arrays, numbers, dates), we will upgrade to `@iarna/toml` at that point.

The theoretical false positive Codex flagged — quoted-key TOML (`"prompt" = "x"`) — is acknowledged and accepted: our templates never use quoted keys, and if a user manually writes them, the doctor check will produce a clear error message pointing to the offending line rather than a silent failure.

## [0.16.8] - 2026-04-13

### Added

- **Planner agents Pre-Emission Verification section** — `backend-planner.md` and `frontend-planner.md` (both Claude and Gemini templates, 4 files) now have a mandatory section requiring empirical verification of every structural claim before emitting the plan. Planners must grep/read to confirm: file paths exist, types/enums/validation schemas match current code, primary key types match the DB (uuid vs int), enum references are cleaned atomically when dropped, and cited "Existing Code to Reuse" files actually provide what's claimed. Each plan must append a `### Verification commands run` subsection listing every empirical command executed, or prepend a `⚠ TEXT-ONLY` warning. Motivated by foodXPlorer F-UX-B plan review where Codex found 3 M1 blockers (stale shared schema, wrong PK type, dangling enum refs) that a text-only review would miss.
- **review-spec / review-plan empirical verification checklist** — `review-spec.md` / `review-plan.md` (Claude) and `review-spec-instructions.md` / `review-plan-instructions.md` (Gemini), 4 files, now have an "EMPIRICAL review not text-only" instruction block inside the CRITERIA prompt that forces the reviewer model to grep/read the code before emitting findings. Each review must end with `### Files read during review` and `### Commands executed` subsections listing empirical evidence, or prepend a `⚠ TEXT-ONLY REVIEW` warning. Reviewers that skip empirical checks are explicitly flagged in consolidated output.
- **Meta-check on reviewer empirical asymmetry** — `review-spec.md` / `review-plan.md` (both tools) now include a shell block after Path A (both CLIs available) that detects when one reviewer produced 0 empirical markers while the other produced 2+, or 0 CRITICAL/IMPORTANT findings while the other produced 2+. When asymmetry is detected, the light reviewer is re-prompted with stricter empirical instructions and the findings are merged into the consolidation. Guards against the F-UX-B pattern where one reviewer (Codex) did empirical verification and found 3 M1 blockers while the other (Gemini) did text-only and found 0.
- **Cross-model review calibration reference** — new `.claude/skills/development-workflow/references/cross-model-review.md` and `.gemini` equivalent. Documents the empirical observation that Codex CLI tends to be agentic (runs shell commands, catches mechanical bugs) while Gemini CLI tends to be context-aware but text-only (reads standards, catches scope/consistency). Includes historical calibration data from the F-UX-B review. Both reviewers are complementary and needed.
- **Scenario 41: Gemini CLI functional smoke test** — `test/smoke.js` now scaffolds a fresh project and invokes `gemini --help` against it from the project root, asserting no `Invalid configuration` or `Error in: model` appears in stderr. Conditional: skipped with a note if `gemini` CLI is not installed locally. Catches future schema-format breaks at library test time instead of at downstream user time. This is the scenario that would have caught BUG-DEV-GEMINI-CONFIG months ago if it had existed.
- **Template drift risk audit** in `dev/testing-notes.md` — inventory of template files with format/schema drift risk (Claude settings hooks, GitHub Actions versions, Gemini TOML commands, SKILL.md frontmatter). Each entry has current state, drift risk level, and mitigation status. Also includes a reusable pattern section documenting the 7-step workflow for future schema-format fixes (audit → fix template → migration → doctor check → smoke tests → docs → cross-model review).

### Cross-model reviewed

Plan and patch reviewed by Codex CLI 0.115.0 and Gemini CLI 0.34.0 in parallel. Both verdicts: REJECT (initial draft). Consensus findings incorporated before merge:

- **Scenario 41 too weak** (both reviewers CRITICAL): initial draft only asserted absence of error strings, which false-passes if Gemini CLI is broken/unusable/segfaults. Rewritten with (a) positive success signal via known help tokens and length assertion, (b) differential test that explicitly injects the known-broken obsolete format and asserts Gemini rejects it. If either upstream Gemini stops loading config during `--help` or changes validation behavior, the differential fails loudly instead of silently passing.
- **Asymmetry meta-check grep was gameable** (both CRITICAL): initial draft counted lines containing section header names themselves, example text, or discussion — reviewers could score high by repeating template text. Replaced with an `awk` parser that only counts non-empty content lines under the mandatory `### Files read during review` and `### Commands executed` markdown headers, skipping the `(list…)` placeholder prose.
- **`grep -c || echo 0` pitfall** (Gemini): pattern produces `"0\n0"` when grep finds zero matches (grep exits 1, `|| echo 0` appends a second zero). Replaced with `awk` that returns a clean integer.
- **Placeholder shell was broken bash** (both): `<light_reviewer_cli>` and `"$REVIEW_DIR/<light>_reprompted.txt"` would execute literally — `<` is bash input redirect and would fail or redirect to a file named `light_reviewer_cli`. Replaced with concrete commented examples for both Claude and Codex reviewers, explicitly marked as documentation skeleton not cargo-cult-runnable.
- **Claude/Gemini review-command symmetry gap** (both): initial draft had full reprompt logic in `.claude/commands/review-plan.md` and `review-spec.md` but only mentioned the concept in the Gemini equivalents. Mirrored the full logic to `.gemini/commands/review-plan-instructions.md` and `review-spec-instructions.md`.
- **Findings count asymmetry conflated "nothing to find" with "did no work"** (Codex): triggering reprompt on 0 findings biases toward false positives — a clean plan legitimately produces zero M1/M2 findings. Restricted reprompt trigger to missing empirical evidence only.
- **Planner verification was gameable** (Codex): models could list bare commands without observed outcomes, or grep symbols without verifying the specific semantic claim. Required format now enforces `<command> → <observed fact> → <impact on plan>` with all three fields, with "bare command without observed fact is cargo-culting" in the explicit guidance.
- **LLM hallucination risk** (Gemini): models could fabricate commands and outputs to satisfy structural requirements. Added explicit "do NOT hallucinate — use your environment tools to actually execute these checks" constraint to all 4 planner agent files and all 4 review command files. Framed an empty section as preferable to a fake one, so models are incentivized to leave it empty when they haven't done the work.
- **Time-sensitive documentation rot** (Codex): `dev/testing-notes.md` had "current as of 2026-04-13" phrasing that rots quickly. Reworded to be generic ("pinned major versions will eventually be superseded") so the audit stays evergreen.

## [0.16.7] - 2026-04-13

### Fixed

- **`.gemini/settings.json` template uses obsolete `model` format** — the template had `"model": "gemini-2.5-pro"` (string), but Gemini CLI's settings schema (verified against v0.34.0) defines `model` as an object with a nested `name` property. Confirmed empirically via Gemini's own `settings-validation.test.js` ("should reject model.name as object instead of string"). Running `gemini` from inside any SDD-scaffolded project produced `Invalid configuration ... Error in: model — Expected object, received string`, causing Gemini CLI to fall back to defaults and ignore the project's `instructions` field. This degraded every cross-model review run from inside an SDD project — Gemini was reading from defaults instead of the project context. Discovered during foodXPlorer F-UX-B Spec v2 cross-model review, when the agent had to invoke `gemini` from `/tmp` as a workaround. Fix: template now uses `{ "name": "gemini-2.5-pro" }`.
- **`--upgrade` now migrates obsolete `.gemini/settings.json` model format** — previously the upgrade path overwrote user `.gemini/settings.json` with the template wholesale, clobbering any user-customized `temperature`, `instructions`, or extra keys. New behavior: preserves all user-provided keys (including unknown ones like `summarizeToolOutput` or custom `extraUserKey`) and only transforms the `model` field if it's in the obsolete string format (`"model": "gemini-2.5-pro"` → `"model": { "name": "gemini-2.5-pro" }`). User-customized model names (e.g. `gemini-2.5-flash`) are preserved during migration. Malformed shapes (`null`, array, primitive, object without `name`) are reset to the template default with no crash.

### Added

- **Doctor check #12: Gemini settings format** — validates `.gemini/settings.json` exists and has a parseable, non-obsolete `model` field. Returns FAIL on invalid JSON, obsolete string format, or malformed object shape (null, array, primitive). Returns WARN on missing file or `model` object without `name`. Does NOT enforce stricter rules than upstream Gemini (e.g., does not require `model` to be present, since Gemini's `settings-validation.js` treats top-level fields as optional). Brings doctor check count from 11 to 12.
- **Smoke tests for Gemini settings format and migration** — `testDefaults` now asserts the object format after scaffold; new `Scenario 39: testGeminiSettingsMigration` covers 8 migration sub-cases (default obsolete → object, custom name preservation, rich-object preservation with extra sub-keys, user-customized `temperature`/`instructions` preservation, malformed `null`/array recovery, extra user root keys preservation); `testDoctorProblems` extended to detect the obsolete string format; new `Scenario 40: testDoctorGeminiSettingsValid` ensures doctor doesn't false-fail on absent `model` or rich valid configs. Smoke total: 38 → 40.

### Cross-model reviewed

Plan reviewed by Codex CLI 0.115.0 and Gemini CLI 0.34.0 in parallel. Both verdicts: APPROVE WITH CHANGES. Critical findings incorporated: null/array crash fix in migration logic (consensus — `typeof null === 'object'` would have thrown `TypeError: Cannot read properties of null`), inverted migration strategy from "template-owned" to "user-owned, migrate model only" (consensus — earlier draft would clobber user customizations to `temperature`/`instructions`), test coverage expanded to 8 migration sub-cases (consensus — rich-object preservation was not asserted), doctor check narrowed to detectably-broken formats only (Codex — earlier draft was over-validating relative to Gemini's own settings-validation.js which treats top-level fields as optional), backward-compat language softened to "verified on 0.34.0" (Codex — earlier draft asserted "≥0.34 requires" without empirical proof).

## [0.16.6] - 2026-04-10

### Added

- **CI template: scaling tips comment** — `template/.github/workflows/ci.yml` now includes a documented pattern for the path-filter + required-checks deadlock. When users expand from a single CI job to multiple jobs with path filters, branch protection requiring those individual checks deadlocks docs-only PRs. Solution documented inline: add a `ci-success` rollup job with `needs: [...]` and `if: always()`, then require ONLY the rollup in branch protection. Found during foodXPlorer F115 cleanup where a docs-only PR couldn't merge after configuring branch protection.

### Fixed

- **PM Orchestrator: pm-session.md now updated during feature lifecycle** — previously only updated at start ("in-progress") and end ("done"), leaving stale state mid-feature. Now updates Notes column with current step, Recovery Instructions with branch and step after each transition. Found during first real PM session on foodXPlorer (F090 showed "pending" at step 5/6).
- **PM Orchestrator: progress output** — agent now prints `[PM] FXXX | Step N/6 | StepName` at each step transition and quality gate result, so the human can follow the autonomous loop.
- **PM Orchestrator: check existing patterns before architectural decisions** — new constraint requires the agent to search existing codebase, decisions.md, and key_facts.md before choosing new approaches. If uncertain, must ask the user or consult external AI models. If the approach depends on something that doesn't exist yet, must create a follow-up task in product-tracker.md. Found during F112 where the agent chose a new metrics approach without checking existing analytics infrastructure.
- **PM Orchestrator: `start pm` auto-archives previous sessions** — no longer asks the user to manually delete pm-session.md. Instead, `start pm` detects completed/stopped sessions and renames them to `pm-session-{session-id}.md` (e.g., `pm-session-pm-c3a.md`) before creating a new session. Archived files are kept as historical records.
- **PM Orchestrator: mandatory compact after 2 features** — changed from "suggest /compact after 3+" to "STOP and require /compact after 2". Added as pre-flight check and batch boundary rule. Context degradation at 14% caused the agent to ignore its own compact recommendation. Now it's a hard stop, not a suggestion.
- **PM Orchestrator: target branch baseline check** — new prerequisite (5) that runs `npm test`, `npm run lint`, and `npm run build` on the target branch BEFORE starting any feature. If the baseline is broken, document failures in bugs.md, create a follow-up task, and stop. Found during F094 where 20 pre-existing bot lint errors blocked Step 4 quality gates and the agent couldn't distinguish pre-existing failures from regressions.
- **PM Orchestrator: intra-batch dependency check** — new step in Phase 1 that detects when a feature in the batch depends on another feature in the same batch. Warns the user and defaults to removing the dependent feature. Found during F094+F091 batch where F091's spec depended on F094's voice architecture decision, but at L5 F091 would have started immediately after F094 without user validation of the architecture choice.

## [0.16.0] - 2026-04-08

### Added

- **PM Orchestrator skill (`pm-orchestrator`)** — 5th skill that enables autonomous sequential multi-feature development. Commands: `start pm` (batch classify + loop), `continue pm` (resume after /compact), `stop pm` (graceful halt), `pm status`. Includes rolling batch of 1-3 features, dynamic dependency resolution, and comprehensive session state in `pm-session.md`.
- **L5 Autonomy Level (PM Autonomous)** — all checkpoints auto-approve (like L4) plus automatic feature sequencing via the PM Orchestrator. Requires explicit `start pm` to activate the loop.
- **9 guardrails for PM mode** — max 5 features per session, circuit breaker (3 consecutive failures), kill switch (`pm-stop.md`), session lock (`pm-session.lock`), post-merge sanity check (`npm test` on target branch), rolling batch classification, clean workspace validation, quality gates always enforced, `/audit-merge` auto-execution.
- **Doctor check 11: Autonomy/Skills consistency** — warns if L5 is set but `pm-orchestrator` skill is missing (suggests `--upgrade`).
- **Available Skills section in AGENTS.md** — lists all 5 skills with invocation commands.
- **PM-aware compact hook** — `SessionStart` hook now detects `pm-session.lock` (active PM session) and injects PM-specific recovery context (`continue pm`) instead of the generic recovery message.

### Changed

- Checkpoint tables (SKILL.md, base-standards.mdc) now include L5 column + "Next Feature" row
- Complexity guide includes L5 combination row
- `--diff` output shows "5 skills" (was "4 skills")
- README updated with 5 autonomy levels (was 4)

### Cross-model reviewed

Plan reviewed by Gemini 2.5 Pro and GPT-5.4 (Codex CLI). Key feedback incorporated: rolling batch (Codex), reduced max features from 10→5 (Gemini), session lock (Codex), dynamic dependency resolution (Gemini).

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

[0.16.9]: https://github.com/pbojeda/sdd-devflow/compare/v0.16.8...v0.16.9
[0.16.8]: https://github.com/pbojeda/sdd-devflow/compare/v0.16.7...v0.16.8
[0.16.7]: https://github.com/pbojeda/sdd-devflow/compare/v0.16.6...v0.16.7
[0.16.6]: https://github.com/pbojeda/sdd-devflow/compare/v0.16.0...v0.16.6
[0.16.0]: https://github.com/pbojeda/sdd-devflow/compare/v0.15.0...v0.16.0
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
