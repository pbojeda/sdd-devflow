# F-FIXTURE-P13: ticket claims `+8 atoms` but key_facts.md says `+7 atoms`

**Feature:** F-FIXTURE-P13 | **Type:** Backend-Feature | **Priority:** Medium
**Status:** Ready for Merge | **Branch:** feature/F-FIXTURE-P13
**Created:** 2026-05-08 | **Dependencies:** None

## Spec

Fixture verifying the v0.18.3 P13 drift recipe. The ticket claims a `+8 atoms`
delta (in Completion Log + MCE row) but the companion `fixture-P13-key-facts.md`
(used as the mocked `docs/project_notes/key_facts.md`) only logs `+7 atoms` for
F-FIXTURE-P13. P13 must flag the divergence.

Empirical origin: fx F-MULTITURN-001 audit 2026-05-08 (ticket said +8 atoms,
key_facts log row said +7 atoms — off-by-one accumulated across batched edits).

## Acceptance Criteria

- [x] AC1: feature implemented; +8 atoms added to seed
- [x] AC2: tests added

## Definition of Done

- [x] All AC met

## Workflow Checklist

- [x] Step 0: spec
- [x] Step 5: review

## Completion Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-05-08 | Step 0 spec | drafted |
| 2026-05-08 | Implementation | +8 atoms seeded |
| 2026-05-08 | Step 5 review | OK |

## Merge Checklist Evidence

| Action | Done | Evidence |
|--------|:----:|----------|
| 0. Validate ticket structure | [x] | sections present |
| 1. Mark all items | [x] | AC 2/2 |
| 2. Verify product tracker | [x] | tracker synced |
| 3. Update key_facts.md | [x] | +8 atoms logged for F-FIXTURE-P13 |
| 4. Update decisions.md | [x] | N/A |
| 5. Commit documentation | [x] | commit abcd123 |
| 6. Verify clean working tree | [x] | clean |
| 7. Verify branch up to date | [x] | up to date |
