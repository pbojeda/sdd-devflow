Audit feature $ARGUMENTS in the foodXPlorer project at /Users/pb/Developer/FiveGuays/foodXPlorer/

## What to do

1. **Explore the feature state** — Read product tracker, ticket, key_facts, decisions, bugs, git status, git log, .sdd-version, and current branch
2. **Verify pre-merge checklist** — Check all items from the Merge Approval checkpoint (ticket sections, tracker sync, documentation updates, clean working tree)
3. **Review implementation** — Read new/modified source files, migrations, tests. Check test counts and code quality.
4. **Find issues** — Look for workflow compliance gaps, documentation omissions, edge cases, or template problems in the SDD DevFlow library
5. **Report** — Summarize findings in a table format and provide the exact message to send to the other agent to fix any issues before merge

## Key checks

- Ticket: Workflow Checklist (Steps 0-5 marked [x]), Acceptance Criteria (all [x]), Definition of Done (all [x]), Completion Log (entries for each step)
- Tracker: Active Session and Features table at correct step
- key_facts.md updated if new models/schemas/migrations
- decisions.md with ADR if needed
- bugs.md updated if bugs found
- Working tree clean (git status)
- All tests passing

## Output format

1. Brief summary (feature name, complexity, branch, test count)
2. Compliance table (check | status)
3. Issues found (if any) — flag both foodXPlorer issues AND SDD DevFlow library template issues
4. Exact message to tell the other agent (copy-pasteable)
