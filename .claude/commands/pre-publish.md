Review all uncommitted and recently committed changes in the SDD DevFlow library before npm publish.

## Step 1: Code Review (as code-review-specialist)

- Review all changes since the last published version (check git tags for latest)
- Verify JSON validity of all template settings files
- Verify Claude/Gemini template symmetry (SKILL.md, agents, settings)
- Check for regressions: do changes break existing behavior?
- Check for security issues (credentials, unsafe commands, injection risks)
- Verify upgrade flow handles new changes correctly (lib/upgrade-generator.js)

## Step 2: QA (as qa-engineer)

- Run `npm test` — all 32 scenarios must pass
- Verify CHANGELOG.md has entries for all new versions since last publish
- Verify package.json version matches CHANGELOG
- Check comparison links at bottom of CHANGELOG.md
- Verify no files are accidentally included/excluded from npm package

## Step 3: If everything passes

1. Commit all pending changes (if any) with descriptive message
2. Tag the version: `git tag v<version>`
3. Push: `git push origin main && git push origin main --tags`
4. Tell the user to run `npm publish`
5. Provide the upgrade command for foodXPlorer:
   ```
   npx create-sdd-project@<version> --upgrade --force --yes
   ```

## Step 4: If issues found

Report them clearly. Do NOT commit, tag, or push until issues are resolved.
