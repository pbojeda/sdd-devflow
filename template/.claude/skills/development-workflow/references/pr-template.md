# Pull Request Template & Process

## PR Creation Process

### Step 1: Verify Readiness

Before creating a PR, ensure:

- [ ] All tests passing locally
- [ ] `production-code-validator` passed
- [ ] Code committed with proper message
- [ ] Documentation updated (if applicable)
- [ ] Branch is up to date with main

### Step 2: Push Branch

```bash
git push -u origin feature/sprint0-B0.1-express-setup
```

### Step 3: Create PR

Use GitHub CLI:

```bash
gh pr create --title "feat(backend): initialize Express + TypeScript project" --body "$(cat <<'EOF'
## Summary

Brief description of what this PR does.

## Task Reference

- **Task ID:** B0.1
- **Sprint:** 0
- **Tracker:** docs/project_notes/sprint-0-tracker.md

## Changes Made

- [ ] Change 1
- [ ] Change 2
- [ ] Change 3

## Testing

- [x] Unit tests written and passing
- [x] Integration tests passing (if applicable)
- [x] Manual testing completed
- [x] Validated with production-code-validator

## Screenshots (if UI changes)

<!-- Add screenshots here if applicable -->

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-reviewed the code
- [ ] Added necessary documentation
- [ ] No console.log or debug statements
- [ ] No hardcoded values
- [ ] Types are complete (no `any`)

## Related Issues

Closes #issue_number (if applicable)

---

Generated with Claude Code
EOF
)"
```

---

## PR Description Template

```markdown
## Summary

[One paragraph describing what this PR accomplishes]

## Task Reference

- **Task ID:** [B0.1]
- **Sprint:** [0]
- **Tracker:** [docs/project_notes/sprint-0-tracker.md]

## Changes Made

### Added
- [New files or features]

### Modified
- [Changed files or behavior]

### Removed
- [Deleted files or deprecated features]

## Testing

- [x] Unit tests written and passing
- [x] Integration tests passing (if applicable)
- [x] Manual testing completed
- [x] Validated with production-code-validator

## Screenshots (if UI changes)

| Before | After |
|--------|-------|
| [image] | [image] |

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-reviewed the code
- [ ] Added necessary documentation
- [ ] No console.log or debug statements
- [ ] No hardcoded values
- [ ] Types are complete (no `any`)
- [ ] Tests cover edge cases
- [ ] Error handling is appropriate

## Dependencies

- [ ] Depends on PR #xxx (if applicable)
- [ ] Database migration required
- [ ] Environment variable changes

## Deployment Notes

[Any special instructions for deployment]

## Related Issues

- Closes #xxx
- Related to #xxx

---

Generated with Claude Code
```

---

## PR Review Process

### For the Author

1. **Before requesting review:**
   - Run all tests locally
   - Run `production-code-validator`
   - Review your own changes
   - Ensure PR description is complete

2. **Requesting review:**
   ```bash
   gh pr ready
   gh pr edit --add-reviewer @teammate
   ```

3. **Responding to feedback:**
   - Address all comments
   - Push fixes as new commits (don't force push during review)
   - Re-request review when ready

### For the Reviewer

Use `code-review-specialist` agent for thorough review:

**Review Checklist:**
- [ ] Code is readable and maintainable
- [ ] Logic is correct
- [ ] Tests are adequate
- [ ] No security issues
- [ ] No performance issues
- [ ] Documentation is sufficient
- [ ] Follows project conventions

**Approval criteria:**
- All checklist items satisfied
- No blocking comments
- Tests passing

---

## Merge Process

### Step 1: Ensure All Checks Pass

```bash
gh pr checks
```

### Step 2: Merge Strategy

Use **Squash and Merge** for feature branches:

```bash
gh pr merge --squash
```

Or via GitHub UI:
1. Click "Squash and merge"
2. Edit commit message if needed
3. Confirm merge

### Step 3: Clean Up

```bash
# Delete remote branch (usually automatic)
gh pr close --delete-branch

# Delete local branch
git checkout main
git pull
git branch -d feature/sprint0-B0.1-express-setup
```

### Step 4: Update Sprint Tracker

1. **Update sprint tracker:**
   - Mark task status as Completed
   - Clear "Active Task" section
   - Add entry to "Completion Log" with date, task, commit, notes

---

## PR Naming Convention

Format: `<type>(<scope>): <description>`

**Types:**
| Type | Use For |
|------|---------|
| feat | New feature |
| fix | Bug fix |
| docs | Documentation |
| style | Formatting |
| refactor | Code restructuring |
| test | Tests only |
| chore | Build/config |

**Examples:**
- `feat(auth): implement JWT authentication`
- `fix(cart): resolve quantity update bug`
- `docs(api): update endpoint documentation`
- `refactor(user): extract validation logic`

---

## Handling Merge Conflicts

### Step 1: Update Local Branch

```bash
git checkout main
git pull
git checkout feature/sprint0-B0.1-express-setup
git rebase main
```

### Step 2: Resolve Conflicts

1. Edit conflicted files
2. Mark as resolved: `git add <file>`
3. Continue rebase: `git rebase --continue`

### Step 3: Force Push (Only After Rebase)

```bash
git push --force-with-lease
```

**Warning:** Only force push your own feature branches, never main.

---

## PR Metrics to Track

| Metric | Target |
|--------|--------|
| Time to first review | < 24 hours |
| Time to merge | < 48 hours |
| Review rounds | <= 2 |
| PR size (lines) | < 400 |
