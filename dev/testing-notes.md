# Testing Notes

> Findings from real-world testing of SDD DevFlow.

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
