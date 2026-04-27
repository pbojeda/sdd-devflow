# F-FIXTURE-B6: Status uses bold-in-bold markup

**Feature:** F-FIXTURE-B6 | **Type:** Backend-Feature | **Priority:** Medium
**Status:** **Done** | **Branch:** feature/F-FIXTURE-B6 (deleted post-merge)
**Created:** 2026-04-28 | **Dependencies:** None

## Spec

Fixture verifying the v0.18.1 P5 sed Status-extraction harden (B6).

The header line above wraps the Status value in extra `**...**` (bold
inside the already-bold `**Status:**` prefix). v0.18.0 sed uses
`([A-Za-z ]+)` capture group which CANNOT match the literal `*` char,
so the regex fails entirely and the unsubstituted line is returned;
the bash test `[ "$status" = "Done" ]` then fails and the ticket is
incorrectly counted as frozen — a false positive.

v0.18.1 sed strips optional bold-open / bold-close markers in two
passes, returning a clean `Done` value.

## Acceptance Criteria

- [x] AC1: Status header uses `**Status:** **Done** | …` form

## Definition of Done

- [x] All AC met

## Workflow Checklist

- [x] Step 0: spec
- [x] Step 5: review
- [x] Step 6: post-merge

## Completion Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-04-28 | Step 0 spec | drafted |
| 2026-04-28 | Step 5 review | OK |
| 2026-04-28 | Step 6 squash merge | merged |

## Merge Checklist Evidence

| Action | Done | Evidence |
|--------|:----:|----------|
| 0. Validate ticket structure | [x] | sections present |
| 1. Mark all items | [x] | AC 1/1 |
| 2. Verify product tracker | [x] | tracker synced |
| 3. Update key_facts.md | [x] | N/A |
| 4. Update decisions.md | [x] | N/A |
| 5. Commit documentation | [x] | commit abcdef |
| 6. Verify clean working tree | [x] | clean |
| 7. Verify branch up to date | [x] | up to date |
