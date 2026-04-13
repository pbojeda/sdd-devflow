'use strict';

/**
 * SDD DevFlow stack-specific adaptations — shared module (v0.17.0+).
 *
 * Extracted from lib/init-generator.js `adaptCopiedFiles` in v0.17.0 so
 * the upgrade path can re-apply the same transformations after a
 * hash-based smart-diff replacement. Previously init-generator.js ran
 * these adaptations on install but upgrade-generator.js did not, so an
 * init'd project upgrading would lose its stack customizations — the
 * cross-path drift discovered during v0.16.10 implementation.
 *
 * Public API:
 *
 *   applyStackAdaptations(dest, scan, config, allowlist = null)
 *     → walks the filesystem, applies adaptation rules to each file in
 *       the candidate set, respects the allowlist (upgrade path uses
 *       this to avoid touching preserved user-edited files). Returns the
 *       list of POSIX relative paths that were touched.
 *
 *   applyStackAdaptationsToContent(content, posixRelativePath, scan, config)
 *     → pure, in-memory variant. Returns the adapted content for a
 *       single file. Used by upgrade-generator.js's FALLBACK path
 *       (when .sdd-meta.json is missing) to construct the "what init
 *       would have written" comparison target. This is critical for
 *       pre-v0.17.0 --init projects on their first v0.17.0 upgrade
 *       (Gemini M1 fix from plan v1.0 review).
 *
 * Idempotency invariant: every rule's source pattern MUST NOT appear in
 * its own replacement value. The current rules satisfy this because they
 * replace literal template strings like "Prisma ORM, and PostgreSQL"
 * with "Mongoose, and MongoDB" — the source no longer appears after one
 * pass. Verified by smoke scenario 56 (run every rule twice, assert
 * second application is a no-op).
 *
 * Ordering: some rules run in phases. Phase 1 ("Zod data schemas" →
 * "validation schemas") MUST run before phase 2 ("validation schemas in
 * `shared/src/schemas/`" → "validation schemas") because phase 2's
 * source depends on phase 1's replacement having happened. The rule
 * arrays preserve this ordering; callers must apply them in sequence
 * per file.
 */

const fs = require('node:fs');
const path = require('node:path');

const { toPosix } = require('./meta');

/**
 * Compute the ordered list of [from, to] replacement rules for a given
 * (file, scan, config). Rules are pure data — no filesystem access.
 *
 * Returns null if this file has no adaptations for the given project
 * state (e.g., a Zod project's backend-developer.md needs no Zod
 * substitutions).
 *
 * The rules here mirror the imperative body of the original
 * lib/init-generator.js adaptCopiedFiles function. Extracting them into
 * a data-driven table allows both file-based and in-memory application.
 */
function computeRulesFor(posixRelativePath, scan, config) {
  const backend = scan.backend || {};
  const orm = backend.orm || 'your ORM';
  const db = backend.db || 'your database';
  const validation = backend.validation;
  const structure = scan.srcStructure || {};
  const arch = structure.pattern || 'ddd';

  // Phase 1: Zod → generic validation (applies only when validation !== 'Zod').
  const zodReplacements = [
    ['Zod data schemas', 'validation schemas'],
    ['Zod schemas', 'validation schemas'],
  ];

  // Phase 2: shared/src/schemas/ path cleanup. Applied AFTER phase 1, so
  // these match the post-replacement text.
  const schemaPathReplacements = [
    ['validation schemas in `shared/src/schemas/` if applicable', 'validation schemas if applicable'],
    ['validation schemas in `shared/src/schemas/` (if shared workspace exists)', 'validation schemas (if shared workspace exists)'],
    ['validation schemas in `shared/src/schemas/`', 'validation schemas'],
    ['validation schemas (`shared/src/schemas/`)', 'validation schemas'],
    ['`shared/src/schemas/` (if exists) for current validation schemas', 'project validation schemas'],
    // Gemini spec-creator: no "Zod" prefix, standalone path reference
    ['and `shared/src/schemas/` (if exists)', ''],
    ['schemas vs `shared/src/schemas/`', 'validation schemas up to date'],
  ];

  // ORM/DB replacements for backend agents. Only apply when the detected
  // ORM differs from Prisma (the template default) OR no ORM was
  // detected at all (replace with generic text).
  let ormReplacements = [];
  if (backend.orm && backend.orm !== 'Prisma') {
    ormReplacements = [
      ['Prisma ORM, and PostgreSQL', `${orm}${db !== 'your database' ? `, and ${db}` : ''}`],
      ['Repository implementations (Prisma)', `Repository implementations (${orm})`],
    ];
  } else if (!backend.orm) {
    const dbLabel = db !== 'your database' ? `, and ${db}` : '';
    ormReplacements = [
      ['Prisma ORM, and PostgreSQL', dbLabel ? dbLabel.slice(6) : 'your database'],
      ['Repository implementations (Prisma)', 'Repository implementations'],
    ];
  }

  // Architecture (DDD → layered) replacements, applied to backend agents
  // when the detected structure is NOT DDD.
  const archReplacementsBackendPlanner = (arch !== 'ddd') ? [
    ['specializing in Domain-Driven Design (DDD) layered architecture with deep knowledge of',
      'specializing in layered architecture with deep knowledge of'],
    ['(DDD architecture)', '(layered architecture)'],
    [/\d+\. Read `shared\/src\/schemas\/` \(if exists\) for current .* (?:data )?schemas\n/, ''],
    [/\d+\. Explore existing domain entities, services, validators, repositories\n/,
      '5. Explore the codebase for existing patterns, layer structure, and reusable code\n'],
    [/\d+\. Explore `backend\/src\/infrastructure\/` for existing repositories\n/, ''],
    ['following DDD layer order: Domain > Application > Infrastructure > Presentation > Tests',
      'following the layer order defined in backend-standards.mdc'],
    ['Implementation Order (Domain > Application > Infrastructure > Presentation > Tests)',
      'Implementation Order (see backend-standards.mdc for layer order)'],
    ['Follow DDD layer separation: Domain > Application > Infrastructure > Presentation',
      'Follow the layer separation defined in backend-standards.mdc'],
  ] : [];

  const archReplacementsBackendDeveloper = (arch !== 'ddd') ? [
    ['follows DDD layered architecture', 'follows layered architecture'],
    ['specializing in Domain-Driven Design (DDD) with', 'specializing in layered architecture with'],
    ['(DDD architecture)', '(layered architecture)'],
    [/\d+\. Read `shared\/src\/schemas\/` \(if exists\) for current .* (?:data )?schemas\n/, ''],
    ['Follow the DDD layer order from the plan:',
      'Follow the layer order from the plan (see backend-standards.mdc for project layers):'],
    [/\d+\. \*\*Domain Layer\*\*: Entities, value objects, repository interfaces, domain errors\n/,
      '1. **Data Layer**: Models, database operations, data access\n'],
    [/\d+\. \*\*Application Layer\*\*: Services, validators, DTOs\n/,
      '2. **Business Logic Layer**: Controllers, services, external integrations\n'],
    [/\d+\. \*\*Infrastructure Layer\*\*: Repository implementations \([^)]*\), external integrations\n/,
      '3. **Presentation Layer**: Routes, handlers, middleware\n'],
    [/\d+\. \*\*Presentation Layer\*\*: Controllers, routes, middleware\n/,
      '4. **Integration Layer**: Wiring, configuration, server registration\n'],
    ['Follow DDD layer order: Domain > Application > Infrastructure > Presentation.',
      'Follow the layer order defined in backend-standards.mdc.'],
    ['**ALWAYS** follow DDD layer separation',
      '**ALWAYS** follow the layer separation defined in backend-standards.mdc'],
    ['**ALWAYS** handle errors with custom domain error classes',
      '**ALWAYS** handle errors following the patterns in backend-standards.mdc'],
    ['ALWAYS handle errors with domain error classes',
      'ALWAYS handle errors following the patterns in backend-standards.mdc'],
    [/- (?:\*\*MANDATORY\*\*: )?If modifying a DB schema → update .* schemas in `shared\/src\/schemas\/` BEFORE continuing\n/, ''],
  ] : [];

  // Dispatch table keyed by the file's POSIX path suffix.
  const isBackendAgent =
    posixRelativePath.endsWith('/agents/backend-developer.md') ||
    posixRelativePath.endsWith('/agents/backend-planner.md');
  const isMultiPurposeAgent =
    posixRelativePath.endsWith('/agents/spec-creator.md') ||
    posixRelativePath.endsWith('/agents/production-code-validator.md') ||
    posixRelativePath.endsWith('/agents/database-architect.md');
  const isWorkflowSkill =
    posixRelativePath.endsWith('/skills/development-workflow/SKILL.md') ||
    posixRelativePath.endsWith('/skills/development-workflow/references/ticket-template.md');

  // Accumulate rules for this file in the correct order.
  const rules = [];

  if (isBackendAgent) {
    if (validation !== 'Zod') {
      rules.push(...zodReplacements);
      rules.push(...ormReplacements);
      rules.push(...schemaPathReplacements);
    } else if (ormReplacements.length > 0) {
      rules.push(...ormReplacements);
    }
    // Architecture adaptations run after ORM/Zod.
    if (posixRelativePath.endsWith('/agents/backend-planner.md')) {
      rules.push(...archReplacementsBackendPlanner);
    } else if (posixRelativePath.endsWith('/agents/backend-developer.md')) {
      rules.push(...archReplacementsBackendDeveloper);
    }
  } else if (isMultiPurposeAgent) {
    if (validation !== 'Zod') {
      rules.push(...zodReplacements);
      rules.push(...schemaPathReplacements);
    }
  } else if (isWorkflowSkill) {
    if (validation !== 'Zod') {
      rules.push(...zodReplacements);
      rules.push(...schemaPathReplacements);
    }
  }

  return rules.length > 0 ? rules : null;
}

/**
 * Apply an ordered list of [from, to] rules to a content string.
 * Strings are replaced with `.replaceAll` (all occurrences). Regexes are
 * replaced with `.replace` (respects the regex's own flags — `g` for
 * global, absent for first-occurrence; the current rule set uses regexes
 * without `g` because they target unique structural lines).
 */
function applyRulesToContent(content, rules) {
  let result = content;
  for (const [from, to] of rules) {
    if (from instanceof RegExp) {
      result = result.replace(from, to);
    } else {
      result = result.replaceAll(from, to);
    }
  }
  return result;
}

/**
 * Pure, in-memory stack adaptation. Returns the adapted content.
 * Zero filesystem I/O. Safe to call repeatedly on the same input
 * (idempotent by rule design).
 *
 * @param {string} content - Raw file content
 * @param {string} posixRelativePath - e.g. ".claude/agents/backend-developer.md"
 * @param {object} scan
 * @param {object} config
 * @returns {string}
 */
function applyStackAdaptationsToContent(content, posixRelativePath, scan, config) {
  const rules = computeRulesFor(posixRelativePath, scan, config);
  if (!rules) return content;
  return applyRulesToContent(content, rules);
}

/**
 * Candidate file list for stack adaptations. Mirrors the files touched
 * by the original adaptCopiedFiles. Only files that exist on disk are
 * returned.
 */
function candidateFilesFor(dest, aiTools, projectType) {
  const toolDirs = [];
  if (aiTools !== 'gemini') toolDirs.push('.claude');
  if (aiTools !== 'claude') toolDirs.push('.gemini');

  const results = [];

  for (const dir of toolDirs) {
    // Backend agents
    results.push(`${dir}/agents/backend-developer.md`);
    results.push(`${dir}/agents/backend-planner.md`);
    // Multi-purpose agents
    results.push(`${dir}/agents/spec-creator.md`);
    results.push(`${dir}/agents/production-code-validator.md`);
    results.push(`${dir}/agents/database-architect.md`);
    // Workflow skill files
    results.push(`${dir}/skills/development-workflow/SKILL.md`);
    results.push(`${dir}/skills/development-workflow/references/ticket-template.md`);
  }

  // Filter by on-disk presence AND by project-type (single-stack
  // projects may have pruned backend-* files).
  return results.filter((posixPath) => {
    const absPath = path.join(dest, ...posixPath.split('/'));
    return fs.existsSync(absPath);
  });
}

/**
 * Apply stack adaptations to files on disk.
 *
 * @param {string} dest - Project root
 * @param {object} scan - scan() result
 * @param {object} config - { projectType, aiTools, ... }
 * @param {Set<string>|null} allowlist - POSIX paths permitted to be
 *   touched. If null, all candidate files are touched (install path).
 *   If a Set, only files whose POSIX path is IN the Set are touched
 *   (upgrade path — prevents running adaptations on preserved user
 *   files).
 * @returns {string[]} POSIX relative paths that were touched (whether
 *   their content actually changed or not — callers should re-hash them)
 */
function applyStackAdaptations(dest, scan, config, allowlist = null) {
  const touched = [];
  const candidates = candidateFilesFor(dest, config.aiTools, config.projectType);

  for (const posixPath of candidates) {
    if (allowlist !== null && !allowlist.has(posixPath)) continue;
    const absPath = path.join(dest, ...posixPath.split('/'));
    let content;
    try {
      content = fs.readFileSync(absPath, 'utf8');
    } catch {
      continue;
    }
    const adapted = applyStackAdaptationsToContent(content, posixPath, scan, config);
    if (adapted !== content) {
      try {
        fs.writeFileSync(absPath, adapted, 'utf8');
      } catch (e) {
        console.warn(`    ⚠ Failed to write stack-adapted ${posixPath}: ${e.code || e.message}`);
        continue;
      }
    }
    touched.push(posixPath);
  }

  // Non-agent adaptations: documentation-standards.mdc is project-type-
  // driven, not stack-driven. Keeps its own imperative branch here.
  const docStdRelative = 'ai-specs/specs/documentation-standards.mdc';
  const docStdPath = path.join(dest, docStdRelative);
  if (
    fs.existsSync(docStdPath) &&
    (allowlist === null || allowlist.has(docStdRelative))
  ) {
    try {
      let content = fs.readFileSync(docStdPath, 'utf8');
      if (config.projectType === 'backend') {
        content = content.replace(/\| `ai-specs\/specs\/frontend-standards\.mdc` \|[^\n]*\n/, '');
        content = content.replace(/\| `docs\/specs\/ui-components\.md` \|[^\n]*\n/, '');
        content = content.replace(/   - UI component changes → `docs\/specs\/ui-components\.md`\n/, '');
      } else if (config.projectType === 'frontend') {
        content = content.replace(/\| `ai-specs\/specs\/backend-standards\.mdc` \|[^\n]*\n/, '');
        content = content.replace(/\| `docs\/specs\/api-spec\.yaml` \|[^\n]*\n/, '');
      }
      fs.writeFileSync(docStdPath, content, 'utf8');
      touched.push(docStdRelative);
    } catch (e) {
      console.warn(`    ⚠ Failed to adapt documentation-standards.mdc: ${e.code || e.message}`);
    }
  }

  return touched;
}

module.exports = {
  applyStackAdaptations,
  applyStackAdaptationsToContent,
  computeRulesFor,
  applyRulesToContent,
  candidateFilesFor,
};
