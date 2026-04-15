'use strict';

const fs = require('fs');
const path = require('path');
const {
  FRONTEND_AGENTS,
  BACKEND_AGENTS,
  TEMPLATE_AGENTS,
} = require('./config');
const {
  adaptBaseStandards,
  adaptBackendStandards,
  adaptFrontendStandards,
} = require('./init-generator');
const {
  getPackageVersion,
} = require('./upgrade-generator');
const { normalizedContentEquals } = require('./meta');
const { formatScanSummary } = require('./init-wizard');

// v0.17.1: isStandardModified was removed. Replace callers with inverted
// normalizedContentEquals — "modified" means "not equal after normalization".
function isStandardModified(existing, fresh) {
  return !normalizedContentEquals(existing, fresh);
}

const templateDir = path.join(__dirname, '..', 'template');

/**
 * Count files recursively in a directory.
 */
function countFiles(dir) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      count += countFiles(path.join(dir, entry.name));
    } else {
      count++;
    }
  }
  return count;
}

/**
 * Compute how many agents would be kept after project-type filtering.
 */
function countAgents(projectType) {
  const all = TEMPLATE_AGENTS.length; // 9
  if (projectType === 'backend') return all - FRONTEND_AGENTS.length;
  if (projectType === 'frontend') return all - BACKEND_AGENTS.length;
  return all;
}

/**
 * Compute how many standards would be created for a project type.
 * base + documentation + backend (if not frontend) + frontend (if not backend)
 */
function countStandards(projectType) {
  let count = 2; // base + documentation
  if (projectType !== 'frontend') count++; // backend
  if (projectType !== 'backend') count++; // frontend
  return count;
}

// ── Init Diff ────────────────────────────────────────────────

function runInitDiffReport(config) {
  const dest = config.projectDir;
  const scan = config.scanResult;
  const projectType = config.projectType;
  const aiTools = config.aiTools;

  const lines = [];
  lines.push('\n🔍 SDD DevFlow — Preview (--init)\n');

  // Detected stack
  lines.push('  Detected stack:');
  lines.push(formatScanSummary(scan));
  lines.push('');

  // Compute what would be created
  const wouldCreate = [];

  // AI tool directories
  const agentCount = countAgents(projectType);
  const removedAgents = TEMPLATE_AGENTS.length - agentCount;

  if (aiTools !== 'gemini') {
    const claudeSkills = countFiles(path.join(templateDir, '.claude', 'skills'));
    wouldCreate.push(`  .claude/agents/             ${agentCount} agents${removedAgents > 0 ? ` (${removedAgents} removed: ${projectType}-only)` : ''}`);
    wouldCreate.push(`  .claude/skills/             ${claudeSkills} files (5 skills)`);
    wouldCreate.push('  .claude/hooks/              quick-scan.sh');
    wouldCreate.push('  .claude/settings.json');
    wouldCreate.push('  .claude/commands/           .gitkeep');
  }

  if (aiTools !== 'claude') {
    const geminiSkills = countFiles(path.join(templateDir, '.gemini', 'skills'));
    const geminiCmds = countFiles(path.join(templateDir, '.gemini', 'commands'));
    wouldCreate.push(`  .gemini/agents/             ${agentCount} agents${removedAgents > 0 ? ` (${removedAgents} removed: ${projectType}-only)` : ''}`);
    wouldCreate.push(`  .gemini/skills/             ${geminiSkills} files (5 skills)`);
    wouldCreate.push(`  .gemini/commands/           ${geminiCmds} commands`);
    wouldCreate.push('  .gemini/styles/             default.md');
    wouldCreate.push('  .gemini/settings.json');
  }

  // Standards
  const stdCount = countStandards(projectType);
  const stdDetails = ['base-standards'];
  if (projectType !== 'frontend') stdDetails.push('backend-standards');
  if (projectType !== 'backend') stdDetails.push('frontend-standards');
  stdDetails.push('documentation-standards');
  wouldCreate.push(`  ai-specs/specs/             ${stdCount} standards (${stdDetails.join(', ')})`);

  // Docs
  wouldCreate.push('  docs/project_notes/         4 files (bugs, decisions, key_facts, product-tracker)');
  const specFiles = [];
  if (projectType !== 'frontend') specFiles.push('api-spec.yaml');
  if (projectType !== 'backend') specFiles.push('ui-components.md');
  if (specFiles.length > 0) {
    wouldCreate.push(`  docs/specs/                 ${specFiles.join(', ')}`);
  }
  wouldCreate.push('  docs/tickets/               .gitkeep');

  // Top-level files
  wouldCreate.push('  AGENTS.md');
  if (aiTools !== 'gemini') wouldCreate.push('  CLAUDE.md');
  if (aiTools !== 'claude') wouldCreate.push('  GEMINI.md');
  wouldCreate.push('  .env.example');
  wouldCreate.push('  .github/workflows/ci.yml');
  wouldCreate.push('  .sdd-version');

  lines.push(`  Would create (${wouldCreate.length} items):`);
  for (const item of wouldCreate) {
    lines.push(`    + ${item.trim()}`);
  }

  // .gitignore handling
  const gitignorePath = path.join(dest, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    lines.push('\n  Would modify:');
    lines.push('    ~ .gitignore                append SDD entries');
  } else {
    lines.push('\n  Would create:');
    lines.push('    + .gitignore                with SDD entries');
  }

  lines.push('\n  No files deleted. Run without --diff to apply.\n');

  console.log(lines.join('\n'));
}

// ── Upgrade Diff ─────────────────────────────────────────────

function runUpgradeDiffReport(config, state) {
  const dest = config.projectDir;
  const scan = config.scanResult;
  const projectType = config.projectType;
  const aiTools = config.aiTools;

  const lines = [];
  lines.push('\n🔍 SDD DevFlow — Preview (--upgrade)\n');
  lines.push(`  ${state.installedVersion} → ${state.packageVersion}\n`);

  // Would replace
  const replaceItems = [];

  if (aiTools !== 'gemini') {
    const agentCount = countAgents(projectType);
    replaceItems.push(`.claude/agents/             ${agentCount} agents`);
    replaceItems.push('.claude/skills/             5 skills');
    replaceItems.push('.claude/hooks/              quick-scan.sh');
    replaceItems.push('.claude/settings.json       hooks updated, permissions preserved');
  }
  if (aiTools !== 'claude') {
    const agentCount = countAgents(projectType);
    replaceItems.push(`.gemini/agents/             ${agentCount} agents`);
    replaceItems.push('.gemini/skills/             5 skills');
    replaceItems.push('.gemini/commands/           TOML commands');
    replaceItems.push('.gemini/styles/             default.md');
    replaceItems.push('.gemini/settings.json');
  }
  replaceItems.push('AGENTS.md');
  if (aiTools !== 'gemini') replaceItems.push('CLAUDE.md');
  if (aiTools !== 'claude') replaceItems.push('GEMINI.md');
  replaceItems.push('.env.example                custom vars preserved');
  replaceItems.push('.sdd-version');

  lines.push(`  Would replace (${replaceItems.length} items):`);
  for (const item of replaceItems) {
    lines.push(`    ✓ ${item}`);
  }

  // Would preserve
  const preserveItems = [];
  if (state.settingsLocal) preserveItems.push('.claude/settings.local.json   personal settings');
  for (const c of state.customCommands) preserveItems.push(`${c.relativePath}   custom command`);
  for (const a of state.customAgents) preserveItems.push(`${a.relativePath}   custom agent`);
  preserveItems.push('docs/project_notes/*          project memory');
  preserveItems.push('docs/specs/*                  your specs');
  preserveItems.push('docs/tickets/*                your tickets');
  preserveItems.push('.gitignore');

  lines.push(`\n  Would preserve (${preserveItems.length} items):`);
  for (const item of preserveItems) {
    lines.push(`    ⊘ ${item}`);
  }

  // Standards diff
  const standardsStatus = [];

  const baseStdPath = path.join(dest, 'ai-specs', 'specs', 'base-standards.mdc');
  if (fs.existsSync(baseStdPath)) {
    const existing = fs.readFileSync(baseStdPath, 'utf8');
    const template = fs.readFileSync(path.join(templateDir, 'ai-specs', 'specs', 'base-standards.mdc'), 'utf8');
    const fresh = adaptBaseStandards(template, scan, config);
    standardsStatus.push({
      name: 'base-standards.mdc',
      modified: isStandardModified(existing, fresh),
    });
  }

  if (projectType !== 'frontend') {
    const backendStdPath = path.join(dest, 'ai-specs', 'specs', 'backend-standards.mdc');
    if (fs.existsSync(backendStdPath)) {
      const existing = fs.readFileSync(backendStdPath, 'utf8');
      const template = fs.readFileSync(path.join(templateDir, 'ai-specs', 'specs', 'backend-standards.mdc'), 'utf8');
      const fresh = adaptBackendStandards(template, scan);
      standardsStatus.push({
        name: 'backend-standards.mdc',
        modified: isStandardModified(existing, fresh),
      });
    }
  }

  if (projectType !== 'backend') {
    const frontendStdPath = path.join(dest, 'ai-specs', 'specs', 'frontend-standards.mdc');
    if (fs.existsSync(frontendStdPath)) {
      const existing = fs.readFileSync(frontendStdPath, 'utf8');
      const template = fs.readFileSync(path.join(templateDir, 'ai-specs', 'specs', 'frontend-standards.mdc'), 'utf8');
      const fresh = adaptFrontendStandards(template, scan);
      standardsStatus.push({
        name: 'frontend-standards.mdc',
        modified: isStandardModified(existing, fresh),
      });
    }
  }

  standardsStatus.push({ name: 'documentation-standards.mdc', modified: false });

  lines.push('\n  Standards:');
  for (const s of standardsStatus) {
    if (s.modified) {
      lines.push(`    ⚠ ${s.name}  customized → preserve`);
    } else {
      lines.push(`    ✓ ${s.name}  unchanged → update`);
    }
  }

  // Would add (new files)
  const addItems = [];
  const ciPath = path.join(dest, '.github', 'workflows', 'ci.yml');
  if (!fs.existsSync(ciPath)) {
    addItems.push('.github/workflows/ci.yml');
  }

  if (addItems.length > 0) {
    lines.push(`\n  Would add (${addItems.length} new):`);
    for (const item of addItems) {
      lines.push(`    + ${item}`);
    }
  }

  lines.push('\n  Run without --diff to apply.\n');

  console.log(lines.join('\n'));
}

// ── Eject Diff ──────────────────────────────────────────────

function runEjectDiffReport(state) {
  const { buildEjectSummary } = require('./eject-generator');

  const lines = [];
  lines.push('\n🔍 SDD DevFlow — Preview (--eject)\n');
  lines.push(buildEjectSummary(state).split('\n').slice(1).join('\n')); // skip the emoji header (already have our own)
  lines.push('\n  No files removed. Run without --diff to apply.\n');

  console.log(lines.join('\n'));
}

module.exports = { runInitDiffReport, runUpgradeDiffReport, runEjectDiffReport };
