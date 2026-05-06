# Product Tracker — fixture P12

> Fixture verifying the v0.18.2 P12 tracker HEAD drift detection.
>
> The `**Last Updated:**` line embeds `HEAD aaaaaaa` and the `**Active Feature:**`
> line embeds `HEAD: bbbbbbb`. Neither matches the test's `actualHead` value, so
> P12 must fire.
>
> A "Last Completed" narrative paragraph below contains backtick-wrapped SHAs
> (`cccccccc`, `dddddddd`, `eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`) that
> should NOT trigger P12 — they're not on a header line and lack the `HEAD`
> token prefix. False-positive guard: if these prose SHAs caused P12 to flag
> on every audit, the recipe would be unusable. The strict scoping
> (`grep -E '^\*\*(Last Updated|Active Feature):\*\*'` followed by
> `grep -oE 'HEAD[[:space:]:]+`?[a-f0-9]{7,40}`?'`) keeps narrative SHAs safely
> ignored.

## Active Session

**Last Updated:** 2026-05-06 — F-FIXTURE-P12 Step 5/6 (Review). PR #999. HEAD aaaaaaa → final tracker sync commit pending.

**Active Feature:** **F-FIXTURE-P12** — Test fixture for P12 tracker HEAD drift recipe. Standard SDD, fullstack. **Step 5/6 (Review) — fix loop complete, awaiting merge audit + approval**. Branch: `feature/F-FIXTURE-P12-stale-head` (off `develop @ ffffffff`). HEAD: bbbbbbb. Total 4 commits on branch.

**Last Completed (2026-05-06)**: F-PRIOR-1 squash-merged via PR #998 at `cccccccc` (28 files +1234/-56). Branch deleted post-merge. Earlier in the session: `dddddddd` was the docs-only cleanup commit; the full feature ID hash trail spans `eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee` from the original spec lock through the final implementation commit. None of these SHAs are HEAD references — they describe historical commits and must NOT trigger P12.

## Features

| ID | Title | Status | Progress |
|----|-------|--------|----------|
| F-FIXTURE-P12 | P12 tracker HEAD drift fixture | in-progress | 5/6 |
