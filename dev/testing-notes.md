# Testing Notes

> Findings from real-world testing of SDD DevFlow.

## Template drift risk audit (v0.16.8, 2026-04-13)

Audit of template files that have schemas or formats that could drift silently as upstream tools evolve. Motivated by the BUG-DEV-GEMINI-CONFIG finding (obsolete model format) which was silent for months because no test caught it.

Audit criteria: a file is a **drift risk** if its format is defined by an external tool (Claude Code, Gemini CLI, GitHub Actions, etc.) that may evolve its schema. Static files (markdown, gitignore, human-facing docs) are low-risk.

### Drift risk inventory

| File | Format owner | Current state | Drift risk | Mitigation |
|---|---|---|---|---|
| `template/.gemini/settings.json` | Gemini CLI | **Fixed v0.16.7** (`model` is object) | Low (now covered by doctor check #12 + Scenario 39 migration tests + Scenario 41 functional test) | Already mitigated |
| `template/.claude/settings.json` | Claude Code | `hooks` with `SubagentStop` / `SessionStart` / `Notification` matchers | **Medium**: if Claude Code changes hook types, matcher syntax, or env var names (`CLAUDE_PROJECT_DIR`), the template will silently stop working | Doctor check #9 (`checkHooksAndDeps`) validates JSON parse + presence of `hooks` key, but NOT matcher types or hook semantics. Consider: schema validation against Claude Code's settings-validation docs if they become available |
| `template/.github/workflows/ci.yml` | GitHub Actions | Uses pinned major versions of `actions/checkout` and `actions/setup-node` | **Medium**: action major versions become stale as upstream releases new majors | No smoke test. Manual check at publish time. Consider: a scenario that parses ci.yml and warns when actions lag behind the latest published major version |
| `template/.gemini/commands/*.toml` | Gemini CLI commands | TOML with required `prompt: string` + optional `description: string` (mirrors `FileCommandLoader` Zod schema) | **Mitigated (v0.16.9)**: doctor check #13 (`checkGeminiCommands`) parses every `.gemini/commands/*.toml` with a narrow regex helper and validates schema conformance. Scenario 42 covers 7 sub-cases (valid template, missing `prompt`, non-string `prompt`, non-string `description`, empty file, triple-quoted multiline, single-quoted literal) | Already mitigated in v0.16.9 |
| `template/.claude/skills/*/SKILL.md` | Claude Code skills | Markdown with YAML frontmatter (`name`, `description`, etc.) | **Low-Medium**: Claude skill format could add required frontmatter fields. Scenarios 34-36 assert file existence but not frontmatter validity | Consider: YAML parse + required-field check in a dedicated scenario |
| `template/.gemini/skills/*/SKILL.md` | Gemini CLI skills | Plain markdown (no frontmatter) | **Low** — pure content | Covered by Scenarios 34-36 via `assertFileContains` on key sections |
| `template/CLAUDE.md` / `template/GEMINI.md` | Human-facing configs | Markdown with Autonomy Level marker | **Low** — tool-agnostic | Covered by Scenarios 1, 33 (autonomy level string match) |
| `template/gitignore` | Git | Static patterns | **Very low** | Covered by Scenario 1 |
| `template/package.json` | npm | Template has no direct deps (generated per-project) | **Very low** | N/A |

### Known gaps (not fixed in v0.16.8, tracked for future)

1. **No functional test for Claude Code settings hooks**: Scenario 18 (`testDoctorHealthy`) checks JSON validity but not hook execution. A hook syntax change upstream would pass the doctor check but fail at Claude Code runtime. Fix idea: spawn a `.claude/hooks/quick-scan.sh` in test and assert it exits cleanly under `CLAUDE_PROJECT_DIR`.

2. **No version staleness check for GitHub Actions**: template pins action majors that will eventually be superseded. No smoke test catches this. Fix idea: a scenario that parses `ci.yml` and warns (not fails) if any `uses: action@vN` lags behind the latest published major version — requires network access, so conditional like Scenario 41.

3. ~~**No functional test for Gemini TOML commands**~~ **Mitigated in v0.16.9** via doctor check #13 and Scenario 42. Empirical research established that Gemini CLI does NOT emit TOML command loading errors to stdout/stderr (only via `coreEvents.emitFeedback` to the interactive UI), so a functional smoke test like Scenario 41 cannot detect schema drift here. Instead, the doctor check mirrors Gemini's Zod schema (`prompt: z.string(), description: z.string().optional()`) using a narrow hand-rolled TOML parser that handles the two string constructs our templates use (standard quoted, single-quoted literal, triple-quoted multiline). See Scenario 42 for the 7 sub-case coverage.

4. **No schema validation for Claude SKILL.md frontmatter**: YAML frontmatter could have required fields added. Fix idea: a scenario that YAML-parses each SKILL.md and asserts required fields (`name`, `description`) are present.

### Reusable pattern for future drift fixes

When a template drift is discovered (upstream tool changes schema, existing template is silently obsolete):

1. **Audit the template file** to confirm the upstream-expected format (read schema files in `node_modules`, run `<tool> --help`, or check upstream docs)
2. **Fix the template** with the new format
3. **Write a migration function** in `lib/upgrade-generator.js` that detects the obsolete format in existing projects and converts it, preserving any user customizations (inverted merge strategy: start from `{ ...userSettings }`, only transform the broken field)
4. **Add a doctor check** that flags the obsolete format with a hint to run `--upgrade`
5. **Write smoke tests** covering: scaffolded format (assert correct shape), migration (8+ sub-cases including default, custom name preservation, rich object, user extra keys, malformed null/array recovery), doctor detection (assert FAIL on obsolete), doctor no-false-fail (assert PASS on valid edge cases), functional smoke test (invoke the upstream tool against a scaffolded project)
6. **Document** in CHANGELOG + dev/testing-notes.md + bugs.md (if discovered via a downstream incident)
7. **Cross-model review** the plan with Codex + Gemini CLI in parallel before implementing — both tend to catch different classes of issues (Codex: mechanical bugs, null/array crashes, UUID vs int mismatches; Gemini: semantic issues, scope, standards compliance)

This pattern is now embodied in v0.16.7 (Gemini settings fix) and v0.16.8 (meta improvements to prevent the same class of silent failures).

## Test: Gemini settings format migration (v0.16.7)

**Date**: 2026-04-13
**Discovered in**: foodXPlorer F-UX-B Spec v2 cross-model review
**Failure mode**: Gemini CLI 0.34.0 rejects the legacy `"model": "gemini-2.5-pro"` (string) format with `Invalid configuration ... Error in: model — Expected object, received string`. The string format had been in the template since the initial Gemini config commit (2026-02-23), affecting every project scaffolded with sdd-devflow that includes the Gemini setup.

**Test pattern (reusable for future schema-format migrations)**:

The new `Scenario 39: testGeminiSettingsMigration` introduces a reusable helper for testing field-level migration logic on `--upgrade`:

```javascript
function migrate(name, userSettings) {
  // 1. Scaffold a fresh project
  // 2. Overwrite the target settings file with the user's "before" state
  // 3. Run --upgrade
  // 4. Return the resulting parsed settings
}
```

It then runs 8 sub-cases against the same helper:
- Default obsolete → migrated
- Custom obsolete name → migrated preserving custom name
- Already-object → unchanged
- Rich object with extra sub-keys → all keys preserved
- User customized other top-level keys → preserved (NOT clobbered)
- Malformed `null` → reset to template default, no crash
- Malformed array → reset to template default, no crash
- Extra root keys → preserved

This pattern is the recommended template for future schema-format fixes (whether for Gemini, Claude, or other config files): test each migration path against the same helper, with assertions that distinguish "migrated correctly" from "preserved untouched".

**Empirical verification before merge**: Functional test against Gemini CLI 0.34.0 inside both a fixed and a broken project — broken project produces the validation error, fixed project does not.

**Cross-model review caught**:
1. `typeof null === 'object'` → migration logic would have crashed on `null` model (both reviewers)
2. Migration was too destructive — earlier draft would clobber user `temperature`/`instructions` (both reviewers)
3. Test coverage was missing rich-object preservation assertions (both reviewers)
4. Doctor check was over-validating relative to upstream Gemini (Codex)
5. Backward-compat language was overstated as "≥0.34 requires" without empirical proof (Codex)

## Test: --init on i04_cgm

**Project**: `/Users/pb/Developer/1_Desarrollo/node/i04_cgm`
**Date**: 2026-02-25
**Expected stack**: Express + Mongoose + MongoDB

### Scanner Results

Dry-run scanner output:
- **Project**: i04_cgm (Insulclock CGM Microservice)
- **Language**: TypeScript ✅
- **Backend**: Express + Mongoose + MongoDB ✅
- **Port**: 8104 ✅
- **Frontend**: Not detected ✅
- **Architecture**: `layered` (controllers + handlers + managers + routes)
- **Tests**: Jest, 1 test file, coverage "low" ✅
- **Git branch**: `IFL-4-integracion-i-se-ns`
- **Monorepo**: No ✅

**Architecture detail**: Real flow is routes → handlers → controllers → managers. Routes also have middleware. Scanner correctly classifies as "layered".

### Issues Found

| # | Issue | Severity | Status | Fix |
|---|-------|----------|--------|-----|
| 1 | Wizard showed "Architecture: Unknown" for `layered` pattern | High | Fixed | Added `layered` to `patternLabels` in init-wizard.js |
| 2 | Autonomy level desc shows "(default)" on both L1 and L2 | Medium | Fixed | Removed "(default)" from L2 desc text in config.js (askChoice adds it dynamically) |
| 3 | `backend-standards.mdc` prescribes Zod but project doesn't use Zod | Medium | Fixed (v0.4.0) | `adaptBackendStandards()` replaces Technology Stack + Validation sections based on scan |
| 4 | File globs in backend-standards include `.tsx/.jsx` for backend-only project | Low | Fixed (v0.4.0) | `adaptBackendStandards()` filters globs: `ts,js` only when no frontend detected |
| 5 | AGENTS.md references `frontend-standards.mdc` in backend-only project | Low | Fixed (v0.4.2) | `adaptAgentsMd()` + `removeFrontendFiles()`/`removeBackendFiles()` clean Standards References |
| 6 | `backend-standards.mdc` has empty TODO for Mongoose/MongoDB patterns | Medium | Fixed (v0.4.0) | `adaptBackendStandards()` pre-generates Mongoose best practices + schema pattern |

### Generated Files Review

**Overall**: Good quality. Stack detection accurate, architecture adapted correctly.

**key_facts.md**: ✅ Stack correct, port correct, business context captured, architecture flow documented. Infrastructure/URLs sections are placeholders (expected — filled manually).

**backend-standards.mdc**: ✅ Architecture section shows "Layered" with actual directories. ⚠ Prescribes Zod (not installed). ⚠ Database patterns section is empty TODO for Mongoose. ⚠ Globs include .tsx/.jsx unnecessarily.

**AGENTS.md**: ✅ Project structure matches real filesystem. ⚠ References frontend-standards.mdc (irrelevant for backend-only).

**CLAUDE.md**: ✅ Autonomy L1 set correctly. Clean.

**product-tracker.md**: ✅ Feature table with F001 (Retrofit). Type correctly set to backend. Active Session section present for context recovery.

### Real-World Feature Test

**Feature to test**: Integration with external API (new feature for i04_cgm)
**Plan**: Use full SDD workflow (spec → ticket → plan → implement → review) to develop this feature after --init completes.

### Project Context (for future reference)

- **ic-framework-back**: External shared library with data models, utilities, common functionality. Installed as npm dependency.
- **i00_api** (api-gateway at `/Users/pb/Developer/1_Desarrollo/node/i00_api`):
  - 303 routes total across all microservices, ~100 with @openapi annotations (~33%)
  - `microservices/i04-cgm/i04-cgm.routes.ts` has some Swagger annotations
  - Uses `swagger-jsdoc` to generate OpenAPI 3.0
  - Routes are proxies to backend microservices
- **i04_cgm API surface**:
  - 13 endpoints (7 Dexcom, 6+ FSL)
  - 2 route files: `dexcom.routes.ts`, `fsl.routes.ts`
  - 2 handler files: `dexcom.handler.ts`, `fsl.handler.ts`
  - No Swagger annotations in i04 itself
  - Consistent patterns: destructuring req.query/req.body + manual validation
  - Auth: JWT via `authenticationRequiredMiddleware(role?)`, roles: "user", "admin"
  - Base URL: `/api/v1/`
- **API spec generation approach**: Generate from i04_cgm code directly (routes + handlers) as first feature using spec-creator agent. Enrich with i00_api annotations as reference.

---

## Test: New Project Creation

**Date**: pending

### Wizard Flow

_pending_

### Generated Project Review

_pending_

### Feature Workflow Test

_pending_
