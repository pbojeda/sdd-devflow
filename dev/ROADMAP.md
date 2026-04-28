# SDD DevFlow — Internal Roadmap

> Internal development tracking. Not published to npm (`files` in package.json excludes this directory).

## Current Version: 0.18.1

### v0.18.1 (2026-04-28) — Drift recipe hardening + smart-diff commands extension

Empirical follow-up to v0.18.0 — re-execution of shipped `/audit-merge` literal bash recipes against fx F-H9 + F-H10 post-merge audits surfaced 5 silent-PASS bugs that caused the agent's `/audit-merge` self-audit to report "drift CLEAN" while real drift existed.

- **5 recipe fixes** (B1–B5): P1 regex broaden for `**Tests**:` form, P2 awk flag-based extraction for MCE-as-last-section, P4 inline branch grep, P8 Action-column anchor, P9 tracker format flexibility.
- **1 sed harden** (B6): P5/P11 Status extraction handles `**Status:** **Done**` bold-in-bold markup (previously caused 30+ noisy false positives in fx).
- **1 execution guardrail** (B7): soft directive requiring agents to include literal command output as evidence for any PASS verdict — bare PASS = NOT EXECUTED.
- **Smart-diff extension to `commands/`**: 5 Claude `.md` + 10 Gemini twins (5 `.toml` + 5 `-instructions.md`) now hash-tracked. Closes v0.18.0 known limitation. Hash count for fullstack-both: 31 → 46.
- **7 new test fixtures + 7 new smoke scenarios** (#93-99). Each scenario asserts the fix detects the bug case AND the v0.18.0 buggy regex would NOT have detected it. Smoke total: 92 → 99.

#### Mirror parity

Every shell-recipe edit applied byte-equal to both `template/.claude/commands/audit-merge.md` and `template/.gemini/commands/audit-merge-instructions.md`.

#### Validation

- All 99 smoke scenarios green.
- After upgrading fx from v0.18.0 → v0.18.1 and re-running `/audit-merge` on F-H9: P2 IMPORTANT × 1 (row "(will update to 6/6 post-merge)") and on F-H10: P2 IMPORTANT × 1 (row "Will sync...") + P8 IMPORTANT × 2 (Step 1 + Step 3 missing dedicated Action-column rows) — drift previously silent-PASS now correctly surfaced.



### Known follow-ups (v0.18.x candidates)

**1. Full smart-diff coverage for remaining template files** (deferred from v0.17.1; did not land in v0.17.2 hotfix, v0.17.3, or v0.18.0). **Commands sub-bullet RESOLVED in v0.18.1** (5 Claude .md + 10 Gemini .toml/-instructions.md added to `expectedSmartDiffTrackedPaths`, hash count 31 → 46 for fullstack-both projects).

   - **Additional skill files** (still pending): `bug-workflow/SKILL.md`, `health-check/SKILL.md`, `pm-orchestrator/SKILL.md`, `project-memory/SKILL.md` + their template references (`pm-session-template.md`, `bugs_template.md`, `decisions_template.md`, `key_facts_template.md`)
   - **development-workflow/references/** (still pending): `pr-template.md` (highest-risk customization — teams have company-specific PR templates), `branching-strategy.md`, `failure-handling.md`, `workflow-example.md`, `complexity-guide.md`, `add-feature-template.md`, `cross-model-review.md`
   - **Commands** ✅ shipped v0.18.1: `template/.claude/commands/{audit-merge,review-spec,review-plan,review-project,context-prompt}.md` + Gemini `*-instructions.md` + `*.toml` counterparts now hash-tracked. User customizations of these files survive future upgrades via the standard smart-diff decision tree.
   - **Design refinement**: data-driven enumeration — `expectedSmartDiffTrackedPaths` returns ALL template-provided files. No per-file adaptation logic for the new batch (they're static templates). Fallback compare uses `normalizeForCompare` directly.

**2. Scanner extensions** (deferred from v0.17.1).

   - `pnpm-workspace.yaml` parsing support
   - `**` recursive glob patterns in `workspaces` declarations
   - `!exclude` negation

**3. Test hardening** (Codex v0.17.1 round-3 findings 2 + 3).

   - Scenario 61 dedicated raw-template branch assertion
   - Scenario 63c frozen snapshot for byte-exact single-package invariant check

**4. Template drift gaps** (canonical source: `dev/testing-notes.md` "Known gaps" section — consolidated here for visibility).

   - No functional smoke test for `template/.claude/settings.json` hooks (JSON parses, but hook execution untested)
   - No version staleness check for `template/.github/workflows/ci.yml` pinned action majors
   - No YAML schema validation for Claude `SKILL.md` frontmatter (required fields `name`, `description`)

**5. Mixed-language monorepos** (deferred from v0.17.3 design).

   - `scan.language` is a single field promoted from primary backend workspace. In rare TS-backend + JS-frontend (or inverse) monorepos, `adaptFrontendStandards` may show the wrong Language line. Concrete failure cases unobserved; flagged for awareness. See `dev/v0.17.3-plan.md` Open Questions.

**6. Doctor check #14 tightening** (flagged in v0.17.3 round-2 review).

   - Currently WARNs only when `Frontend patterns` has exactly 1 entry. Could tighten to WARN when fewer than 3 entries (still likely incomplete detection). v0.17.3 closes the fx 1-entry case (now `(Next.js, Tailwind CSS)`); future projects with components/state libs may still fall short of 3 entries.

**7. Drift-detection refinements** (flagged in v0.18.0 empirical validation).

   - P5 merge-detection currently uses `git log --all --grep=<ticket_id>` which is heuristic (a ticket could be mentioned in a non-merge commit). Tighten to `git log --merges --first-parent main develop --grep=<ticket_id>` for higher precision. Deferred to v0.18.x.
   - P8 Step 5 split (code-review + qa-engineer) currently aggregates to a single step number check. Finer check that both sub-entries are individually logged is deferred to v0.18.x.
   - Drift checks detection recipes assume English keywords (`will`, `to be`, `post-merge`). Spanish-only tickets wouldn't trigger. User base is bilingual (English ticket template, Spanish Active Session) — no known project affected yet. Deferred pending user report.

**8. Drift recipe edge cases (B8 + B9)** — surfaced during 2026-04-28 external audit of fx F-H10-FU. Both pre-existing in v0.18.0, NOT introduced by v0.18.1. Defer to v0.18.2 if/when ≥1 additional finding accumulates from real fx usage; otherwise leave as-is.

   - **B8 — P6 false positive on tickets with deferred ACs**. Recipe `grep -oE 'all [0-9]+ marked|AC: [0-9]+/[0-9]+' | head -1 | grep -oE "[0-9]+" | head -1` extracts the FIRST number from `AC: X/Y` form (the marked count X), then compares against `ACTUAL` = total checkbox count. For tickets with intentionally-deferred ACs (e.g. F-H10-FU: 11 [x] + 2 [ ] = 13 total, MCE row 1 claims "AC: 11/13 done"), CLAIMED=11 vs ACTUAL=13 produces a spurious divergence flag. Real claim is accurate (11 done out of 13). Fix: when "AC: X/Y" form matches, compare X against marked count AND Y against total. Or extract the larger of the two numbers (Y is always ≥ X by definition). Also requires audit-merge.md template line 107-108 fix + JS detector mirror in test/smoke.js.
   - **B9 — P5 sed doesn't handle parenthetical post-Done in Status field**. Tickets with Status like `**Status:** Done (code merged YYYY-MM-DD; prod DB migration executed YYYY-MM-DD)` produce `status="Done (code merged..."` after the v0.18.1 B6 sed harden. Subsequent test `[ "$status" = "Done" ]` fails → ticket counted as frozen. fx empirical: BUG-PROD-009 + F114 + F-UX-B + BUG-PROD-008-FU1 (~10 tickets) hit this case, contributing noise to the SYSTEMIC frozen count (52 in F-H10-FU audit). Fix: tighten the second sed to also strip the parenthetical: `sed -E 's/[[:space:]]+\(.*\)//'` before the `|.*` strip. Or use `awk` to take only the first whitespace-separated token of the status field. Pre-existing in v0.18.0; v0.18.1 B6 fix only addressed bold-in-bold, not parenthetical-after.

### v0.18.0 (2026-04-23) — Drift-detection in /audit-merge + /audit-feature

Addresses 10 empirical drift patterns surfaced during 5 consecutive audits of foodXPlorer pm-sprint2 PRs. Adds 11 advisory checks (patterns P1-P11) to the shipped `/audit-merge` skill + the local `/audit-feature` skill.

**The gap**: across pm-sprint2 (PRs #197, #201, #202, #205, #206), drift appeared in ≥2/5 of the following shapes: PR body test count stale (4/5), Merge Checklist Evidence rows in future tense while marked `[x]` (3/5), post-merge actions not logged post-close (2/5), Completion Log gap vs Workflow Checklist (2/5), plus 1/5 occurrences of remote branch orphan, frozen ticket Status, AC off-by-N, intra-ticket test drift, tracker header stale, duplicate log rows, tracker status mismatch. Pre-0.18.0 `/audit-merge` verdict `11/11 PASS` on all five of these PRs — all drift was caught only by external `/audit-feature` audits.

**The fix**: 11 new checks (12-22) in `/audit-merge` with BSD-grep-compatible shell recipes. Dual verdict structure (STRUCTURAL blocking + DRIFT advisory) prevents semantic collision.

**Cross-model review trail**: 1 round (Gemini + Codex in parallel). Gemini: 3 CRITICAL + 2 IMPORTANT + 1 SUGGESTION. Codex: 0 CRITICAL + 6 IMPORTANT + 2 SUGGESTION. All 3 Gemini CRITICALs (PCRE `\K` on BSD, `for-in` whitespace split, line-number prefix impossibility) + all Codex IMPORTANTs addressed in plan v1.1 before implementation. Full trail: `dev/v0.18.0-audit-enhancements-plan.md`.

**Smoke tests**: 85 → 92 (+7): 86-87 static-string assertions for template integrity, 88-92 fixture-based behavioral tests for P1/P3/P5/P7/P8 detection correctness.

**Known limitation**: `audit-merge.md` not in smart-diff provenance — users with customized `audit-merge.md` get overwritten on upgrade. See v0.18.x follow-up #1. Status quo vs pre-0.18.0 (no regression).

### v0.17.3 (2026-04-16) — Workspace-aware auxiliary detection

Closes the v0.17.3 candidate work flagged during v0.17.2 empirical validation. Delivers workspace-awareness to the four detection paths that v0.17.1/v0.17.2 left root-only.

**The bug**: v0.17.1/v0.17.2 made `detectBackend` / `detectFrontend` framework detection workspace-aware via `enumerateWorkspaces`, but four auxiliary detection functions still ran only against the project root: `detectLanguage`, `detectArchitecture`, `detectTests`, and `detectFrontend`'s auxiliary fields (styling/components/state). For monorepos with hoisted root deps (e.g., fx root has `"next": "^14.2.29"` so `detectFrontend(root)` succeeds → v0.17.2's `!framework` enumeration gate never fired → `frontend.workspaceSource` stayed null → standards files showed degraded content).

**The fix** (`lib/scanner.js`): single-pass enumeration that always runs in monorepos and establishes `primaryBackendWs` / `primaryFrontendWs` independently of v0.17.2's framework promotion. Aux detection runs against those primaries with per-field merge semantics (D2 architecture truthiness OR-merge for booleans, D3 per-field test merge preserving root E2E config when promoting workspace unit framework, D5 single-pass loop preserving v0.17.2 promotion semantics byte-equivalent).

**API additions**:
- `scan.backendTests` / `scan.frontendTests` — per-side test detection (single-package: reference-equal to `scan.tests`).
- `scan.backend.primaryWorkspace` / `scan.frontend.primaryWorkspace` — diagnostic fields, set whenever a workspace was used for aux detection (different semantics from `workspaceSource` which only fires when v0.17.2 promoted framework from workspace).

**Cross-model review trail**: 3 rounds (Codex + Gemini in parallel each time):
- Round 1 (plan v1.0): Codex REJECT 1C+4I, Gemini REJECT 2C+4I. Both convergent on CRITICAL: `workspaceSource` gate too narrow. Plan v1.1 introduces D5.
- Round 2 (plan v1.1): Codex REJECT 3I (all round-1 RESOLVED), Gemini REJECT 1C+1I (all round-1 RESOLVED). Plan v1.2: dead-code count fix, F001 broaden, primaryWorkspace exported.
- Round 3 (impl diff): Codex APPROVE WITH CHANGES 1M+1L, Gemini REJECT 1C+1I+2L. CRITICAL: F001 tracker insertion not migrated to broadened gate. All addressed inline.

**Smoke tests**: 73 → **85** (+12). Notable guards:
- 76b — fx empirical fix (hoisted-framework root, primary frontend ws still discovered)
- 78 — per-field merge preserves root @playwright/test e2eFramework when workspace promotes vitest
- 80, 81 — workspace e2e promotion + override semantics
- 82 — pattern non-demotion (workspace 'unknown' never demotes known root pattern)

**Empirical fx validation** (post-publish target):
- ✅ `Runtime: TypeScript`, `Testing: Vitest`, `Styling: Tailwind CSS`, `Frontend patterns (Next.js, Tailwind CSS)`
- ⚠️ `Architecture: Custom` unchanged (fx genuinely doesn't match a known pattern — the original ROADMAP claim of "DDD layered" was empirically incorrect)

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
- **Scope limitations**: no pnpm-workspace.yaml, no `**` recursive patterns, no `!exclude` negation — deferred (now tracked under Known follow-ups item 3; did not land in the v0.17.2 scanner hotfix).

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
