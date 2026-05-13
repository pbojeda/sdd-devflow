# F-FIXTURE-P11B-lite-cleanup: sub-scope ticket — closes API lint cleanup

**Feature:** F-FIXTURE-P11B-lite-cleanup | **Type:** Backend-Tooling | **Priority:** Medium
**Status:** Done (squash merged 2026-05-13)
**Branch:** feature/F-FIXTURE-P11B-lite-cleanup
**Created:** 2026-05-12 | **Dependencies:** None

## Spec

Sub-scope ticket closing the API lint portion of parent feature F-FIXTURE-P11B.
The parent feature still has deferred items (frontend lint, monorepo build filters)
so its tracker row correctly stays at `pending`. v0.18.4 P11-B must detect the
`-lite-` suffix and emit `P11 N/A` instead of flagging the parent/sub-scope
status divergence.

## Acceptance Criteria

- [x] AC1: API lint clean

## Definition of Done

- [x] Implementation merged

## Workflow Checklist

- [x] Step 0: spec
- [x] Step 5: review

## Completion Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-05-13 | Step 5 review | OK |
