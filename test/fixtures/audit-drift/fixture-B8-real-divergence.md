# F-FIXTURE-B8-FAIL: real divergence — claim total wrong by 3

**Feature:** F-FIXTURE-B8-FAIL | **Type:** Backend-Feature | **Priority:** Medium
**Status:** Ready for Merge | **Branch:** feature/F-FIXTURE-B8-FAIL
**Created:** 2026-05-08 | **Dependencies:** None

## Spec

Fixture verifying the v0.18.3 B8 P6 fix DOES still flag real divergence.
Ticket has 14 ACs total (12 `[x]` + 2 `[ ]`) but MCE row 1 claims `AC: 12/17 done`.
The total claim (`17`) diverges from actual total (`14`) by 3 → P6 MUST flag.
The marked claim (`12`) matches actual marked count → no second flag on marked.

## Acceptance Criteria

- [x] AC1
- [x] AC2
- [x] AC3
- [x] AC4
- [x] AC5
- [x] AC6
- [x] AC7
- [x] AC8
- [x] AC9
- [x] AC10
- [x] AC11
- [x] AC12
- [ ] AC13
- [ ] AC14

## Definition of Done

- [x] Implementation complete

## Workflow Checklist

- [x] Step 0: spec
- [x] Step 5: review

## Completion Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-05-08 | Step 0 spec | drafted |

## Merge Checklist Evidence

| Action | Done | Evidence |
|--------|:----:|----------|
| 0. Validate ticket structure | [x] | sections present |
| 1. Mark all items | [x] | AC: 12/17 done, DoD 1/1 — wrong total (real is 14) |
| 2. Verify product tracker | [x] | tracker synced |
| 3. Update key_facts.md | [x] | N/A |
| 4. Update decisions.md | [x] | N/A |
| 5. Commit documentation | [x] | commit abcd123 |
| 6. Verify clean working tree | [x] | clean |
| 7. Verify branch up to date | [x] | up to date |
