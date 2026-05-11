# F-FIXTURE-B8-PASS: deferred ACs with accurate `AC: X/Y` claim

**Feature:** F-FIXTURE-B8-PASS | **Type:** Backend-Feature | **Priority:** Medium
**Status:** Ready for Merge | **Branch:** feature/F-FIXTURE-B8-PASS
**Created:** 2026-05-08 | **Dependencies:** None

## Spec

Fixture verifying the v0.18.3 B8 P6 fix on the **accurate-deferred-AC** form.
Ticket has 11 `[x]` ACs + 2 `[ ]` ACs = 13 total. MCE row 1 claims `AC: 11/13 done`
— accurate. v0.18.2 P6 recipe extracted the FIRST number (`11`) and compared
against ACTUAL = 13 → spurious P6 IMPORTANT flag. v0.18.3 distinguishes
`X = marked` and `Y = total`, compares `Y` to ACTUAL → no flag.

## Acceptance Criteria

- [x] AC1: implementation complete
- [x] AC2: unit tests added
- [x] AC3: integration tests added
- [x] AC4: edge cases covered
- [x] AC5: error handling
- [x] AC6: logging instrumented
- [x] AC7: docs updated
- [x] AC8: CHANGELOG entry
- [x] AC9: peer review approved
- [x] AC10: regression suite green
- [x] AC11: feature flag wired
- [ ] AC12: post-deploy QA battery — deferred to release verification
- [ ] AC13: prod telemetry confirmation — deferred to release verification

## Definition of Done

- [x] All non-deferred AC met
- [x] Tests green

## Workflow Checklist

- [x] Step 0: spec
- [x] Step 5: review

## Completion Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-05-08 | Step 0 spec | drafted |
| 2026-05-08 | Step 5 review | OK; 2 ACs deferred per design |

## Merge Checklist Evidence

| Action | Done | Evidence |
|--------|:----:|----------|
| 0. Validate ticket structure | [x] | sections present |
| 1. Mark all items | [x] | AC: 11/13 done (2 deferred to release verification per spec), DoD 2/2 |
| 2. Verify product tracker | [x] | tracker synced |
| 3. Update key_facts.md | [x] | N/A |
| 4. Update decisions.md | [x] | N/A |
| 5. Commit documentation | [x] | commit abcd123 |
| 6. Verify clean working tree | [x] | clean |
| 7. Verify branch up to date | [x] | up to date |
