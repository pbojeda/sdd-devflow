# Plan: PM Agent + L5 Autonomous Mode (v0.10.0)

## Context

SDD DevFlow v0.9.0 has a complete 6-step development workflow orchestrated by `development-workflow/SKILL.md`, with 9 agents and 4 autonomy levels (L1-L4). Today the user manually decides which feature to work on, invokes `start task FXXX`, approves checkpoints, and handles session recovery after `/compact`.

The goal: add a **PM Orchestrator skill** and **L5 autonomy level** so the agent can run multiple features end-to-end with minimal human intervention.

## Feasibility Analysis

### What we CAN build (within Claude Code's capabilities)

1. **Sequential feature loop** — PM skill reads product tracker, picks next pending feature, invokes development-workflow, repeats
2. **File-based state persistence** — `pm-session.md` survives /compact and session restarts
3. **L5 = L4 + auto feature sequencing** — all checkpoints auto-approve, PM Agent picks next feature automatically
4. **Guardrails** — max features per session, consecutive failure circuit breaker, kill switch file, quality gates always enforced
5. **Compaction recovery** — enhanced SessionStart hook injects PM-aware recovery context
6. **Complexity batch classification** — user classifies all pending features upfront in one interaction, then the loop runs unattended

### What we CANNOT build (honest limitations)

1. **True parallel execution** — Claude Code runs one Task agent at a time. Agent Teams deferred.
2. **Cross-session persistence** — if the terminal closes, the session ends. User must re-invoke `continue pm`.
3. **Unbounded execution** — context window fills after 3-8 features (depending on complexity). /compact needed periodically.
4. **Fire-and-forget** — this is "supervised autonomous", not "unattended for 50 features".

### Realistic expectations

- **3-5 Simple features per session** before needing /compact
- **2-3 Standard features per session** before needing /compact
- **1-2 Complex features per session** (they already consume significant context)
- After /compact, `continue pm` resumes from where it left off via pm-session.md

---

## Design

### Architecture: Skill, not Agent

The PM Orchestrator is a **skill** (`pm-orchestrator/SKILL.md`), not an agent markdown file. Rationale:
- Skills orchestrate workflows; agents perform specialized tasks
- The PM Agent wraps the existing `development-workflow` skill, not replaces it
- Matches the existing pattern (skills contain the flow, agents contain domain expertise)

### L5 Autonomy Level

| Checkpoint | L1 | L2 | L3 | L4 | **L5** |
|---|:-:|:-:|:-:|:-:|:-:|
| Spec Approval | Required | Auto | Auto | Auto | **Auto** |
| Ticket Approval | Required | Auto | Auto | Auto | **Auto** |
| Plan Approval | Required | Required | Auto | Auto | **Auto** |
| Commit Approval | Required | Auto | Auto | Auto | **Auto** |
| Merge Approval | Required | Required | Required | Auto | **Auto** |
| **Next Feature** | — | — | — | — | **Auto** |

L5 = L4 + automatic feature sequencing. Quality gates (tests, lint, build, validators, code review, QA) always run regardless of level.

### PM Orchestrator Skill Commands

- `start pm` — Start autonomous session. Reads tracker, asks user to batch-classify complexity for all pending features, then runs the loop.
- `continue pm` — Resume after /compact or session restart. Reads pm-session.md for state.
- `stop pm` — Graceful stop after current feature completes.
- `pm status` — Show progress summary from pm-session.md.

### Orchestration Loop

```
start pm:
  1. Read product-tracker.md → collect all pending features
  2. Filter: remove features with unmet dependencies
  3. Sort: priority (High > Medium > Low) → feature ID (ascending)
  4. Present batch to user: "These N features will run. Classify complexity for each."
  5. User classifies all at once (Simple/Standard/Complex per feature)
  6. Write initial pm-session.md with batch plan
  7. Loop:
     a. Check kill switch (pm-stop.md exists? → stop)
     b. Pick next unfinished feature from batch
     c. Write to pm-session.md: "Starting FXXX, step 0/6"
     d. Invoke development-workflow: "start task FXXX as [complexity]"
        - development-workflow reads L5 → all checkpoints auto-approve
        - All agents execute normally (spec, plan, implement, review...)
        - Merge checklist evidence still filled (B+D mechanism)
     e. After Step 6 completes:
        - Verify tracker shows feature as "done"
        - Run `npm test` on target branch as sanity check
        - Update pm-session.md: "Completed FXXX" with summary
     f. If feature fails:
        - Test/build/QA failure: retry fix loop (existing behavior, max 3 retries)
        - If retries exhausted: mark as "blocked" in pm-session.md, skip to next
        - Merge conflict: mark as "blocked", skip
        - 3 consecutive blocked features: STOP loop, report to user
     g. If session is getting heavy (>3 features completed):
        - Save full state to pm-session.md
        - Suggest: "Consider running /compact before next feature"
     h. Continue loop until batch complete or stopped
  8. Final report: summary of completed/blocked/remaining features
```

### pm-session.md (State File)

```markdown
# PM Autonomous Session

**Started:** 2026-03-17 14:00
**Autonomy Level:** L5 (PM Autonomous)
**Status:** in-progress | completed | stopped

## Batch Plan

| Feature | Complexity | Status | Duration | Notes |
|---------|------------|--------|----------|-------|
| F014 | Simple | done | ~8 min | Clean completion |
| F015 | Simple | done | ~10 min | 1 QA fix |
| F016 | Standard | blocked | — | Merge conflict on shared/schemas |
| F017 | Standard | in-progress | — | Step 3 (Implement) |

## Recovery Instructions

Current feature: F017, step 3/6 (Implement)
Branch: feature/F017-short-desc
Next features: (none remaining)
Blocked: F016 (merge conflict — needs manual resolution)

To resume: run `continue pm`
```

### Compaction Recovery

The existing `SessionStart` compact hook injects recovery context. Enhancement:

```json
{
  "matcher": "compact",
  "hooks": [{
    "type": "command",
    "command": "bash -c 'if [ -f docs/project_notes/pm-session.md ]; then echo \"{\\\"additionalContext\\\": \\\"PM Autonomous session active. Read docs/project_notes/pm-session.md for full state, then run: continue pm\\\"}\"; else echo \"{\\\"additionalContext\\\": \\\"Context was compacted. Read product tracker Active Session for context recovery.\\\"}\"; fi'",
    "statusMessage": "Injecting recovery context..."
  }]
}
```

If pm-session.md exists → inject PM-specific recovery. Otherwise → existing behavior unchanged.

### Guardrails

1. **Max features per session:** 10 (configurable in skill). Hard stop after N features.
2. **Consecutive failure circuit breaker:** 3 blocked features in a row → stop loop, report.
3. **Kill switch:** User creates `docs/project_notes/pm-stop.md` → PM checks before each feature and stops. Or simply types `stop pm`.
4. **Quality gates always enforced:** Tests, lint, build, production-code-validator, code-review-specialist, qa-engineer — L5 does NOT skip quality.
5. **Post-merge sanity check:** After each feature merge, run `npm test` on target branch. If tests fail → STOP (something broke the main branch).
6. **Desktop notifications still fire:** permission_prompt and idle_prompt hooks work at L5.

### Rollback Strategy

- Each feature = one squash merge commit → individually revertable with `git revert`
- Blocked features stay on their branches, never merged
- If the whole session needs undoing: revert commits in reverse order
- pm-session.md records exactly which commits were made

---

## Files to Create/Modify

### New Files

| File | Description | Lines (est.) |
|------|-------------|-------------|
| `template/.claude/skills/pm-orchestrator/SKILL.md` | PM Orchestrator skill — the core deliverable | ~200 |
| `template/.claude/skills/pm-orchestrator/references/pm-session-template.md` | Template for pm-session.md state file | ~30 |
| `template/.gemini/skills/pm-orchestrator/SKILL.md` | Gemini mirror | ~200 |
| `template/.gemini/skills/pm-orchestrator/references/pm-session-template.md` | Gemini mirror | ~30 |

### Modified Files

| File | Change | Lines (est.) |
|------|--------|-------------|
| `lib/config.js` | Add L5 to AUTONOMY_LEVELS: `{ level: 5, name: 'PM Autonomous', desc: '...' }` | ~3 |
| `template/.claude/skills/development-workflow/SKILL.md` | Add L5 column to checkpoint table + note about PM Orchestrator | ~10 |
| `template/.gemini/skills/development-workflow/SKILL.md` | Same L5 column (Gemini mirror) | ~10 |
| `template/.claude/skills/development-workflow/references/complexity-guide.md` | Add L5 row to interaction table | ~5 |
| `template/.gemini/skills/development-workflow/references/complexity-guide.md` | Same (Gemini mirror) | ~5 |
| `template/CLAUDE.md` | Update autonomy comment: `(1-5)`, add L5 session recovery note | ~5 |
| `template/GEMINI.md` | Same (Gemini mirror) | ~5 |
| `template/AGENTS.md` | Add PM Orchestrator to skills list | ~3 |
| `template/.claude/settings.json` | Enhance compact hook with PM-aware detection | ~5 |
| `ai-specs/specs/base-standards.mdc` | Add L5 row to checkpoint table in standards | ~3 |
| `test/smoke.js` | 5-6 new scenarios (L5 generation, pm-orchestrator exists, upgrade preserves L5) | ~120 |
| `CHANGELOG.md` | v0.10.0 entry | ~15 |
| `dev/ROADMAP.md` | Mark PM Agent + L5 as done | ~3 |
| `package.json` | Bump to 0.10.0 | ~1 |

**Total: ~4 new files, ~14 modified files, ~650 lines**

### What does NOT change

- `lib/generator.js` — pm-orchestrator skill directory gets copied like any other skill (no special handling)
- `lib/init-generator.js` — same, skill directory copies automatically
- `lib/upgrade-generator.js` — skills/ directory is already replaced on upgrade
- `lib/adapt-agents.js` — pm-orchestrator is project-type agnostic (backend, frontend, fullstack)
- `lib/doctor.js` — could optionally add a check, but not required
- Existing L1-L4 behavior — completely unchanged

---

## Key Reuse

| Existing Component | Reused By PM Orchestrator |
|---|---|
| `development-workflow/SKILL.md` | PM skill invokes it via `start task FXXX` for each feature |
| Checkpoint table (L4 Auto) | L5 behaves identically to L4 for individual checkpoints |
| `product-tracker.md` Active Session | PM reads this to determine current state |
| `failure-handling.md` | PM follows existing retry/block/rollback patterns |
| `merge-checklist.md` + Evidence table | Still executed at Step 5, even at L5 |
| `SessionStart` compact hook | Enhanced but backward-compatible |
| `complexity-guide.md` | PM uses batch classification at session start |

---

## Implementation Sequence

### Step 1: Config + Autonomy (trivial)
- Add L5 to `AUTONOMY_LEVELS` in `lib/config.js`
- Update comment in `template/CLAUDE.md` and `template/GEMINI.md`

### Step 2: Checkpoint table updates
- Add L5 column to `development-workflow/SKILL.md` (Claude + Gemini)
- Add L5 row to `complexity-guide.md` (Claude + Gemini)
- Add L5 to `base-standards.mdc` checkpoint table

### Step 3: PM Orchestrator Skill (the big one)
- Write `pm-orchestrator/SKILL.md` with full orchestration logic
- Write `pm-session-template.md`
- Mirror for Gemini

### Step 4: Hook enhancement
- Update `settings.json` compact hook with PM-aware detection

### Step 5: Documentation
- Update `AGENTS.md` skills section
- Update `CHANGELOG.md`
- Update `dev/ROADMAP.md`

### Step 6: Tests
- Scenario 33: L5 autonomy level generates correctly
- Scenario 34: pm-orchestrator skill exists for Claude
- Scenario 35: pm-orchestrator skill exists for Gemini when `aiTools: 'both'`
- Scenario 36: SKILL.md checkpoint table has L5 column
- Scenario 37: --upgrade preserves L5 autonomy level
- Scenario 38: pm-session-template.md accessible from skill

### Step 7: Manual validation on foodXPlorer
- Run `start pm` on 2-3 pending features (F014, F015)
- Validate the full loop: classify → execute → complete → next
- Test /compact recovery with `continue pm`

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Context exhaustion mid-feature | High (certain for >3 Std features) | Medium | pm-session.md saves state; `continue pm` resumes; proactive /compact suggestion |
| Broken code passes quality gates | Low | High | 6-layer quality (tests + lint + build + validator + review + QA) + post-merge sanity check |
| Merge conflicts between features | Medium | Medium | Each feature starts from latest target branch; blocked features skipped, not force-resolved |
| Runaway execution | Low | Medium-High | Max 10 features, 3-failure circuit breaker, kill switch, user can interrupt anytime |
| Breaking L1-L4 | Very Low | High | L5 is purely additive (new array entry + new column). 32 existing smoke tests catch regressions |
| pm-session.md gets corrupted | Low | Low | Product tracker is always the source of truth; PM falls back to tracker if pm-session.md is missing |

---

## Edge Cases & Open Questions

### Edge Case 1: Feature mid-execution during /compact
If /compact happens while development-workflow is in Step 3 (Implement), the active feature is half-done. The `continue pm` flow must:
1. Read pm-session.md → find "in-progress" feature with step
2. Read product tracker Active Session → get current step and branch
3. Resume development-workflow from that step (existing session recovery handles this)

### Edge Case 2: pm-session.md vs product-tracker.md disagreement
If pm-session.md says F014 is "done" but tracker still shows "in-progress", which wins?
**Decision:** Product tracker is the source of truth. PM Orchestrator verifies tracker state after each feature.

### Edge Case 3: User modifies tracker mid-PM-session
If the user manually changes feature priorities or adds features while the PM loop is running:
**Decision:** PM re-reads tracker only between features (not mid-feature). Changes take effect at the next feature boundary.

### Edge Case 4: Branch already exists for next feature
If `feature/F015-xxx` already exists (e.g., from a previous blocked attempt):
**Decision:** development-workflow Step 1 already handles this — checkout existing branch and resume.

### Edge Case 5: L5 selected but no pm-orchestrator invoked
User sets L5 in CLAUDE.md but runs `start task F001` directly (not `start pm`):
**Decision:** development-workflow at L5 behaves exactly like L4 (all checkpoints auto). The PM loop is opt-in via `start pm`, not forced by L5. L5 just unlocks the capability.

### Edge Case 6: Batch classification changes mid-session
User realizes F016 should be Complex, not Standard, after F014 is already done:
**Decision:** User can type `stop pm`, manually adjust pm-session.md complexity column, then `continue pm`.

### Edge Case 7: Post-merge sanity check fails
After merging F014, `npm test` fails on target branch (a test that passed on the feature branch fails on develop):
**Decision:** STOP the loop immediately. This means F014 introduced a regression that only manifests on the target branch. User must investigate manually. Do NOT continue with more features on a broken branch.

### Edge Case 8: Gemini CLI limitations
Gemini CLI may not support the same hook/skill invocation patterns as Claude Code:
**Decision:** Create Gemini SKILL.md with equivalent instructions. Document that L5 PM Orchestrator is fully tested on Claude Code; Gemini support is "best effort" based on Gemini's evolving capabilities.

---

## Additional Issues Found (Code Review)

### Problem 1: L5 Wizard Selection Lacks Warning
**Files:** `lib/wizard.js` (line 91-93), `lib/init-wizard.js` (line 187-193)
**Issue:** Adding L5 to `AUTONOMY_LEVELS` makes it automatically appear in create/init wizards. Users may select L5 without understanding it requires `start pm` invocation.
**Fix:** Add explicit description to L5 choice: `'PM Agent orchestrates features end-to-end (requires "start pm" command)'`. The desc already appears in the wizard — just make it clear.

### Problem 2: Doctor Doesn't Validate Autonomy vs Skills
**File:** `lib/doctor.js`
**Issue:** If L5 is set but pm-orchestrator skill directory is missing, `--doctor` reports no problems.
**Fix:** Add a new check: `checkAutonomySkillConsistency()` — if autonomy >= 5 and pm-orchestrator missing, emit WARN with suggestion to `--upgrade`. Reuse `readAutonomyLevel()` from `upgrade-generator.js`. (~40 lines)

### Problem 3: Checkpoint Table Exists in 3 Files
**Files:** `base-standards.mdc` (line 62-68), Claude `SKILL.md` (line 42-48), Gemini `SKILL.md` (line 42-48)
**Issue:** The autonomy checkpoint table is duplicated across 3 files. All 3 must get the L5 column.
**Fix:** Plan already covers SKILL.md (Claude + Gemini) and base-standards.mdc. Verified all 3 are listed in "Modified Files". Consider adding a doctor check for checkpoint table consistency as a nice-to-have.

### Problem 4: AGENTS.md Has No Skills Section
**File:** `template/AGENTS.md`
**Issue:** AGENTS.md lists agents and standards but has no "Available Skills" section. Users can't discover pm-orchestrator.
**Fix:** Add a "## Available Skills" section after "Automated Hooks" listing all 5 skills (development-workflow, bug-workflow, health-check, project-memory, pm-orchestrator) with invocation instructions. (~15 lines)

### Problem 5: Eject at L5 Leaves Orphaned pm-session.md
**File:** `lib/eject-generator.js` (after line 282)
**Issue:** Eject deletes pm-orchestrator skill but preserves `docs/project_notes/pm-session.md` (user data). This leaves orphaned state that could confuse re-init.
**Fix:** During eject, if pm-session.md exists, rename to `pm-session.bak.md` and log a note. (~10 lines)

### Fragility: readAutonomyLevel() regex
**File:** `lib/upgrade-generator.js` (line 81)
**Status:** Low priority. Regex `(\d+)` already matches any digit including 5. Works correctly for L5. Could be made more lenient for hand-edited formats but not blocking.

### Fragility: --diff doesn't list skill names
**File:** `lib/diff-generator.js` (line 84-86)
**Status:** Low priority. Currently shows "4 skills" → will show "5 skills" but doesn't name them. Nice-to-have improvement to list skill names.

---

## Updated File Count

Original plan: 4 new + 14 modified (~650 lines)
With fixes: 4 new + **17 modified** (~750 lines)

Additional modifications:
- `lib/doctor.js` — new autonomy/skills consistency check (~40 lines)
- `lib/wizard.js` — L5 description clarity (~2 lines)
- `lib/init-wizard.js` — L5 description clarity (~2 lines)
- `lib/eject-generator.js` — pm-session.md archive on eject (~10 lines)

---

## What We Are NOT Building

- **Agent Teams / parallel execution** — deferred (requires Claude Code concurrent Task support)
- **External orchestration service** — no Node.js daemon, no GitHub Actions coordinator
- **Cross-session auto-restart** — not technically possible
- **Web dashboard** — out of scope
- **Cron-based scheduling** — synchronous loop is simpler and more reliable

---

## Verification Checklist

1. `npm test` — all 32 existing scenarios pass + 5-6 new scenarios pass
2. Manual: `start pm` on foodXPlorer with F014 + F015
3. Manual: /compact mid-session → `continue pm` resumes correctly
4. Manual: create `pm-stop.md` → loop stops gracefully
5. Manual: --upgrade from v0.9.0 → v0.10.0 preserves L5 if set
6. Manual: set L5, run `start task F001` directly → behaves like L4 (no PM loop)
