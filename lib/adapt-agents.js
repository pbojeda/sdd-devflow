'use strict';

const path = require('path');

/**
 * Shared agent/skill content adaptation for single-stack projects.
 * Used by both generator.js (new projects) and init-generator.js (--init).
 *
 * @param {string} dest - Destination directory
 * @param {object} config - Config with projectType and aiTools
 * @param {function} replaceInFileFn - Function(filePath, replacements) to perform replacements
 */
function adaptAgentContentForProjectType(dest, config, replaceInFileFn) {
  const toolDirs = [];
  if (config.aiTools !== 'gemini') toolDirs.push('.claude');
  if (config.aiTools !== 'claude') toolDirs.push('.gemini');

  if (config.projectType === 'backend') {
    for (const dir of toolDirs) {
      // spec-creator: remove Frontend Specifications section and UI output format
      replaceInFileFn(path.join(dest, dir, 'agents', 'spec-creator.md'), [
        [/### Frontend Specifications\n(?:- [^\n]*\n)+\n/, ''],
        [/### For UI Changes\n```markdown\n(?:[^\n]*\n)*?```\n\n/, ''],
        ['Data Model Changes, UI Changes, Edge Cases', 'Data Model Changes, Edge Cases'],
      ]);
      // production-code-validator: remove ui-components line from Spec Drift
      replaceInFileFn(path.join(dest, dir, 'agents', 'production-code-validator.md'), [
        [/- Components exported\/used that are NOT listed in `docs\/specs\/ui-components\.md`\n/, ''],
      ]);
      // code-review-specialist: backend-only standards ref, remove ui-components
      replaceInFileFn(path.join(dest, dir, 'agents', 'code-review-specialist.md'), [
        ['(`backend-standards.mdc` / `frontend-standards.mdc`)', '(`backend-standards.mdc`)'],
        ['(`api-spec.yaml`, `ui-components.md`)', '(`api-spec.yaml`)'],
      ]);
      // qa-engineer: remove frontend refs, adapt standards refs
      replaceInFileFn(path.join(dest, dir, 'agents', 'qa-engineer.md'), [
        ['(`api-spec.yaml`, `ui-components.md`)', '(`api-spec.yaml`)'],
        [/- Frontend: `cd frontend && npm test`\n/, ''],
        [/- \*\*Frontend\*\*: Write tests for error states[^\n]*\n/, ''],
        ['`backend-standards.mdc` / `frontend-standards.mdc`', '`backend-standards.mdc`'],
        ['`backend-standards.mdc` and/or `frontend-standards.mdc`', '`backend-standards.mdc`'],
        [/ and\/or `(?:ai-specs\/specs\/)?frontend-standards\.mdc`/, ''],
      ]);
    }
  } else if (config.projectType === 'frontend') {
    for (const dir of toolDirs) {
      // spec-creator: remove Backend Specifications section
      replaceInFileFn(path.join(dest, dir, 'agents', 'spec-creator.md'), [
        [/### Backend Specifications\n(?:- [^\n]*\n)+\n/, ''],
        [/### For API Changes\n```yaml\n(?:[^\n]*\n)*?```\n\n/, ''],
      ]);
      // code-review-specialist: frontend-only standards ref
      replaceInFileFn(path.join(dest, dir, 'agents', 'code-review-specialist.md'), [
        ['(`backend-standards.mdc` / `frontend-standards.mdc`)', '(`frontend-standards.mdc`)'],
        ['(`api-spec.yaml`, `ui-components.md`)', '(`ui-components.md`)'],
      ]);
      // qa-engineer: remove backend refs, adapt standards refs
      replaceInFileFn(path.join(dest, dir, 'agents', 'qa-engineer.md'), [
        ['(`api-spec.yaml`, `ui-components.md`)', '(`ui-components.md`)'],
        [/- Backend: `cd backend && npm test`\n/, ''],
        [/- \*\*Backend\*\*: Write tests for error paths[^\n]*\n/, ''],
        ['`backend-standards.mdc` / `frontend-standards.mdc`', '`frontend-standards.mdc`'],
        ['`backend-standards.mdc` and/or `frontend-standards.mdc`', '`frontend-standards.mdc`'],
        [/`(?:ai-specs\/specs\/)?backend-standards\.mdc` and\/or /, ''],
      ]);
    }
  }

  // Skills and templates: remove frontend/backend-specific references
  if (config.projectType === 'backend') {
    for (const dir of toolDirs) {
      // Gemini agents have different text patterns for spec-creator
      replaceInFileFn(path.join(dest, dir, 'agents', 'spec-creator.md'), [
        [/\(api-spec\.yaml, ui-components\.md\)/, '(api-spec.yaml)'],
        ['Data Model Changes, UI Changes, Edge Cases', 'Data Model Changes, Edge Cases'],
      ]);
      replaceInFileFn(path.join(dest, dir, 'agents', 'production-code-validator.md'), [
        [/,? components not in ui-components\.md/, ''],
        [/\.? ?Check components vs `ui-components\.md`/, ''],
      ]);
      // SKILL.md: remove ui-components references
      replaceInFileFn(path.join(dest, dir, 'skills', 'development-workflow', 'SKILL.md'), [
        [/,? `ui-components\.md`\)/, ')'],
        [/- UI components → `docs\/specs\/ui-components\.md` \(MANDATORY\)\n/, ''],
      ]);
      // ticket-template: remove UI Changes section, ui-components from checklists
      replaceInFileFn(path.join(dest, dir, 'skills', 'development-workflow', 'references', 'ticket-template.md'), [
        [/### UI Changes \(if applicable\)\n\n\[Components to add\/modify\. Reference `docs\/specs\/ui-components\.md`\.\]\n\n/, ''],
        [' / `ui-components.md`', ''],
      ]);
      // pr-template: remove ui-components from checklist
      replaceInFileFn(path.join(dest, dir, 'skills', 'development-workflow', 'references', 'pr-template.md'), [
        [' / ui-components.md', ''],
      ]);
    }
  } else if (config.projectType === 'frontend') {
    for (const dir of toolDirs) {
      replaceInFileFn(path.join(dest, dir, 'agents', 'spec-creator.md'), [
        [/\(api-spec\.yaml, ui-components\.md\)/, '(ui-components.md)'],
      ]);
      replaceInFileFn(path.join(dest, dir, 'skills', 'development-workflow', 'SKILL.md'), [
        [/`api-spec\.yaml`,? /, ''],
        [/- API endpoints → `docs\/specs\/api-spec\.yaml` \(MANDATORY\)\n/, ''],
      ]);
      replaceInFileFn(path.join(dest, dir, 'skills', 'development-workflow', 'references', 'ticket-template.md'), [
        [/### API Changes \(if applicable\)\n\n\[Endpoints to add\/modify\. Reference[^\]]*\]\n\n/, ''],
        ['`api-spec.yaml` / ', ''],
      ]);
      replaceInFileFn(path.join(dest, dir, 'skills', 'development-workflow', 'references', 'pr-template.md'), [
        ['api-spec.yaml / ', ''],
      ]);
    }
  }
}

module.exports = { adaptAgentContentForProjectType };
