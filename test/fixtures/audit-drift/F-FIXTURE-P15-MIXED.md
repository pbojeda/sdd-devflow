# F-FIXTURE-P15-MIXED: real-world mixed-case AC-ID (e.g. `AC-NEW-qa-battery`)

**Feature:** F-FIXTURE-P15-MIXED | **Type:** Backend-Feature | **Priority:** High
**Status:** Ready for Merge | **Branch:** feature/F-FIXTURE-P15-MIXED
**Created:** 2026-05-08 | **Dependencies:** None

## Spec

Empirical regression case from fx F-CATALOG-COV-001 (2026-05-08 audit). Real AC-ID
mixes uppercase + lowercase: `AC-NEW-qa-battery`. v0.18.3 must extract the full
ID (not truncate to `AC-NEW-`) and use it for the Completion Log anchor lookup.

## Acceptance Criteria

- [x] AC1: implementation merged
- [x] AC-NEW-qa-battery: production parity gate — verify on dev API post-deploy

## Definition of Done

- [x] All AC met

## Workflow Checklist

- [x] Step 0: spec
- [x] Step 5: review

## Completion Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-05-07 | Step 5 review | OK |
| 2026-05-07 | AC1 verified | unit + integration green |

## Merge Checklist Evidence

| Action | Done | Evidence |
|--------|:----:|----------|
| 0. Validate ticket structure | [x] | sections present |
| 1. Mark all items | [x] | AC: 2/2 |
| 2. Verify product tracker | [x] | tracker synced |
| 3. Update key_facts.md | [x] | N/A |
| 4. Update decisions.md | [x] | N/A |
| 5. Commit documentation | [x] | commit mixed12 |
| 6. Verify clean working tree | [x] | clean |
| 7. Verify branch up to date | [x] | up to date |
