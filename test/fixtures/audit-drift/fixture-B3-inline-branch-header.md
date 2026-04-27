# F-FIXTURE-B3: ticket header uses inline `Status | Branch` format

**Feature:** F-FIXTURE-B3 | **Type:** Backend-Feature | **Priority:** Medium
**Status:** Done | **Branch:** feature/F-FIXTURE-B3 (deleted post-merge)
**Created:** 2026-04-28 | **Dependencies:** None

## Spec

Fixture verifying the v0.18.1 P4 inline-branch extraction (B3).

The header line above puts `**Status:** ...` first and `**Branch:** ...`
second on the SAME line (true for fx tickets and the SDD ticket-template
scaffold). The v0.18.0 grep `^\*\*[Bb]ranch:\*\*` requires line-start
match, fails on this format, and silently emits empty `BRANCH` →
`git ls-remote ""` no-ops → no flag even if the branch were orphaned.

The v0.18.1 fix uses `grep -oE '\*\*[Bb]ranch:\*\*[[:space:]]*[^[:space:]|()]+'`
to scan ANY line and extract the value, then sed-strips the prefix.

The trailing `(deleted post-merge)` parenthetical must NOT contaminate
the extraction — the regex stops at `(`.

## Acceptance Criteria

- [x] AC1: header is single-line inline `Status | Branch | …`
- [x] AC2: extracted branch name is `feature/F-FIXTURE-B3` (no parenthetical)

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
| 1. Mark all items | [x] | AC 2/2 |
| 2. Verify product tracker | [x] | tracker synced |
| 3. Update key_facts.md | [x] | N/A |
| 4. Update decisions.md | [x] | N/A |
| 5. Commit documentation | [x] | commit abcdef |
| 6. Verify clean working tree | [x] | clean |
| 7. Verify branch up to date | [x] | up to date |
