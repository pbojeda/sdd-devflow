# Testing Notes

> Findings from real-world testing of SDD DevFlow.

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
| 3 | `backend-standards.mdc` prescribes Zod but project doesn't use Zod | Medium | Pending | Generator should adapt validation section based on detected deps |
| 4 | File globs in backend-standards include `.tsx/.jsx` for backend-only project | Low | Pending | Generator should filter globs when no frontend detected |
| 5 | AGENTS.md references `frontend-standards.mdc` in backend-only project | Low | Pending | Generator should omit frontend refs when no frontend |
| 6 | `backend-standards.mdc` has empty TODO for Mongoose/MongoDB patterns | Medium | Pending | Could pre-generate ORM-specific patterns section |

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
