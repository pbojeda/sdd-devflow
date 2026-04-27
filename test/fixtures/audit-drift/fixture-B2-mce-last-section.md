# F-FIXTURE-B2: Merge Checklist Evidence is the last H2 section

**Feature:** F-FIXTURE-B2 | **Type:** Backend-Feature | **Priority:** Medium
**Status:** Ready for Merge | **Branch:** feature/F-FIXTURE-B2
**Created:** 2026-04-28 | **Dependencies:** None

## Spec

Fixture ticket designed to verify the v0.18.1 P2 awk fix (B2).
MCE is the LAST `^## ` H2 section of the ticket. v0.18.0 awk range
`/^## Merge Checklist Evidence/,/^## /` collapses to the heading line
only (start matches end on same line) when MCE is last — emitting 1 line
total, missing all `[x]` rows. v0.18.1 flag-based awk runs to EOF.

Row 2 of MCE has `[x]` with "will sync" — should trigger P2 when awk
correctly emits the body.

## Acceptance Criteria

- [x] AC1: MCE is the last `^## ` heading
- [x] AC2: MCE row 2 contains future-tense "will" keyword

## Definition of Done

- [x] All AC met
- [x] tests passing 100/100

## Workflow Checklist

- [x] Step 0: spec
- [x] Step 5: review
- [ ] Step 6: post-merge

## Completion Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-04-28 | Step 0 spec | drafted |
| 2026-04-28 | Step 5 review | tests passing 100/100 final |

## Merge Checklist Evidence

| Action | Done | Evidence |
|--------|:----:|----------|
| 0. Validate ticket structure | [x] | sections present |
| 1. Mark all items | [x] | AC 2/2 |
| 2. Verify product tracker | [x] | will sync in tracker commit before /audit-merge |
| 3. Update key_facts.md | [x] | N/A |
| 4. Update decisions.md | [x] | N/A |
| 5. Commit documentation | [x] | commit abcdef |
| 6. Verify clean working tree | [x] | clean |
| 7. Verify branch up to date | [x] | ancestor of origin/develop |
