'use strict';

const fs = require('fs');
const path = require('path');
const {
  AUTONOMY_LEVELS,
  FRONTEND_AGENTS,
  BACKEND_AGENTS,
} = require('./config');

/**
 * Install SDD DevFlow into an existing project.
 */
function generateInit(config) {
  const templateDir = path.join(__dirname, '..', 'template');
  const dest = config.projectDir;
  const scan = config.scanResult;
  const skipped = [];

  console.log(`\nAdding SDD DevFlow to ${config.projectName}...\n`);

  // 1. Copy AI tool configs
  if (config.aiTools !== 'gemini') {
    step('Installing Claude Code config (agents, skills, commands, hooks)');
    copyDirIfNotExists(path.join(templateDir, '.claude'), path.join(dest, '.claude'), skipped);
    copyFileIfNotExists(path.join(templateDir, 'CLAUDE.md'), path.join(dest, 'CLAUDE.md'), skipped);
  }
  if (config.aiTools !== 'claude') {
    step('Installing Gemini config (agents, skills, commands)');
    copyDirIfNotExists(path.join(templateDir, '.gemini'), path.join(dest, '.gemini'), skipped);
    copyFileIfNotExists(path.join(templateDir, 'GEMINI.md'), path.join(dest, 'GEMINI.md'), skipped);
  }

  // 2. Copy and adapt standards
  step('Creating ai-specs/specs/ (4 standards files)');
  ensureDir(path.join(dest, 'ai-specs', 'specs'));

  // base-standards and documentation-standards: copy as-is
  copyFileIfNotExists(
    path.join(templateDir, 'ai-specs', 'specs', 'base-standards.mdc'),
    path.join(dest, 'ai-specs', 'specs', 'base-standards.mdc'),
    skipped
  );
  copyFileIfNotExists(
    path.join(templateDir, 'ai-specs', 'specs', 'documentation-standards.mdc'),
    path.join(dest, 'ai-specs', 'specs', 'documentation-standards.mdc'),
    skipped
  );

  // backend-standards: adapt to detected stack
  if (config.projectType !== 'frontend') {
    const backendStdPath = path.join(dest, 'ai-specs', 'specs', 'backend-standards.mdc');
    if (!fs.existsSync(backendStdPath)) {
      const template = fs.readFileSync(path.join(templateDir, 'ai-specs', 'specs', 'backend-standards.mdc'), 'utf8');
      const adapted = adaptBackendStandards(template, scan);
      fs.writeFileSync(backendStdPath, adapted, 'utf8');
    } else {
      skipped.push('ai-specs/specs/backend-standards.mdc');
    }
  }

  // frontend-standards: adapt to detected stack
  if (config.projectType !== 'backend') {
    const frontendStdPath = path.join(dest, 'ai-specs', 'specs', 'frontend-standards.mdc');
    if (!fs.existsSync(frontendStdPath)) {
      const template = fs.readFileSync(path.join(templateDir, 'ai-specs', 'specs', 'frontend-standards.mdc'), 'utf8');
      const adapted = adaptFrontendStandards(template, scan);
      fs.writeFileSync(frontendStdPath, adapted, 'utf8');
    } else {
      skipped.push('ai-specs/specs/frontend-standards.mdc');
    }
  }

  // 3. Copy and configure docs/
  step('Creating docs/project_notes/ (sprint tracker, memory)');
  ensureDir(path.join(dest, 'docs', 'project_notes'));
  ensureDir(path.join(dest, 'docs', 'specs'));
  ensureDir(path.join(dest, 'docs', 'tickets'));

  // key_facts.md — configure with scan data
  const keyFactsPath = path.join(dest, 'docs', 'project_notes', 'key_facts.md');
  if (!fs.existsSync(keyFactsPath)) {
    const template = fs.readFileSync(path.join(templateDir, 'docs', 'project_notes', 'key_facts.md'), 'utf8');
    const configured = configureKeyFacts(template, config, scan);
    fs.writeFileSync(keyFactsPath, configured, 'utf8');
  } else {
    skipped.push('docs/project_notes/key_facts.md');
  }

  // bugs.md, decisions.md — copy as-is
  copyFileIfNotExists(
    path.join(templateDir, 'docs', 'project_notes', 'bugs.md'),
    path.join(dest, 'docs', 'project_notes', 'bugs.md'),
    skipped
  );
  copyFileIfNotExists(
    path.join(templateDir, 'docs', 'project_notes', 'decisions.md'),
    path.join(dest, 'docs', 'project_notes', 'decisions.md'),
    skipped
  );

  // sprint-0-tracker.md — configure dates and add retrofit tasks
  const trackerPath = path.join(dest, 'docs', 'project_notes', 'sprint-0-tracker.md');
  if (!fs.existsSync(trackerPath)) {
    const template = fs.readFileSync(path.join(templateDir, 'docs', 'project_notes', 'sprint-0-tracker.md'), 'utf8');
    const configured = configureSprintTracker(template, scan);
    fs.writeFileSync(trackerPath, configured, 'utf8');
  } else {
    skipped.push('docs/project_notes/sprint-0-tracker.md');
  }

  // docs/specs/
  if (config.projectType !== 'backend') {
    copyFileIfNotExists(
      path.join(templateDir, 'docs', 'specs', 'ui-components.md'),
      path.join(dest, 'docs', 'specs', 'ui-components.md'),
      skipped
    );
  }

  // docs/tickets/.gitkeep
  const gitkeepPath = path.join(dest, 'docs', 'tickets', '.gitkeep');
  if (!fs.existsSync(gitkeepPath)) {
    fs.writeFileSync(gitkeepPath, '', 'utf8');
  }

  // 4. Import existing documentation
  if (config.openAPIPath) {
    step(`Importing OpenAPI spec → docs/specs/api-spec.yaml`);
    const srcOpenAPI = path.resolve(dest, config.openAPIPath);
    const destOpenAPI = path.join(dest, 'docs', 'specs', 'api-spec.yaml');
    if (fs.existsSync(srcOpenAPI) && !fs.existsSync(destOpenAPI)) {
      fs.copyFileSync(srcOpenAPI, destOpenAPI);
    }
  } else if (config.projectType !== 'frontend') {
    // Copy template api-spec.yaml as placeholder
    copyFileIfNotExists(
      path.join(templateDir, 'docs', 'specs', 'api-spec.yaml'),
      path.join(dest, 'docs', 'specs', 'api-spec.yaml'),
      skipped
    );
  }

  if (config.dataModelPath && config.dataModelFormat === 'other') {
    step(`Importing data model → docs/specs/`);
    const srcModel = path.resolve(dest, config.dataModelPath);
    if (fs.existsSync(srcModel)) {
      const destModel = path.join(dest, 'docs', 'specs', path.basename(config.dataModelPath));
      if (!fs.existsSync(destModel)) {
        fs.copyFileSync(srcModel, destModel);
      }
    }
  }

  // 5. AGENTS.md — adapt project structure
  step('Creating AGENTS.md');
  const agentsMdPath = path.join(dest, 'AGENTS.md');
  if (!fs.existsSync(agentsMdPath)) {
    const template = fs.readFileSync(path.join(templateDir, 'AGENTS.md'), 'utf8');
    const adapted = adaptAgentsMd(template, config, scan);
    fs.writeFileSync(agentsMdPath, adapted, 'utf8');
  } else {
    skipped.push('AGENTS.md');
  }

  // 6. Set autonomy level
  step(`Setting autonomy level: L${config.autonomyLevel} (${config.autonomyName})`);
  updateAutonomy(dest, config);

  // 7. Remove agents based on project type
  if (config.projectType === 'backend') {
    removeAgentFiles(dest, FRONTEND_AGENTS, config);
  } else if (config.projectType === 'frontend') {
    removeAgentFiles(dest, BACKEND_AGENTS, config);
  }

  // 8. Append to .gitignore
  appendGitignore(dest, skipped);

  // 9. Copy and adapt .env.example if not present
  const envExamplePath = path.join(dest, '.env.example');
  if (!fs.existsSync(envExamplePath)) {
    let envContent = fs.readFileSync(path.join(templateDir, '.env.example'), 'utf8');
    envContent = adaptEnvExample(envContent, config, scan);
    fs.writeFileSync(envExamplePath, envContent, 'utf8');
  } else {
    skipped.push('.env.example');
  }

  // Show skipped files
  if (skipped.length > 0) {
    console.log('');
    skipped.forEach((f) => console.log(`  ⚠ Skipped ${f} (already exists)`));
  }

  // Show review notes
  console.log('');
  console.log('  ⚠ REVIEW BEFORE YOUR FIRST SPRINT:');
  if (config.projectType !== 'frontend') {
    console.log('    - ai-specs/specs/backend-standards.mdc  — Architecture section adapted from scan');
  }
  if (config.projectType !== 'backend') {
    console.log('    - ai-specs/specs/frontend-standards.mdc — Architecture section adapted from scan');
  }
  console.log('    These files were generated from project analysis. Adjust patterns');
  console.log('    and conventions to match your team\'s actual practices.');

  // Test coverage note
  if (scan.tests.estimatedCoverage === 'none' || scan.tests.estimatedCoverage === 'low') {
    console.log('');
    const fileCount = scan.tests.testFiles;
    if (fileCount === 0) {
      console.log('  📝 No test files detected.');
    } else {
      console.log(`  📝 Test coverage appears low (${fileCount} test files found).`);
    }
    console.log('     Consider starting Sprint 0 with retrofit testing tasks.');
  }

  // Prisma schema note
  if (scan.existingDocs.hasPrismaSchema && !config.openAPIPath) {
    console.log(`\n  📝 Prisma schema found at ${scan.existingDocs.prismaSchemaPath}`);
    console.log('     Referenced in docs/project_notes/key_facts.md');
  }

  // Done
  console.log(`\nDone! Next steps:`);
  console.log(`  git add -A && git commit -m "chore: add SDD DevFlow to existing project"`);
  console.log(`  # Open in your AI coding tool and run: init sprint 0\n`);
}

// --- Helpers ---

function step(msg) {
  console.log(`  ✓ ${msg}`);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFileIfNotExists(src, dest, skipped) {
  if (fs.existsSync(dest)) {
    const rel = path.relative(process.cwd(), dest);
    skipped.push(rel);
    return false;
  }
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  return true;
}

function copyDirIfNotExists(src, dest, skipped) {
  if (fs.existsSync(dest)) {
    // Directory exists — do a merge copy (file-by-file, skip existing)
    copyDirMerge(src, dest, skipped);
    return;
  }
  fs.cpSync(src, dest, { recursive: true });
}

function copyDirMerge(src, dest, skipped) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirMerge(srcPath, destPath, skipped);
    } else {
      copyFileIfNotExists(srcPath, destPath, skipped);
    }
  }
}

function removeAgentFiles(dest, agents, config) {
  for (const agent of agents) {
    if (config.aiTools !== 'gemini') {
      safeDelete(path.join(dest, '.claude', 'agents', agent));
    }
    if (config.aiTools !== 'claude') {
      safeDelete(path.join(dest, '.gemini', 'agents', agent));
    }
  }
}

function safeDelete(filePath) {
  try { fs.unlinkSync(filePath); } catch { /* ignore */ }
}

// --- Standards Adaptation ---

function adaptBackendStandards(template, scan) {
  let content = template;

  // Update frontmatter description to be generic (not "Covers DDD architecture")
  content = content.replace(
    /description: Backend development standards.*?\n/,
    'description: Backend development standards, best practices, and conventions.\n'
  );

  // Add TODO marker after frontmatter
  content = content.replace(
    '<!-- CONFIG: This file defaults to Node.js/Express/Prisma/PostgreSQL. Adjust for your stack. -->',
    '<!-- TODO: Review and adjust the sections below to match your project\'s conventions. -->\n<!-- This file was generated from project analysis by create-sdd-project --init. -->'
  );

  // Update globs in frontmatter
  const srcRoot = findSrcRootName(scan);
  const globPattern = srcRoot ? `${srcRoot}/**/*.{ts,js,tsx,jsx}` : '**/*.{ts,js,tsx,jsx}';
  content = content.replace(
    /globs: \[.*?\]/,
    `globs: ["${globPattern}"]`
  );

  // Update Technology Stack
  const orm = scan.backend.orm;
  const db = scan.backend.db;
  const lang = scan.language === 'typescript' ? 'TypeScript' : 'JavaScript';

  const testFramework = scan.tests.framework !== 'none'
    ? capitalizeFramework(scan.tests.framework)
    : 'Not configured';

  let stackLines = [
    `- **Runtime**: Node.js with ${lang}`,
  ];
  if (scan.backend.framework) {
    stackLines.push(`- **Framework**: ${scan.backend.framework}`);
  }
  if (orm) {
    stackLines.push(`- **ORM**: ${orm}${db ? ` (${db})` : ''}`);
  } else if (db) {
    stackLines.push(`- **Database**: ${db}`);
  }
  stackLines.push(`- **Testing**: ${testFramework}`);

  content = content.replace(
    /## Technology Stack\n\n[\s\S]*?(?=\n## Architecture)/,
    `## Technology Stack\n\n${stackLines.join('\n')}\n\n`
  );

  // Update Architecture section
  const patternLabels = {
    mvc: 'MVC',
    layered: 'Layered',
    ddd: 'DDD Layered',
    'feature-based': 'Feature-Based',
    'handler-based': 'Handler-Based',
    flat: 'Flat',
    unknown: 'Custom',
  };
  const patternLabel = patternLabels[scan.srcStructure.pattern] || 'Custom';

  const archStructure = buildArchitectureTree(scan);
  // Robust: match any "## Architecture — <anything>" heading up to "## Naming"
  content = content.replace(
    /## Architecture — [^\n]+\n\n```\n[\s\S]*?```\n\n(?:### Layer Rules\n\n[\s\S]*?)?(?=\n## Naming)/,
    `## Architecture — ${patternLabel}\n\n\`\`\`\n${archStructure}\`\`\`\n\n<!-- TODO: Add layer rules that match your project's architecture. -->\n\n`
  );

  // Update Database Patterns section if not Prisma
  // Robust: match from "## Database Patterns" to next "## " heading
  if (!scan.backend.orm) {
    content = content.replace(
      /## Database Patterns\n\n[\s\S]*?(?=\n## )/,
      `## Database Patterns\n\n<!-- TODO: Add database access patterns for your project. -->\n`
    );
  } else if (scan.backend.orm !== 'Prisma') {
    content = content.replace(
      /## Database Patterns\n\n[\s\S]*?(?=\n## )/,
      `## Database Patterns\n\n<!-- TODO: Add ${scan.backend.orm} best practices and patterns for your project. -->\n`
    );
  }

  // Replace Prisma-specific references in Security and Performance sections
  if (scan.backend.orm !== 'Prisma') {
    content = content.replace(
      '- Use parameterized queries (Prisma handles this)',
      '- Use parameterized queries to prevent injection attacks'
    );
    content = content.replace(
      '- Use Prisma `include` instead of N+1 queries',
      '- Avoid N+1 queries — use eager loading or batch fetching'
    );
  }

  return content;
}

function adaptFrontendStandards(template, scan) {
  let content = template;

  // Add TODO marker
  content = content.replace(
    '<!-- CONFIG: This file defaults to Next.js/React/Tailwind/Radix UI/Zustand. Adjust for your stack. -->',
    '<!-- TODO: Review and adjust the sections below to match your project\'s conventions. -->\n<!-- This file was generated from project analysis by create-sdd-project --init. -->'
  );

  // Update globs in frontmatter
  content = content.replace(
    /globs: \[.*?\]/,
    `globs: ["**/*.{ts,tsx,js,jsx}", "!node_modules/**"]`
  );

  // Update Technology Stack
  const framework = scan.frontend.framework || 'Unknown';
  const styling = scan.frontend.styling || 'CSS';
  const components = scan.frontend.components ? `, ${scan.frontend.components}` : '';
  const state = scan.frontend.state ? `, ${scan.frontend.state}` : '';
  const lang = scan.language === 'typescript' ? 'TypeScript' : 'JavaScript';

  content = content.replace(
    /## Technology Stack\n\n[\s\S]*?(?=\n## Project Structure)/,
    `## Technology Stack\n\n- **Framework**: ${framework}\n- **Language**: ${lang}\n- **Styling**: ${styling}${components ? `\n- **Components**: ${components.slice(2)}` : ''}${state ? `\n- **State Management**: ${state.slice(2)}` : ''}\n- **Testing**: ${scan.tests.framework !== 'none' ? capitalizeFramework(scan.tests.framework) : 'Not configured'}\n\n`
  );

  // Update Project Structure
  const rootDirs = scan.rootDirs.filter((d) => !['docs/', 'ai-specs/', 'node_modules/'].includes(d));
  const tree = rootDirs.map((d) => `├── ${d.replace(/\/$/, '/')}`).join('\n');
  content = content.replace(
    /## Project Structure\n\n```\n[\s\S]*?```/,
    `## Project Structure\n\n\`\`\`\nproject/\n${tree}\n\`\`\`\n\n<!-- TODO: Expand the structure above with your key subdirectories. -->`
  );

  return content;
}

function buildArchitectureTree(scan) {
  const srcRoot = findSrcRootName(scan);
  const dirs = scan.srcStructure.dirs;
  const rootLabel = srcRoot || 'project';

  if (dirs.length === 0) {
    return `${rootLabel}/\n└── <!-- TODO: Map your project structure here -->\n`;
  }

  // Build a simple tree from detected directories (depth 1 only)
  const topLevel = dirs.filter((d) => !d.includes('/'));
  const lines = [`${rootLabel}/\n`];
  topLevel.forEach((dir, i) => {
    const prefix = i === topLevel.length - 1 ? '└── ' : '├── ';
    lines.push(`${prefix}${dir}/\n`);
  });

  return lines.join('');
}

function capitalizeFramework(name) {
  const map = { jest: 'Jest', vitest: 'Vitest', mocha: 'Mocha', playwright: 'Playwright', cypress: 'Cypress' };
  return map[name] || name;
}

function findSrcRootName(scan) {
  // Determine the source root directory name from scan
  if (scan.rootDirs.includes('src/')) return 'src';
  if (scan.rootDirs.includes('app/')) return 'app';
  if (scan.rootDirs.includes('server/')) return 'server';
  if (scan.rootDirs.includes('lib/')) return 'lib';
  return null; // No conventional source root — code is at project root
}

// --- AGENTS.md Adaptation ---

function adaptAgentsMd(template, config, scan) {
  let content = template;

  // Replace project structure with actual directories
  const rootDirs = scan.rootDirs;
  const tree = rootDirs.map((d) => `├── ${d.replace(/\/$/, '/')}   `).join('\n');
  const treeBlock = `\`\`\`\nproject/\n${tree}\n└── docs/        ← Documentation\n\`\`\``;

  // Robust: flexible whitespace between CONFIG comment and code block
  content = content.replace(
    /<!-- CONFIG: Adjust directories[^>]*-->\n+```\nproject\/\n[\s\S]*?```/,
    treeBlock
  );

  // If not monorepo, simplify the install instructions
  // Robust: match any number of table rows (not hardcoded count)
  if (!scan.isMonorepo) {
    content = content.replace(
      /\*\*Critical\*\*: NEVER install dependencies in the root directory\.\n\n(\|.*\n)+/,
      ''
    );
  }

  // Adapt Standards References descriptions
  if (scan.backend.detected) {
    const parts = [scan.srcStructure.pattern ? patternLabelFor(scan.srcStructure.pattern) : null, scan.backend.framework, scan.backend.orm].filter(Boolean);
    content = content.replace(
      'Backend patterns (DDD, Express, Prisma)',
      `Backend patterns (${parts.join(', ')})`
    );
  }
  if (scan.frontend.detected) {
    const parts = [scan.frontend.framework, scan.frontend.styling, scan.frontend.components].filter(Boolean);
    content = content.replace(
      'Frontend patterns (Next.js, Tailwind, Radix)',
      `Frontend patterns (${parts.join(', ')})`
    );
  }

  return content;
}

function patternLabelFor(pattern) {
  const map = { mvc: 'MVC', layered: 'Layered', ddd: 'DDD', 'feature-based': 'Feature-Based', 'handler-based': 'Handler-Based', flat: 'Flat', unknown: null };
  return map[pattern] || null;
}

// --- key_facts.md Configuration ---

function configureKeyFacts(template, config, scan) {
  let content = template;

  // Project name
  content = content.split('[Your project name]').join(config.projectName);

  // Description
  if (config.description) {
    content = content.replace(
      `- **Project Name**: ${config.projectName}`,
      `- **Project Name**: ${config.projectName}\n- **Description**: ${config.description}`
    );
  }

  // Branching
  content = content.replace(
    /github-flow <!-- Options:.*?-->/,
    `${config.branching} <!-- Options: github-flow | gitflow — See .claude/skills/development-workflow/references/branching-strategy.md -->`
  );

  // Technology Stack from scan
  if (scan.backend.detected) {
    const runtime = scan.language === 'typescript' ? 'Node.js (TypeScript)' : 'Node.js';
    const backendLabel = scan.backend.framework
      ? `${scan.backend.framework}, ${runtime}`
      : runtime;
    content = content.replace('[Framework, runtime, version]', backendLabel);

    if (scan.backend.db) {
      content = content.replace('[Type, host, port]', scan.backend.db);
    } else {
      content = content.replace('- **Database**: [Type, host, port]\n', '');
    }

    if (scan.backend.orm) {
      content = content.replace('[Name, version]', scan.backend.orm);
    } else {
      content = content.replace('- **ORM**: [Name, version]\n', '');
    }
  }

  if (scan.frontend.detected) {
    const parts = [scan.frontend.framework, scan.frontend.styling, scan.frontend.components, scan.frontend.state].filter(Boolean);
    content = content.replace('[Framework, version]', parts.join(', ') || 'Unknown');
  }

  // Clean up unreplaced placeholders for missing parts
  if (!scan.backend.detected) {
    content = content.replace('- **Backend**: [Framework, runtime, version]\n', '');
    content = content.replace('- **Database**: [Type, host, port]\n', '');
    content = content.replace('- **ORM**: [Name, version]\n', '');
  }
  if (!scan.frontend.detected) {
    content = content.replace('- **Frontend**: [Framework, version]\n', '');
  }

  // Ports
  const backendPort = scan.backend.port || config.backendPort;
  if (scan.backend.detected) {
    content = content.replace('[e.g., 3010]', String(backendPort));
    content = content.replace('[e.g., 5432]', scan.backend.db === 'MongoDB' ? '27017' : '5432');
    content = content.replace('[e.g., http://localhost:3010/api]', `http://localhost:${backendPort}/api`);
  } else {
    // Remove backend port lines
    content = content.replace('- **Backend Port**: [e.g., 3010]\n', '');
    content = content.replace('- **Database Port**: [e.g., 5432]\n', '');
    content = content.replace('- **API Base URL**: [e.g., http://localhost:3010/api]\n', '');
  }
  if (scan.frontend.detected) {
    content = content.replace('[e.g., 3000]', '3000');
  } else {
    content = content.replace('- **Frontend Port**: [e.g., 3000]\n', '');
  }

  // Business context
  if (config.businessContext) {
    const contextSection = `\n## Project Information\n\n${config.businessContext}\n`;
    content = content.replace('## Technology Stack', `${contextSection}\n## Technology Stack`);
  }

  // Remove irrelevant Infrastructure lines based on project type
  if (!scan.frontend.detected) {
    content = content.replace('- **Frontend Hosting**: [e.g., Vercel]\n', '');
  }
  if (!scan.backend.detected) {
    content = content.replace('- **Backend Hosting**: [e.g., Render]\n', '');
    content = content.replace('- **Database Hosting**: [e.g., Neon, Supabase, RDS]\n', '');
  }

  // Adapt DB hosting examples based on detected database
  if (scan.backend.db === 'MongoDB') {
    content = content.replace('[e.g., Neon, Supabase, RDS]', '[e.g., MongoDB Atlas, Cosmos DB]');
  }

  // Remove irrelevant Reusable Components subsections
  if (!scan.frontend.detected) {
    content = content.replace('\n### Frontend\n- [List key components, hooks, stores as you build them]\n', '');
  }
  if (!scan.backend.detected) {
    content = content.replace('\n### Backend\n- [List key services, middleware, validators as you build them]\n', '');
  }

  // Prisma schema reference
  if (scan.existingDocs.hasPrismaSchema) {
    content = content.replace(
      '## Infrastructure',
      `## Data Model\n\n- **Schema**: \`${scan.existingDocs.prismaSchemaPath}\`\n\n## Infrastructure`
    );
  }

  return content;
}

// --- Sprint Tracker Configuration ---

function configureSprintTracker(template, scan) {
  let content = template;

  // Set dates
  const today = new Date().toISOString().split('T')[0];
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 14);
  const end = endDate.toISOString().split('T')[0];
  content = content.replace(/\[YYYY-MM-DD\] to \[YYYY-MM-DD\]/, `${today} to ${end}`);

  // Remove irrelevant task tables based on detected stack
  if (!scan.frontend.detected) {
    content = content.replace(
      /\n### Frontend\n\n\| # \| Task \| Status \| Notes \|\n\|---\|------\|--------\|-------\|\n\| F0\.1 \| \[Task description\] \| ⬚ \| \|\n/,
      ''
    );
  }
  if (!scan.backend.detected) {
    content = content.replace(
      /\n### Backend\n\n\| # \| Task \| Status \| Notes \|\n\|---\|------\|--------\|-------\|\n\| B0\.1 \| \[Task description\] \| ⬚ \| \|\n/,
      ''
    );
  }

  // Add retrofit testing tasks if coverage is low
  if (scan.tests.estimatedCoverage === 'none' || scan.tests.estimatedCoverage === 'low') {
    const retrofitSection = `\n### Retrofit Testing (recommended)\n\n| # | Task | Status | Notes |\n|---|------|--------|-------|\n| R0.1 | Audit existing test coverage | ⬚ | |\n| R0.2 | Add missing unit tests for critical paths | ⬚ | |\n| R0.3 | Set up CI test pipeline | ⬚ | |\n`;

    // Insert before Status Legend
    content = content.replace(
      '**Status Legend:**',
      `${retrofitSection}\n**Status Legend:**`
    );
  }

  return content;
}

// --- Autonomy ---

function updateAutonomy(dest, config) {
  const levelInfo = AUTONOMY_LEVELS.find((l) => l.level === config.autonomyLevel);
  const newLine = `**Autonomy Level: ${config.autonomyLevel} (${levelInfo.name})**`;

  const files = [
    path.join(dest, 'CLAUDE.md'),
    path.join(dest, 'GEMINI.md'),
  ];

  for (const file of files) {
    if (fs.existsSync(file)) {
      let content = fs.readFileSync(file, 'utf8');
      content = content.replace(/\*\*Autonomy Level: \d+ \([^)]+\)\*\*/, newLine);
      fs.writeFileSync(file, content, 'utf8');
    }
  }
}

// --- .env.example Adaptation ---

function adaptEnvExample(template, config, scan) {
  let content = template;
  const port = scan.backend.port || config.backendPort || 3010;

  // Adapt port
  content = content.replace('PORT=3010', `PORT=${port}`);
  content = content.replace('localhost:3010', `localhost:${port}`);

  // Adapt DATABASE_URL based on detected DB
  if (scan.backend.db === 'MongoDB') {
    content = content.replace(
      'DATABASE_URL=postgresql://user:password@localhost:5432/dbname',
      'MONGODB_URI=mongodb://localhost:27017/dbname'
    );
  }

  // Remove frontend section if backend-only
  if (!scan.frontend.detected) {
    content = content.replace(/\n# Frontend\nNEXT_PUBLIC_API_URL=.*\n/, '\n');
  }

  // Remove backend section if frontend-only
  if (!scan.backend.detected) {
    content = content.replace(/# Backend\nNODE_ENV=.*\nPORT=.*\nDATABASE_URL=.*\n/, '');
    content = content.replace(/# Backend\nNODE_ENV=.*\nPORT=.*\nMONGODB_URI=.*\n/, '');
  }

  return content;
}

// --- .gitignore ---

function appendGitignore(dest, skipped) {
  const gitignorePath = path.join(dest, '.gitignore');
  const sddEntries = '\n# SDD DevFlow\ndocs/tickets/*.md\n!docs/tickets/.gitkeep\n';

  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    if (!content.includes('SDD DevFlow')) {
      fs.appendFileSync(gitignorePath, sddEntries, 'utf8');
      step('Appended SDD entries to .gitignore');
    }
  } else {
    // No .gitignore — don't create one, project might use a different ignore mechanism
    skipped.push('.gitignore (not found, add SDD entries manually)');
  }
}

module.exports = { generateInit };
