# Product Tracker — fixture B5

> Fixture verifying the v0.18.1 P9 tracker-header format flexibility (B5).
> Header writes the step as `4/6` (no "Step" prefix, fx style), Active
> Feature detail uses `Step 5/6` (traditional style). The two are
> logically inconsistent (4 vs 5) and P9 should fire.
>
> v0.18.0 regex `Step [0-9]+/6` extracts only from detail (`Step 5/6`)
> but returns empty for header — conditional skip → silent PASS.
> v0.18.1 regex `(Step )?[0-9]+/6` + `sed -E 's/^Step //'` normalizes
> both forms, exposes the 4 vs 5 mismatch.

## Active Session

**Last Updated:** 2026-04-28 (F-FIXTURE-B5 4/6)

**Active Feature:** F-FIXTURE-B5
Step 5/6 — review in progress.

## Features

| ID | Title | Status | Progress |
|----|-------|--------|----------|
| F-FIXTURE-B5 | B5 tracker-format-mix fixture | in-progress | 5/6 |
