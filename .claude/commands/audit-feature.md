Audit feature $ARGUMENTS in the foodXPlorer project at /Users/pb/Developer/FiveGuays/foodXPlorer/

## What to do

### Phase 1 — Discover and classify

1. **Find the ticket file** — `find docs/tickets -name "*$ARGUMENTS*"`. If not found, try case-insensitive and partial matches. If still not found, report as CRITICAL gap.
2. **Classify the PR type** — determine if this is:
   - **(a) Feature/bugfix PR** (single ticket, standard audit) — most common
   - **(b) Release PR** (develop→main, aggregates multiple tickets) — checks 1-6 become N/A, use release-specific pre-flight checks instead
   - **(c) Self-testing PR** (the PR IS the verification mechanism, e.g., BUG-PROD-005 docs-only PR that tests Render build filters) — some checks are FAIL-by-design with explicit evidence required
   - **(d) Tracker-sync/housekeeping PR** (post-merge cleanup, like PRs #130, #131, #133) — lightweight audit, focus on ticket Status closure
3. **Read context files** — product tracker, ticket, key_facts, decisions, bugs, git status, git log, .sdd-version, current branch

### Phase 2 — Structural verification (ticket compliance)

For **(a) Feature/bugfix PRs**, verify ALL of these:

1. **Ticket Status field** — expected: "Ready for Merge" (pre-merge) or "Done" (post-merge). Cross-check:
   - If PR is MERGED but Status ≠ "Done" → flag as **stale Status** (same class as BUG-PROD-007/BUG-PROD-008-FU1)
   - If branch no longer exists (local or remote) but Status ≠ "Done" → flag as **frozen ticket**
2. **Acceptance Criteria count verification** — TWO checks:
   - Count `[x]` and `[ ]` in the AC section → report X/Y
   - Cross-reference against the AC table in the Spec section (if present) → verify Y matches the number of ACs defined. Mismatch = **AC count drift**
3. **Definition of Done** — count `[x]` vs `[ ]`, report X/Y
4. **Workflow Checklist** — count `[x]` vs `[ ]`, report X/Y. Note: Step 6 is typically `[ ]` pre-merge and `[x]` post-merge. Flag if Steps 0-5 have any `[ ]`
5. **Merge Checklist Evidence** — verify table is filled with empirical evidence (commit SHAs, test counts, CI check names), not placeholders ("TBD", "Will fill later")
6. **Completion Log completeness** — count entries and cross-reference against Workflow steps marked `[x]`. Each completed step should have a corresponding Completion Log entry. Missing entries = **log gap**

For **(b) Release PRs**, checks 1-6 are **N/A** (structurally inapplicable). Instead verify:
- Per-feature tickets referenced in the PR are all Status=Done
- Pre-flight verification section present (CI green, env vars, backup if applicable)
- Deploy orchestration documented (which services, monitoring plan)
- Rollback plan present with literal commands

For **(c) Self-testing PRs**, some checks will be FAIL-by-design:
- Document WHICH checks fail and WHY (e.g., "AC1/AC2 require post-merge Render Events inspection — cannot be verified pre-merge")
- Verify the agent has explicitly planned a mandatory follow-up tracker-sync PR to close the ticket post-verification
- Flag if the follow-up plan is missing or vague

### Phase 3 — Cross-reference verification

7. **Tracker sync** — read `docs/project_notes/product-tracker.md`:
   - Active Session: should reference this feature at the correct step (or "None" if completed)
   - Pipeline/Features table: feature listed with correct status
   - Last Completed: if feature is done, should appear here with merge commit reference
8. **Documentation updates**:
   - `key_facts.md` — updated if new models, schemas, migrations, infra changes, or API endpoints
   - `decisions.md` — ADR present if architectural decision was made
   - `bugs.md` — entry present if bugs were found during implementation or if this IS a bugfix
9. **Post-merge action detection** — scan ticket for:
   - Sections named "Production environment", "Post-merge", "Runbook", "Migration"
   - ACs with notes like "post-merge", "prod rollout", "pending verification"
   - If found: flag as **post-merge actions required** and list them explicitly

### Phase 4 — Implementation review (if PR is open/accessible)

10. **PR metadata** — `gh pr view <NUMBER> --json title,state,mergeStateStatus,mergeable,additions,deletions,changedFiles,statusCheckRollup`
11. **CI status** — all checks green? Any SKIPPED that shouldn't be?
12. **Files changed** — `gh pr diff <NUMBER> --name-only`. Scan production files for red flags:
    - Hardcoded secrets or credentials
    - Missing error handling on external calls
    - SQL injection or unsafe string interpolation
    - Test files that assert on hardcoded UUIDs without safety markers
13. **Working tree** — `git status` should be clean (only expected untracked files like `.claude/scheduled_tasks.lock`)

### Phase 3b — Drift detection (added v0.18.0)

Eleven empirically-validated drift patterns that the structural checks of Phase 2 do NOT catch. Each fires independently; results feed into "Drift findings" subsection of the report. Severity per pattern — drift findings do NOT block merge but should be fixed before user authorization.

Run all 11 against the ticket, PR body, tracker, and remote state:

**P1 — PR body test count stale** (IMPORTANT). Bind the ratio to a test-count context (same line as `npm test`/`tests?`/`pass`/`green`) to avoid AC/DoD ratios. Use `[0-9]+/[0-9]+` open-ended.
```
PR_TESTS ← from PR body, first ratio on a line with test/pass/green keyword
TICKET_TESTS ← last matching ratio in the ticket file
If PR_TESTS ≠ TICKET_TESTS (both non-empty) → flag IMPORTANT
```

**P2 — Merge Checklist Evidence rows aspirational** (IMPORTANT). Scan `[x]` rows for future-tense phrases.
```
In the `## Merge Checklist Evidence` section, grep rows marked [x] containing:
  /to be |will |pending|TBD|Will be |to be created|next commit|aspirational/
→ flag IMPORTANT per matching row
```

**P3 — Post-merge actions not logged in close** (IMPORTANT, post-merge only). Strip `- [ ] ` prefix with `sed` before comparing. Use fixed-string grep against Completion Log.
```
If PR state = MERGED AND ticket Status = Done:
  For each post-merge item (`- [ ] ` AC/DoD/test-plan line with keywords):
    stripped_item ← sed 's/^- \[ \] //'
    key ← first 40 chars
    If `grep -Fq "$key"` fails in Completion Log → flag IMPORTANT
```

**P4 — Remote branch orphan after "deleted"** (NIT pre-merge · IMPORTANT post-merge). Extract branch via `sed` (no `\K` — BSD grep compat). Check with `git ls-remote --heads`.
```
BRANCH ← sed 's/^\*\*[Bb]ranch:\*\*[[:space:]]*([^[:space:]|]+).*/\1/' on ticket header
If PR state = MERGED AND `git ls-remote --heads origin $BRANCH` non-empty → flag IMPORTANT
```

**P5 — Frozen ticket Status** (IMPORTANT single · CRITICAL-SYSTEMIC ≥2). Multi-word Status via `sed -E` char class. Merge detection via `git log --all --grep=$ticket_id`.
```
For each ticket in docs/tickets/*.md:
  status ← multi-word via sed capture `([A-Za-z ]+)` before `|`
  If status ≠ "Done" AND `git log --all --grep=$ticket_id` non-empty → collect
FROZEN_COUNT ≥ 2 → CRITICAL-SYSTEMIC (systemic close-pattern gap)
FROZEN_COUNT = 1 → IMPORTANT
```

**P6 — Off-by-N AC/checkbox counts** (NIT). Compare Merge Checklist Evidence row 1 claim ("all N marked" / "AC: X/Y") against actual count of `[x]` + `[ ]` in `## Acceptance Criteria`. Divergence ≥2 flags.

**P7 — Test count drift within ticket** (IMPORTANT, final-sections only). Only flag when AC, DoD, or tracker Active-Session numbers differ from Completion Log terminal entry. Intermediate rows (Step 3 Plan Step 8 snapshot) are legitimate and IGNORED.
```
TERMINAL ← last ratio in Completion Log matching test/pass/green marker
FINAL_NUMS ← ratios in AC + DoD sections matching test/pass/green marker
TRACKER_NUM ← Active Session first ratio (if present)
For each n in FINAL_NUMS + TRACKER_NUM:
  If n ≠ TERMINAL → flag IMPORTANT with delta
```

**P8 — Completion Log gap vs Workflow Checklist** (IMPORTANT). Use `while-read` (not `for-in`) on unique step numbers from CHECKED workflow items only.
```
CHECKED_STEPS ← sed 's/^- \[x\] Step ([0-9]+):.*/\1/' on [x] Workflow rows, sort -u
For each step_num:
  If Completion Log has no row matching `Step $step_num([^0-9]|$)` → flag IMPORTANT
```

**P9 — Tracker header "Last Updated" stale vs Active Session detail** (NIT). Compare step-reference in `**Last Updated:**` header vs `**Active Feature:**` line. If they cite different step numbers (e.g., header says 0/6 but detail says 5/6) → flag NIT.

**P10 — Duplicate Completion Log rows** (NIT). Hash `date | action | first-80-chars-of-notes` and flag `uniq -d`.

**P11 — Tracker Features table status vs ticket Status mismatch** (IMPORTANT). Ticket Status=Ready for Merge / Review expects tracker=in-progress. Ticket Status=Done expects tracker=done. Mismatch → flag IMPORTANT.

---

### Phase 5 — Report

## Output format

### 1. Brief summary
Feature name, type (feature/bugfix/release/housekeeping), complexity tier, branch, test count, PR number.

### 2. Compliance table

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 1 | Ticket Status | [status] | [actual value + expected] |
| 2 | Acceptance Criteria | [X/Y] | [count verification note] |
| 3 | Definition of Done | [X/Y] | |
| 4 | Workflow Checklist | [X/Y] | [note if Step 6 unchecked pre-merge] |
| 5 | Merge Checklist Evidence | [filled/empty/partial] | |
| 6 | Completion Log | [X entries for Y steps] | |
| 7 | Tracker sync | [pass/fail] | [Active Session + Pipeline status] |
| 8 | key_facts / decisions / bugs | [pass/N/A] | |
| 9 | Post-merge actions | [none/pending] | [list if pending] |
| 10 | CI status | [pass/pending/fail] | [check names] |
| 11 | Working tree | [clean/dirty] | |

### 3. Issues found

For each issue:
- **Severity**: CRITICAL (blocks merge) / IMPORTANT (should fix before merge) / NIT (cosmetic)
- **Description**: what's wrong
- **Evidence**: file:line or command output
- **Pattern match**: if this matches a known historical gap (e.g., "same class as BUG-PROD-007 frozen ticket"), note it

Flag both:
- **foodXPlorer issues** (ticket gaps, tracker desync, code problems)
- **SDD DevFlow library issues** (template problems, skill gaps, doctor check misses)

### 3b. Drift findings (added v0.18.0)

Report output of Phase 3b pattern detections. Drift findings are advisory (non-blocking merge) but MUST be addressed before user authorization.

| # | Pattern | Severity | Evidence |
|---|---------|----------|----------|
| P1 | PR body test count stale | IMPORTANT | e.g. PR body: 3766, ticket terminal: 3788 |
| P2 | Merge Checklist Evidence aspirational | IMPORTANT | row 5: "will land in next commit" |
| P3 | Post-merge actions not logged | IMPORTANT | "operator runs reseed --prod" missing from Completion Log |
| P4 | Remote branch orphan | NIT/IMPORTANT | `feature/X` still on origin |
| P5 | Frozen ticket Status | IMPORTANT/CRITICAL-SYSTEMIC | 3 tickets still In Progress post-merge |
| P6 | AC count off-by-N | NIT | "all 24 marked" but actually 26 |
| P7 | Test count drift within ticket | IMPORTANT | AC13: 3694, DoD: 3788, terminal: 3788 |
| P8 | Completion Log gap | IMPORTANT | Step 3+4+5 [x] but no log entries |
| P9 | Tracker header stale | NIT | header says Step 0/6, detail says 5/6 |
| P10 | Duplicate Completion Log rows | NIT | 2 identical "Plan revised v2" rows |
| P11 | Tracker Features status mismatch | IMPORTANT | Status=Done but tracker=in-progress |

If no pattern fires: `DRIFT: clean (0/11 patterns)`. If any fires: `DRIFT: N advisories — refresh before user authorization`.

### 4. Exact message to the other agent

Copy-pasteable message with:
- Verdict: APPROVE / APPROVE WITH NOTES / REJECT
- Per-issue: what to fix and how
- If APPROVE: explicit "procede con squash-merge" or "procede con /audit-merge"
- If post-merge actions exist: remind the agent they are mandatory, not optional
