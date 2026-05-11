# F-FIXTURE-C1-MULTI: monorepo with multiple workspace test ratios

**Feature:** F-FIXTURE-C1-MULTI | **Type:** Backend-Feature | **Priority:** Medium
**Status:** Ready for Merge | **Branch:** feature/F-FIXTURE-C1-MULTI
**Created:** 2026-05-08 | **Dependencies:** None

## Spec

Fixture verifying the v0.18.3 C1 P1 multi-workspace enhancement. Ticket
contains test ratios from several workspaces (api 4272/4272, web 487/487,
bot 738/3, scraper 1221/1221).

## Acceptance Criteria

- [x] AC1: all workspaces green

## Definition of Done

- [x] All AC met

## Workflow Checklist

- [x] Step 0: spec
- [x] Step 5: review

## Completion Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-05-08 | api npm test: 4272/4272 pass | green |
| 2026-05-08 | web npm test: 487/487 pass | green |
| 2026-05-08 | bot npm test: 738/3 pass | green |
| 2026-05-08 | scraper npm test: 1221/1221 pass | green |

## Merge Checklist Evidence

| Action | Done | Evidence |
|--------|:----:|----------|
| 0. Validate ticket structure | [x] | sections present |
| 1. Mark all items | [x] | AC 1/1 |
| 2. Verify product tracker | [x] | tracker synced |
| 3. Update key_facts.md | [x] | N/A |
| 4. Update decisions.md | [x] | N/A |
| 5. Commit documentation | [x] | commit c1abcd1 |
| 6. Verify clean working tree | [x] | clean |
| 7. Verify branch up to date | [x] | up to date |
