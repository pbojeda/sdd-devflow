'use strict';

const path = require('path');

/**
 * Per-agent-file adaptation rules for single-stack projects.
 *
 * For each projectType ('backend' or 'frontend'), maps filename to a list of
 * [search, replace] tuples applied in order. When `search` is a RegExp, uses
 * .replace(); when it's a string, uses split/join to replace all occurrences.
 *
 * These rules ONLY apply to files under .claude/agents/ or .gemini/agents/.
 * Skill and template file adaptations live in the I/O wrapper below because
 * they don't need the pure function (they're not used by upgrade smart-diff).
 *
 * fullstack projectType has no rules — templates ship in fullstack-ready form.
 */
const AGENT_ADAPTATION_RULES = {
  backend: {
    'spec-creator.md': [
      [/### Frontend Specifications\n(?:- [^\n]*\n)+\n/, ''],
      [/### For UI Changes\n```markdown\n(?:[^\n]*\n)*?```\n\n/, ''],
      ['Data Model Changes, UI Changes, Edge Cases', 'Data Model Changes, Edge Cases'],
      ['(`api-spec.yaml`, `ui-components.md`)', '(`api-spec.yaml`)'],
      // Gemini agents have different text patterns (also applied to Claude; no-op if no match):
      [/\(api-spec\.yaml, ui-components\.md\)/, '(api-spec.yaml)'],
    ],
    'production-code-validator.md': [
      [/- Components exported\/used that are NOT listed in `docs\/specs\/ui-components\.md`\n/, ''],
      [/,? components not in ui-components\.md/, ''],
      [/\.? ?Check components vs `ui-components\.md`/, ''],
    ],
    'code-review-specialist.md': [
      ['(`backend-standards.mdc` / `frontend-standards.mdc`)', '(`backend-standards.mdc`)'],
      ['(`api-spec.yaml`, `ui-components.md`)', '(`api-spec.yaml`)'],
    ],
    'qa-engineer.md': [
      ['(`api-spec.yaml`, `ui-components.md`)', '(`api-spec.yaml`)'],
      [/- Frontend: `cd frontend && npm test`\n/, ''],
      [/- \*\*Frontend\*\*: Write tests for error states[^\n]*\n/, ''],
      ['`backend-standards.mdc` / `frontend-standards.mdc`', '`backend-standards.mdc`'],
      ['`backend-standards.mdc` and/or `frontend-standards.mdc`', '`backend-standards.mdc`'],
      [/ and\/or `(?:ai-specs\/specs\/)?frontend-standards\.mdc`/, ''],
    ],
  },
  frontend: {
    'spec-creator.md': [
      [/### Backend Specifications\n(?:- [^\n]*\n)+\n/, ''],
      [/### For API Changes\n```yaml\n(?:[^\n]*\n)*?```\n\n/, ''],
      ['(`api-spec.yaml`, `ui-components.md`)', '(`ui-components.md`)'],
      [/\(api-spec\.yaml, ui-components\.md\)/, '(ui-components.md)'],
    ],
    'code-review-specialist.md': [
      ['(`backend-standards.mdc` / `frontend-standards.mdc`)', '(`frontend-standards.mdc`)'],
      ['(`api-spec.yaml`, `ui-components.md`)', '(`ui-components.md`)'],
    ],
    'qa-engineer.md': [
      ['(`api-spec.yaml`, `ui-components.md`)', '(`ui-components.md`)'],
      [/- Backend: `cd backend && npm test`\n/, ''],
      [/- \*\*Backend\*\*: Write tests for error paths[^\n]*\n/, ''],
      ['`backend-standards.mdc` / `frontend-standards.mdc`', '`frontend-standards.mdc`'],
      ['`backend-standards.mdc` and/or `frontend-standards.mdc`', '`frontend-standards.mdc`'],
      [/`(?:ai-specs\/specs\/)?backend-standards\.mdc` and\/or /, ''],
    ],
  },
};

/**
 * Pure function — apply single-stack adaptation rules to an agent file's content.
 *
 * Used by both the I/O wrapper below AND by upgrade-generator.js smart-diff
 * (v0.16.10+) to compute what the "pristine adapted target" should be for a
 * given (rawTemplate, filename, projectType) tuple. The smart-diff compares
 * the user's current file against this value — if they match, the user hasn't
 * customized and the upgrade can safely replace.
 *
 * @param {string} content - Raw template content
 * @param {string} filename - Agent file basename (e.g. 'spec-creator.md')
 * @param {string} projectType - 'fullstack' | 'backend' | 'frontend'
 * @returns {string} - Adapted content (or unchanged if no rules apply)
 */
function adaptAgentContentString(content, filename, projectType) {
  if (projectType === 'fullstack') return content;

  const rulesForType = AGENT_ADAPTATION_RULES[projectType];
  if (!rulesForType) return content;

  const rules = rulesForType[filename];
  if (!rules) return content;

  let result = content;
  for (const [search, replace] of rules) {
    if (search instanceof RegExp) {
      result = result.replace(search, replace);
    } else {
      result = result.split(search).join(replace);
    }
  }
  return result;
}

/**
 * Shared agent/skill content adaptation for single-stack projects.
 * Used by both generator.js (new projects) and init-generator.js (--init).
 *
 * As of v0.16.10, delegates per-agent-file transformations to the pure
 * adaptAgentContentString() function so upgrade-generator.js smart-diff can
 * share the same rules. Skill and template file adaptations (SKILL.md,
 * ticket-template.md, pr-template.md, AGENTS.md ui-ux-designer removal,
 * base-standards.mdc cleanup) remain inline because they're not needed by
 * smart-diff.
 *
 * @param {string} dest - Destination directory
 * @param {object} config - Config with projectType and aiTools
 * @param {function} replaceInFileFn - Function(filePath, replacements) to perform replacements
 */
function adaptAgentContentForProjectType(dest, config, replaceInFileFn) {
  const toolDirs = [];
  if (config.aiTools !== 'gemini') toolDirs.push('.claude');
  if (config.aiTools !== 'claude') toolDirs.push('.gemini');

  // --- Agent file adaptations (delegate to pure function) ---
  const rulesForType = AGENT_ADAPTATION_RULES[config.projectType];
  if (rulesForType) {
    for (const dir of toolDirs) {
      for (const [filename, rules] of Object.entries(rulesForType)) {
        replaceInFileFn(path.join(dest, dir, 'agents', filename), rules);
      }
    }
  }

  // --- Skills and templates: remove frontend/backend-specific references ---
  // These stay inline — they're not agent files, so not needed by upgrade smart-diff.
  if (config.projectType === 'backend') {
    for (const dir of toolDirs) {
      // SKILL.md: remove ui-components references and design review step
      replaceInFileFn(path.join(dest, dir, 'skills', 'development-workflow', 'SKILL.md'), [
        [/,? `ui-components\.md`\)/, ')'],
        [/- UI components → `docs\/specs\/ui-components\.md` \(MANDATORY\)\n/, ''],
        [/\d+\. \*\*Design Review \(optional\):\*\*[^\n]*\n/, ''],
      ]);
      // AGENTS.md: remove ui-ux-designer from hook description
      replaceInFileFn(path.join(dest, 'AGENTS.md'), [
        [', `ui-ux-designer`', ''],
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
    // Shared files (outside tool dirs): remove ui-ux-designer and design-guidelines refs
    replaceInFileFn(path.join(dest, 'ai-specs', 'specs', 'base-standards.mdc'), [
      [/\| `ui-ux-designer` \|[^\n]*\n/, ''],
    ]);
  } else if (config.projectType === 'frontend') {
    for (const dir of toolDirs) {
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

module.exports = {
  adaptAgentContentForProjectType,
  adaptAgentContentString,
  AGENT_ADAPTATION_RULES,
};
