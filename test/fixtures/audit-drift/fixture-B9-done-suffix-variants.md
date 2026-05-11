# F-FIXTURE-B9: Status field with post-Done parenthetical / dash variants

**Feature:** F-FIXTURE-B9 | **Type:** Backend-Feature | **Priority:** Low
**Status:** Done (code merged 2026-04-22; prod DB migration executed 2026-04-23)
**Branch:** feature/F-FIXTURE-B9
**Created:** 2026-04-22 | **Dependencies:** None

## Spec

Fixture verifying the v0.18.3 B9 sed strip on the Done-with-trailing-detail forms.
v0.18.1 sed produces `Done (code merged 2026-04-22; prod DB migration executed 2026-04-23)`
because no `|` suffix exists; the `[ "$status" = "Done" ]` test then fails, falsely
flagging the ticket as frozen.

The companion fixture `fixture-B9-features-table.md` exercises the multi-feature
form where several tickets in the same Features table use different Done-suffix
variants (parentheses, em-dash, en-dash, hyphen).

## Acceptance Criteria

- [x] AC1: Status header contains `Done (...)` form

## Definition of Done

- [x] All AC met

## Workflow Checklist

- [x] Step 0: spec
- [x] Step 5: review
- [x] Step 6: post-merge

## Completion Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-04-22 | Step 0 spec | drafted |
| 2026-04-22 | Step 5 review | OK |
| 2026-04-23 | Step 6 squash merge + prod migration | merged + migration applied |

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
