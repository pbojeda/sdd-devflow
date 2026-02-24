'use strict';

const fs = require('fs');
const path = require('path');
const {
  BACKEND_STACKS,
  FRONTEND_STACKS,
  AUTONOMY_LEVELS,
  FRONTEND_AGENTS,
  BACKEND_AGENTS,
} = require('./config');

function generate(config) {
  const templateDir = path.join(__dirname, '..', 'template');
  const dest = config.projectDir;

  // 1. Copy entire template
  step('Copying template files');
  fs.cpSync(templateDir, dest, { recursive: true });

  // 2. Configure key_facts.md
  step(`Configuring project: ${config.projectName}`);
  updateKeyFacts(dest, config);

  // 3. Update tech stack references
  if (config.projectType !== 'frontend') {
    const bPreset = config.backendPreset || BACKEND_STACKS[0];
    step(`Setting backend: ${bPreset.label || config.customBackend || 'Custom'}`);
    updateBackendConfig(dest, config);
  }
  if (config.projectType !== 'backend') {
    const fPreset = config.frontendPreset || FRONTEND_STACKS[0];
    step(`Setting frontend: ${fPreset.label || config.customFrontend || 'Custom'}`);
  }

  // 4. Set autonomy level
  step(`Setting autonomy level: L${config.autonomyLevel} (${config.autonomyName})`);
  updateAutonomy(dest, config);

  // 5. Set branching strategy
  step(`Setting branching: ${config.branching}`);
  updateBranching(dest, config);

  // 6. Set sprint dates
  step('Setting sprint dates to today');
  updateSprintDates(dest);

  // 7. Remove agents/specs based on project type
  if (config.projectType === 'backend') {
    step('Removing frontend agents (backend only)');
    removeFrontendFiles(dest, config);
  } else if (config.projectType === 'frontend') {
    step('Removing backend agents (frontend only)');
    removeBackendFiles(dest, config);
  }

  // 8. Remove AI tool config if single tool selected
  if (config.aiTools === 'claude') {
    step('Removing Gemini config (Claude only)');
    fs.rmSync(path.join(dest, '.gemini'), { recursive: true, force: true });
    safeDelete(path.join(dest, 'GEMINI.md'));
  } else if (config.aiTools === 'gemini') {
    step('Removing Claude config (Gemini only)');
    fs.rmSync(path.join(dest, '.claude'), { recursive: true, force: true });
    safeDelete(path.join(dest, 'CLAUDE.md'));
  }

  // Show notes
  const notes = collectNotes(config);
  if (notes.length > 0) {
    console.log('');
    notes.forEach((n) => console.log(`  📝 ${n}`));
  }

  // Done
  console.log(`\nDone! Next steps:`);
  console.log(`  cd ${path.relative(process.cwd(), dest)}`);
  console.log(`  git init && git add -A && git commit -m "chore: initialize SDD DevFlow project"`);
  console.log(`  # Open in your AI coding tool and run: init sprint 0\n`);
}

// --- Helpers ---

function step(msg) {
  console.log(`  ✓ ${msg}`);
}

function safeDelete(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // ignore if not found
  }
}

function replaceInFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [search, replace] of replacements) {
    if (search instanceof RegExp) {
      content = content.replace(search, replace);
    } else {
      content = content.split(search).join(replace);
    }
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

function updateKeyFacts(dest, config) {
  const file = path.join(dest, 'docs', 'project_notes', 'key_facts.md');
  const bPreset = config.backendPreset || BACKEND_STACKS[0];
  const fPreset = config.frontendPreset || FRONTEND_STACKS[0];

  const replacements = [
    ['[Your project name]', config.projectName],
  ];

  // Branching
  // The template has: github-flow <!-- Options: ... -->
  replacements.push([
    /github-flow <!-- Options:.*?-->/,
    `${config.branching} <!-- Options: github-flow | gitflow — See .claude/skills/development-workflow/references/branching-strategy.md -->`,
  ]);

  // Technology Stack
  if (config.projectType !== 'frontend' && bPreset.key !== 'custom') {
    replacements.push(['[Framework, runtime, version]', `${bPreset.framework}, ${bPreset.runtime}`]);
    replacements.push(['[Type, host, port]', `${bPreset.db}, localhost, ${bPreset.dbPort}`]);
    replacements.push(['[Name, version]', bPreset.orm]);
  } else if (config.projectType !== 'frontend' && config.customBackend) {
    replacements.push(['[Framework, runtime, version]', config.customBackend]);
  }

  if (config.projectType !== 'backend' && fPreset.key !== 'custom') {
    replacements.push(['[Framework, version]', `${fPreset.framework}, ${fPreset.styling}, ${fPreset.components}, ${fPreset.state}`]);
  } else if (config.projectType !== 'backend' && config.customFrontend) {
    replacements.push(['[Framework, version]', config.customFrontend]);
  }

  // Ports
  if (config.projectType !== 'frontend') {
    replacements.push(['[e.g., 3010]', String(config.backendPort)]);
    replacements.push(['[e.g., 5432]', bPreset.key !== 'custom' ? String(bPreset.dbPort) : '[e.g., 5432]']);
    replacements.push(['[e.g., http://localhost:3010/api]', `http://localhost:${config.backendPort}/api`]);
  }
  if (config.projectType !== 'backend') {
    replacements.push(['[e.g., 3000]', String(config.frontendPort || 3000)]);
  }

  replaceInFile(file, replacements);

  // Add business context section if provided
  if (config.businessContext) {
    let content = fs.readFileSync(file, 'utf8');
    const contextSection = `\n## Project Information\n\n${config.businessContext}\n`;
    // Insert before ## Technology Stack
    content = content.replace('## Technology Stack', `${contextSection}\n## Technology Stack`);
    // Add description if provided
    if (config.description) {
      content = content.replace(
        `- **Project Name**: ${config.projectName}`,
        `- **Project Name**: ${config.projectName}\n- **Description**: ${config.description}`
      );
    }
    fs.writeFileSync(file, content, 'utf8');
  } else if (config.description) {
    replaceInFile(file, [
      [`- **Project Name**: ${config.projectName}`, `- **Project Name**: ${config.projectName}\n- **Description**: ${config.description}`],
    ]);
  }
}

function updateBackendConfig(dest, config) {
  const bPreset = config.backendPreset || BACKEND_STACKS[0];

  // .env.example
  const envFile = path.join(dest, '.env.example');
  const replacements = [];

  if (config.backendPort !== 3010) {
    replacements.push(['PORT=3010', `PORT=${config.backendPort}`]);
    replacements.push([
      'NEXT_PUBLIC_API_URL=http://localhost:3010/api',
      `NEXT_PUBLIC_API_URL=http://localhost:${config.backendPort}/api`,
    ]);
  }

  if (bPreset.databaseUrl) {
    replacements.push([
      'DATABASE_URL=postgresql://user:password@localhost:5432/dbname',
      `DATABASE_URL=${bPreset.databaseUrl}`,
    ]);
  }

  if (replacements.length > 0) {
    replaceInFile(envFile, replacements);
  }

  // api-spec.yaml
  const apiSpec = path.join(dest, 'docs', 'specs', 'api-spec.yaml');
  const apiReplacements = [
    ['title: Project API', `title: ${config.projectName} API`],
  ];
  if (config.backendPort !== 3010) {
    apiReplacements.push([
      'http://localhost:3010/api',
      `http://localhost:${config.backendPort}/api`,
    ]);
  }
  replaceInFile(apiSpec, apiReplacements);
}

function updateAutonomy(dest, config) {
  const levelInfo = AUTONOMY_LEVELS.find((l) => l.level === config.autonomyLevel);
  const newLine = `**Autonomy Level: ${config.autonomyLevel} (${levelInfo.name})**`;

  // CLAUDE.md
  replaceInFile(path.join(dest, 'CLAUDE.md'), [
    [/\*\*Autonomy Level: \d+ \([^)]+\)\*\*/, newLine],
  ]);

  // GEMINI.md
  replaceInFile(path.join(dest, 'GEMINI.md'), [
    [/\*\*Autonomy Level: \d+ \([^)]+\)\*\*/, newLine],
  ]);
}

function updateBranching(dest, config) {
  // key_facts.md is already handled in updateKeyFacts
  // Nothing else to update — branching is read from key_facts.md at runtime
}

function updateSprintDates(dest) {
  const file = path.join(dest, 'docs', 'project_notes', 'sprint-0-tracker.md');
  const today = new Date().toISOString().split('T')[0];
  // Calculate 2-week sprint end
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 14);
  const end = endDate.toISOString().split('T')[0];

  replaceInFile(file, [
    [/\[YYYY-MM-DD\] to \[YYYY-MM-DD\]/, `${today} to ${end}`],
  ]);
}

function removeFrontendFiles(dest, config) {
  // Remove frontend agents
  for (const agent of FRONTEND_AGENTS) {
    safeDelete(path.join(dest, '.claude', 'agents', agent));
    safeDelete(path.join(dest, '.gemini', 'agents', agent));
  }
  // Remove frontend spec
  safeDelete(path.join(dest, 'docs', 'specs', 'ui-components.md'));

  // Remove frontend from .env.example
  replaceInFile(path.join(dest, '.env.example'), [
    [/\n# Frontend\nNEXT_PUBLIC_API_URL=.*\n/, '\n'],
  ]);

  // Remove frontend from AGENTS.md project structure
  replaceInFile(path.join(dest, 'AGENTS.md'), [
    ['├── frontend/    ← Frontend (has its own package.json)\n', ''],
  ]);

  // Remove frontend tasks from sprint tracker
  const trackerFile = path.join(dest, 'docs', 'project_notes', 'sprint-0-tracker.md');
  replaceInFile(trackerFile, [
    [/\n### Frontend\n\n\|.*\n\|.*\n\|.*\n/, '\n'],
  ]);
}

function removeBackendFiles(dest, config) {
  // Remove backend agents + database-architect
  for (const agent of BACKEND_AGENTS) {
    safeDelete(path.join(dest, '.claude', 'agents', agent));
    safeDelete(path.join(dest, '.gemini', 'agents', agent));
  }
  // Remove backend spec
  safeDelete(path.join(dest, 'docs', 'specs', 'api-spec.yaml'));

  // Remove backend from .env.example
  replaceInFile(path.join(dest, '.env.example'), [
    [/# Backend\nNODE_ENV=.*\nPORT=.*\nDATABASE_URL=.*\n\n/, ''],
  ]);

  // Remove backend from AGENTS.md project structure
  replaceInFile(path.join(dest, 'AGENTS.md'), [
    ['├── backend/     ← Backend (has its own package.json)\n', ''],
  ]);

  // Remove backend tasks from sprint tracker
  const trackerFile = path.join(dest, 'docs', 'project_notes', 'sprint-0-tracker.md');
  replaceInFile(trackerFile, [
    [/\n### Backend\n\n\|.*\n\|.*\n\|.*\n/, '\n'],
  ]);
}

function collectNotes(config) {
  const notes = [];
  const bPreset = config.backendPreset;
  const fPreset = config.frontendPreset;

  if (bPreset && bPreset.needsStandardsUpdate) {
    notes.push('Update ai-specs/specs/backend-standards.mdc with your backend stack patterns.');
  }
  if (fPreset && fPreset.needsStandardsUpdate) {
    notes.push('Update ai-specs/specs/frontend-standards.mdc with your frontend stack patterns.');
  }

  return notes;
}

module.exports = { generate };
