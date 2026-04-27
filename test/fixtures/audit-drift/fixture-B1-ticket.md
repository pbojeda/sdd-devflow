# F-FIXTURE-B1: PR body uses `**Tests**:` format, ticket terminal differs

**Feature:** F-FIXTURE-B1 | **Type:** Backend-Feature | **Priority:** Medium
**Status:** Ready for Merge | **Branch:** feature/F-FIXTURE-B1
**Created:** 2026-04-28 | **Dependencies:** None

## Spec

Fixture ticket designed to verify the v0.18.1 P1 regex fix (B1).
PR body claims `**Tests**: 4094/4094` (no "pass"/"green"/"npm test").
Ticket terminal Completion Log says `4133/4133`.
Drift: 4094 ≠ 4133. v0.18.0 regex misses; v0.18.1 fixed regex catches.

## Acceptance Criteria

- [x] AC1: ticket has terminal test-count claim using "npm test" keyword
- [x] AC2: PR body uses `**Tests**:` format with no pass/green keywords

## Definition of Done

- [x] All AC met

## Workflow Checklist

- [x] Step 0: spec
- [x] Step 5: review
- [ ] Step 6: post-merge

## Completion Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-04-28 | Step 0 spec | fixture scope drafted |
| 2026-04-28 | Step 5 review | npm test 4133/4133 GREEN final |

## Merge Checklist Evidence

| Action | Done | Evidence |
|--------|:----:|----------|
| 0. Validate ticket structure | [x] | sections present |
| 1. Mark all items | [x] | AC 2/2 |
| 2. Verify product tracker | [x] | tracker synced at abcdef |
| 3. Update key_facts.md | [x] | N/A |
| 4. Update decisions.md | [x] | N/A |
| 5. Commit documentation | [x] | commit abcdef |
| 6. Verify clean working tree | [x] | clean at abcdef |
| 7. Verify branch up to date | [x] | ancestor of origin/develop at abcdef |
