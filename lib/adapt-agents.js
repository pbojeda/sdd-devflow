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
 * v0.17.1: project-type-specific pruning rules for workflow-core files
 * (SKILL.md + ticket-template.md). Keys are POSIX suffixes relative to
 * the tool dir (e.g. `skills/development-workflow/SKILL.md`) so the same
 * rules apply to both `.claude/` and `.gemini/` trees.
 *
 * These rules are the pure/in-memory equivalent of the inline block in
 * `adaptAgentContentForProjectType`. Exposed here so upgrade-generator.js
 * can build an accurate "what init would have produced" comparison target
 * for smart-diff fallback paths — previously this was masked by
 * unconditional `filesToAdapt.add` calls (pre-v0.17.1) that re-applied
 * stack rules to restored user content, violating Codex M1 (Gemini round-3
 * finding 1). Source of truth now lives here; disk-writing code below
 * calls these same tables.
 */
const WORKFLOW_CORE_PROJECT_TYPE_RULES = {
  backend: {
    'skills/development-workflow/SKILL.md': [
      [/,? `ui-components\.md`\)/, ')'],
      [/- UI components → `docs\/specs\/ui-components\.md` \(MANDATORY\)\n/, ''],
      [/\d+\. \*\*Design Review \(optional\):\*\*[^\n]*\n/, ''],
    ],
    'skills/development-workflow/references/ticket-template.md': [
      [/### UI Changes \(if applicable\)\n\n\[Components to add\/modify\. Reference `docs\/specs\/ui-components\.md`\.\]\n\n/, ''],
      [' / `ui-components.md`', ''],
    ],
  },
  frontend: {
    'skills/development-workflow/SKILL.md': [
      [/`api-spec\.yaml`,? /, ''],
      [/- API endpoints → `docs\/specs\/api-spec\.yaml` \(MANDATORY\)\n/, ''],
    ],
    'skills/development-workflow/references/ticket-template.md': [
      [/### API Changes \(if applicable\)\n\n\[Endpoints to add\/modify\. Reference[^\]]*\]\n\n/, ''],
      ['`api-spec.yaml` / ', ''],
    ],
  },
};

const BASE_STANDARDS_PROJECT_TYPE_RULES = {
  backend: [
    [/\| `ui-ux-designer` \|[^\n]*\n/, ''],
  ],
  // frontend: no extra rules (base-standards template has no frontend-only refs to strip)
};

function applyProjectTypeRules(content, rules) {
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
 * v0.17.1 pure helper — apply project-type rules to a workflow-core file
 * content. Returns content unchanged if projectType is fullstack or if
 * posixPath doesn't match a known workflow-core file.
 *
 * @param {string} content - Raw or stack-adapted content
 * @param {string} posixPath - Full POSIX path (e.g. '.claude/skills/development-workflow/SKILL.md')
 * @param {string} projectType - 'fullstack' | 'backend' | 'frontend'
 * @returns {string}
 */
function adaptWorkflowCoreContentForProjectType(content, posixPath, projectType) {
  if (projectType === 'fullstack') return content;
  const rulesForType = WORKFLOW_CORE_PROJECT_TYPE_RULES[projectType];
  if (!rulesForType) return content;

  // Strip the tool prefix (.claude/ or .gemini/) to match the rule key.
  const match = posixPath.match(/^\.(?:claude|gemini)\/(.+)$/);
  if (!match) return content;
  const rules = rulesForType[match[1]];
  if (!rules) return content;

  return applyProjectTypeRules(content, rules);
}

/**
 * v0.17.1 pure helper — apply project-type rules to base-standards.mdc
 * content. Called AFTER `adaptBaseStandards` to produce the full init
 * equivalent for smart-diff comparison.
 */
function adaptBaseStandardsContentForProjectType(content, projectType) {
  const rules = BASE_STANDARDS_PROJECT_TYPE_RULES[projectType];
  if (!rules) return content;
  return applyProjectTypeRules(content, rules);
}

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
  // v0.17.1: SKILL.md + ticket-template.md rules now come from the
  // WORKFLOW_CORE_PROJECT_TYPE_RULES table above so upgrade-generator.js
  // can apply the same rules in-memory (smart-diff fallback comparison).
  // pr-template.md + AGENTS.md + base-standards.mdc remain inline because
  // they're not workflow-core files (pr-template is v0.17.2 scope).
  const wfRules = WORKFLOW_CORE_PROJECT_TYPE_RULES[config.projectType];
  if (wfRules) {
    for (const dir of toolDirs) {
      for (const [suffix, rules] of Object.entries(wfRules)) {
        replaceInFileFn(path.join(dest, dir, ...suffix.split('/')), rules);
      }
    }
  }

  if (config.projectType === 'backend') {
    // AGENTS.md: remove ui-ux-designer from hook description
    replaceInFileFn(path.join(dest, 'AGENTS.md'), [
      [', `ui-ux-designer`', ''],
    ]);
    for (const dir of toolDirs) {
      // pr-template: remove ui-components from checklist (v0.17.2 scope)
      replaceInFileFn(path.join(dest, dir, 'skills', 'development-workflow', 'references', 'pr-template.md'), [
        [' / ui-components.md', ''],
      ]);
    }
    // base-standards.mdc: remove ui-ux-designer table row (shared table above)
    replaceInFileFn(
      path.join(dest, 'ai-specs', 'specs', 'base-standards.mdc'),
      BASE_STANDARDS_PROJECT_TYPE_RULES.backend
    );
  } else if (config.projectType === 'frontend') {
    for (const dir of toolDirs) {
      replaceInFileFn(path.join(dest, dir, 'skills', 'development-workflow', 'references', 'pr-template.md'), [
        ['api-spec.yaml / ', ''],
      ]);
    }
  }
}

module.exports = {
  adaptAgentContentForProjectType,
  adaptAgentContentString,
  adaptWorkflowCoreContentForProjectType,
  adaptBaseStandardsContentForProjectType,
  AGENT_ADAPTATION_RULES,
  WORKFLOW_CORE_PROJECT_TYPE_RULES,
  BASE_STANDARDS_PROJECT_TYPE_RULES,
};
