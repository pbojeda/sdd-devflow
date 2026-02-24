# Pull Request Template

## Target Branch

Read `key_facts.md` → `branching-strategy`:
- **github-flow** → `--base main`
- **gitflow** → `--base develop` (features/bugfixes), `--base main` (releases/hotfixes)

## Create PR

```bash
gh pr create --base main --title "<type>(<scope>): <description>" --body "$(cat <<'EOF'
## Summary

[One paragraph: what this PR does and why]

## Task Reference

- **Task:** [B0.1] | **Sprint:** [0]
- **Ticket:** [docs/tickets/task-id.md]

## Changes

- [Change 1]
- [Change 2]

## Testing

- [x] Unit tests passing
- [x] Integration tests passing (if applicable)
- [x] Validated with production-code-validator

## Checklist

- [ ] Code follows project standards
- [ ] No console.log or debug statements
- [ ] No hardcoded values
- [ ] Types are complete (no `any`)
- [ ] Specs updated (api-spec.yaml / ui-components.md / shared schemas)
- [ ] Documentation updated (if applicable)

## Related Issues

Closes #issue_number (if applicable)

---
Generated with Claude Code
EOF
)"
```

## Merge Strategy

| Branch type | Strategy | Command |
|-------------|----------|---------|
| Features / Bugfixes | Squash and merge | `gh pr merge --squash` |
| Releases / Hotfixes | Merge commit | `gh pr merge --merge` |

## After Merge

```bash
# Delete branch and return to base
gh pr close --delete-branch
# github-flow → git checkout main && git pull
# gitflow → git checkout develop && git pull
```

## Commit Types

feat, fix, docs, style, refactor, test, chore

## Merge Conflicts

```bash
git checkout main && git pull
git checkout <feature-branch>
git rebase main
# Resolve conflicts → git add <file> → git rebase --continue
git push --force-with-lease  # Only on your own feature branches
```
