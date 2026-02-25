'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const CLI = path.join(__dirname, '..', 'bin', 'cli.js');
const TMP_BASE = path.join(__dirname, '..', '.test-output');

let passed = 0;
let failed = 0;

function setup() {
  fs.rmSync(TMP_BASE, { recursive: true, force: true });
  fs.mkdirSync(TMP_BASE, { recursive: true });
}

function silent(fn) {
  const origLog = console.log;
  console.log = () => {};
  try {
    fn();
  } finally {
    console.log = origLog;
  }
}

function cleanup() {
  fs.rmSync(TMP_BASE, { recursive: true, force: true });
}

function run(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
    failed++;
  }
}

function assertExists(dir, relativePath) {
  const full = path.join(dir, relativePath);
  assert.ok(fs.existsSync(full), `Expected ${relativePath} to exist`);
}

function assertNotExists(dir, relativePath) {
  const full = path.join(dir, relativePath);
  assert.ok(!fs.existsSync(full), `Expected ${relativePath} to NOT exist`);
}

function assertFileContains(dir, relativePath, text) {
  const full = path.join(dir, relativePath);
  const content = fs.readFileSync(full, 'utf8');
  assert.ok(content.includes(text), `Expected ${relativePath} to contain "${text}"`);
}

function assertFileNotContains(dir, relativePath, text) {
  const full = path.join(dir, relativePath);
  const content = fs.readFileSync(full, 'utf8');
  assert.ok(!content.includes(text), `Expected ${relativePath} to NOT contain "${text}"`);
}

// --- Scenario 1: Default (fullstack, both tools, L2) ---

function testDefaults() {
  const dest = path.join(TMP_BASE, 'test-defaults');
  execSync(`node ${CLI} test-defaults --yes`, { cwd: TMP_BASE, stdio: 'pipe' });

  // Core files exist
  assertExists(dest, 'AGENTS.md');
  assertExists(dest, 'CLAUDE.md');
  assertExists(dest, 'GEMINI.md');
  assertExists(dest, '.env.example');
  assertExists(dest, '.gitignore');
  assertExists(dest, '.claude/agents/backend-developer.md');
  assertExists(dest, '.claude/agents/frontend-developer.md');
  assertExists(dest, '.gemini/agents/backend-developer.md');
  assertExists(dest, '.gemini/agents/frontend-developer.md');
  assertExists(dest, 'docs/specs/api-spec.yaml');
  assertExists(dest, 'docs/specs/ui-components.md');
  assertExists(dest, 'docs/project_notes/key_facts.md');
  assertExists(dest, 'docs/project_notes/sprint-0-tracker.md');

  // Placeholders replaced
  assertFileContains(dest, 'docs/project_notes/key_facts.md', 'test-defaults');
  assertFileNotContains(dest, 'docs/project_notes/key_facts.md', '[Your project name]');
  assertFileContains(dest, 'docs/specs/api-spec.yaml', 'test-defaults API');

  // Sprint dates set (not [YYYY-MM-DD] to [YYYY-MM-DD])
  assertFileNotContains(dest, 'docs/project_notes/sprint-0-tracker.md', '[YYYY-MM-DD] to [YYYY-MM-DD]');

  // Default autonomy L2
  assertFileContains(dest, 'CLAUDE.md', 'Autonomy Level: 2 (Trusted)');
  assertFileContains(dest, 'GEMINI.md', 'Autonomy Level: 2 (Trusted)');

  // Gemini skills and commands exist
  assertExists(dest, '.gemini/skills/development-workflow/SKILL.md');
  assertExists(dest, '.gemini/skills/bug-workflow/SKILL.md');
  assertExists(dest, '.gemini/skills/project-memory/SKILL.md');
  assertExists(dest, '.gemini/commands/start-task.toml');

  // No internal files leaked
  assertNotExists(dest, 'docs/project_notes/pending-improvements.md');
}

// --- Scenario 2: Backend only ---

function testBackendOnly() {
  const dest = path.join(TMP_BASE, 'test-backend');

  // Use generator directly to test backend-only without interactive wizard
  const { generate } = require('../lib/generator');
  const { BACKEND_STACKS } = require('../lib/config');

  silent(() => generate({
    projectName: 'test-backend',
    projectDir: dest,
    description: 'Backend only test',
    businessContext: '',
    projectType: 'backend',
    backendStack: 'express-prisma-pg',
    backendPreset: BACKEND_STACKS[0],
    frontendStack: 'nextjs-tailwind-radix',
    aiTools: 'both',
    autonomyLevel: 2,
    autonomyName: 'Trusted',
    branching: 'github-flow',
    backendPort: 3010,
    frontendPort: 3000,
  }));

  // Backend files exist
  assertExists(dest, '.claude/agents/backend-developer.md');
  assertExists(dest, '.claude/agents/backend-planner.md');
  assertExists(dest, 'docs/specs/api-spec.yaml');

  // Frontend files removed
  assertNotExists(dest, '.claude/agents/frontend-developer.md');
  assertNotExists(dest, '.claude/agents/frontend-planner.md');
  assertNotExists(dest, '.gemini/agents/frontend-developer.md');
  assertNotExists(dest, '.gemini/agents/frontend-planner.md');
  assertNotExists(dest, 'docs/specs/ui-components.md');
}

// --- Scenario 3: Claude only ---

function testClaudeOnly() {
  const dest = path.join(TMP_BASE, 'test-claude');

  const { generate } = require('../lib/generator');
  const { BACKEND_STACKS, FRONTEND_STACKS } = require('../lib/config');

  silent(() => generate({
    projectName: 'test-claude',
    projectDir: dest,
    description: 'Claude only test',
    businessContext: '',
    projectType: 'fullstack',
    backendStack: 'express-prisma-pg',
    backendPreset: BACKEND_STACKS[0],
    frontendStack: 'nextjs-tailwind-radix',
    frontendPreset: FRONTEND_STACKS[0],
    aiTools: 'claude',
    autonomyLevel: 3,
    autonomyName: 'Autopilot',
    branching: 'gitflow',
    backendPort: 4000,
    frontendPort: 3000,
  }));

  // Claude files exist
  assertExists(dest, 'CLAUDE.md');
  assertExists(dest, '.claude/agents/backend-developer.md');

  // Gemini files removed
  assertNotExists(dest, 'GEMINI.md');
  assertNotExists(dest, '.gemini');

  // Custom autonomy level
  assertFileContains(dest, 'CLAUDE.md', 'Autonomy Level: 3 (Autopilot)');

  // Custom port
  assertFileContains(dest, '.env.example', 'PORT=4000');
  assertFileContains(dest, 'docs/specs/api-spec.yaml', 'localhost:4000');

  // Custom branching
  assertFileContains(dest, 'docs/project_notes/key_facts.md', 'gitflow');
}

// --- Scenario 4: Gemini only (verify skills + commands) ---

function testGeminiOnly() {
  const dest = path.join(TMP_BASE, 'test-gemini');

  const { generate } = require('../lib/generator');
  const { BACKEND_STACKS, FRONTEND_STACKS } = require('../lib/config');

  silent(() => generate({
    projectName: 'test-gemini',
    projectDir: dest,
    description: 'Gemini only test',
    businessContext: '',
    projectType: 'fullstack',
    backendStack: 'express-prisma-pg',
    backendPreset: BACKEND_STACKS[0],
    frontendStack: 'nextjs-tailwind-radix',
    frontendPreset: FRONTEND_STACKS[0],
    aiTools: 'gemini',
    autonomyLevel: 2,
    autonomyName: 'Trusted',
    branching: 'github-flow',
    backendPort: 3010,
    frontendPort: 3000,
  }));

  // Gemini files exist
  assertExists(dest, 'GEMINI.md');
  assertExists(dest, '.gemini/agents/backend-developer.md');
  assertExists(dest, '.gemini/skills/development-workflow/SKILL.md');
  assertExists(dest, '.gemini/skills/bug-workflow/SKILL.md');
  assertExists(dest, '.gemini/skills/project-memory/SKILL.md');
  assertExists(dest, '.gemini/commands/start-task.toml');
  assertExists(dest, '.gemini/commands/fix-bug.toml');
  assertExists(dest, '.gemini/skills/development-workflow/references/complexity-guide.md');
  assertExists(dest, '.gemini/skills/project-memory/references/bugs_template.md');

  // Claude files removed
  assertNotExists(dest, 'CLAUDE.md');
  assertNotExists(dest, '.claude');

  // No pending-improvements.md
  assertNotExists(dest, 'docs/project_notes/pending-improvements.md');
}

// --- Scenario 5: --init on Express+Prisma project ---

function testInitExpressPrisma() {
  const dest = path.join(TMP_BASE, 'test-init-express');
  fs.mkdirSync(dest, { recursive: true });

  // Create a mock Express+Prisma project
  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify({
    name: 'my-express-app',
    description: 'An Express API',
    dependencies: {
      express: '^4.18.0',
      '@prisma/client': '^5.0.0',
    },
    devDependencies: {
      jest: '^29.0.0',
      typescript: '^5.0.0',
    },
  }), 'utf8');
  fs.writeFileSync(path.join(dest, 'tsconfig.json'), '{}', 'utf8');
  fs.mkdirSync(path.join(dest, 'src', 'controllers'), { recursive: true });
  fs.mkdirSync(path.join(dest, 'src', 'models'), { recursive: true });
  fs.mkdirSync(path.join(dest, 'src', 'routes'), { recursive: true });
  fs.mkdirSync(path.join(dest, 'src', 'middleware'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'src', 'index.ts'), '', 'utf8');
  fs.mkdirSync(path.join(dest, 'prisma'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'prisma', 'schema.prisma'), 'datasource db {\n  provider = "postgresql"\n  url = env("DATABASE_URL")\n}', 'utf8');
  fs.writeFileSync(path.join(dest, '.env'), 'PORT=4000\nDATABASE_URL=postgresql://localhost:5432/mydb', 'utf8');
  fs.writeFileSync(path.join(dest, '.gitignore'), 'node_modules\n.env\n', 'utf8');
  // Add a couple test files
  fs.mkdirSync(path.join(dest, 'src', '__tests__'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'src', '__tests__', 'user.test.ts'), '', 'utf8');

  // Run --init with defaults
  const { scan } = require('../lib/scanner');
  const { buildInitDefaultConfig } = require('../lib/init-wizard');
  const { generateInit } = require('../lib/init-generator');

  const scanResult = scan(dest);
  const config = buildInitDefaultConfig(scanResult);
  config.projectDir = dest;

  silent(() => generateInit(config));

  // SDD files created
  assertExists(dest, 'AGENTS.md');
  assertExists(dest, 'CLAUDE.md');
  assertExists(dest, 'GEMINI.md');
  assertExists(dest, 'ai-specs/specs/base-standards.mdc');
  assertExists(dest, 'ai-specs/specs/backend-standards.mdc');
  assertExists(dest, 'docs/project_notes/key_facts.md');
  assertExists(dest, 'docs/project_notes/sprint-0-tracker.md');
  assertExists(dest, '.claude/agents/backend-developer.md');
  assertExists(dest, '.gemini/agents/backend-developer.md');
  assertExists(dest, '.gemini/skills/development-workflow/SKILL.md');
  assertExists(dest, '.gemini/commands/start-task.toml');

  // Scan detected correctly
  assertFileContains(dest, 'docs/project_notes/key_facts.md', 'my-express-app');
  assertFileContains(dest, 'ai-specs/specs/backend-standards.mdc', 'Express');
  assertFileContains(dest, 'ai-specs/specs/backend-standards.mdc', 'Prisma');
  assertFileContains(dest, 'ai-specs/specs/backend-standards.mdc', 'MVC');

  // Architecture detected as MVC
  assertFileContains(dest, 'ai-specs/specs/backend-standards.mdc', 'Architecture — MVC');

  // Prisma schema referenced in key_facts
  assertFileContains(dest, 'docs/project_notes/key_facts.md', 'prisma/schema.prisma');

  // Sprint dates set
  assertFileNotContains(dest, 'docs/project_notes/sprint-0-tracker.md', '[YYYY-MM-DD]');

  // Default autonomy L1 for init
  assertFileContains(dest, 'CLAUDE.md', 'Autonomy Level: 1 (Full Control)');

  // .gitignore appended
  assertFileContains(dest, '.gitignore', 'SDD DevFlow');

  // Backend-only: no frontend sections in key_facts
  assertFileNotContains(dest, 'docs/project_notes/key_facts.md', 'Frontend Hosting');
  assertFileNotContains(dest, 'docs/project_notes/key_facts.md', 'Frontend Port');
  assertFileNotContains(dest, 'docs/project_notes/key_facts.md', '### Frontend');

  // Backend-only: no Frontend task table in sprint tracker
  assertFileNotContains(dest, 'docs/project_notes/sprint-0-tracker.md', '### Frontend');
  assertFileNotContains(dest, 'docs/project_notes/sprint-0-tracker.md', 'F0.1');

  // Test framework capitalized in backend-standards
  assertFileContains(dest, 'ai-specs/specs/backend-standards.mdc', 'Jest');
  assertFileNotContains(dest, 'ai-specs/specs/backend-standards.mdc', 'Covers DDD');
  assertFileNotContains(dest, 'ai-specs/specs/backend-standards.mdc', 'DDD Layered');

  // Database line should not mix with app port
  assertFileNotContains(dest, 'docs/project_notes/key_facts.md', 'localhost, 4000');

  // Placeholder API spec created for backend project
  assertExists(dest, 'docs/specs/api-spec.yaml');

  // No frontend standards for backend-only
  assertNotExists(dest, 'ai-specs/specs/frontend-standards.mdc');

  // AGENTS.md Standards References adapted (Prisma project keeps Prisma)
  assertFileContains(dest, 'AGENTS.md', 'MVC, Express, Prisma');

  // Prisma project keeps Prisma-specific advice in Security/Performance
  assertFileContains(dest, 'ai-specs/specs/backend-standards.mdc', 'Prisma handles this');
  assertFileContains(dest, 'ai-specs/specs/backend-standards.mdc', 'Prisma `include`');

  // .env.example adapted with correct port
  assertExists(dest, '.env.example');
  assertFileContains(dest, '.env.example', 'PORT=4000');
  assertFileNotContains(dest, '.env.example', 'NEXT_PUBLIC');

  // Original project files untouched
  assertExists(dest, 'package.json');
  assertExists(dest, 'tsconfig.json');
  assertExists(dest, 'src/controllers');
  assertExists(dest, 'src/index.ts');
}

// --- Scenario 6: --init on Next.js-only project ---

function testInitNextjsOnly() {
  const dest = path.join(TMP_BASE, 'test-init-nextjs');
  fs.mkdirSync(dest, { recursive: true });

  // Create a mock Next.js project
  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify({
    name: 'my-nextjs-app',
    dependencies: {
      next: '^14.0.0',
      react: '^18.0.0',
      'react-dom': '^18.0.0',
      tailwindcss: '^3.0.0',
      zustand: '^4.0.0',
    },
    devDependencies: {
      typescript: '^5.0.0',
    },
  }), 'utf8');
  fs.writeFileSync(path.join(dest, 'tsconfig.json'), '{}', 'utf8');
  fs.mkdirSync(path.join(dest, 'app'), { recursive: true });
  fs.mkdirSync(path.join(dest, 'components'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'app', 'page.tsx'), '', 'utf8');

  const { scan } = require('../lib/scanner');
  const { buildInitDefaultConfig } = require('../lib/init-wizard');
  const { generateInit } = require('../lib/init-generator');

  const scanResult = scan(dest);
  const config = buildInitDefaultConfig(scanResult);
  config.projectDir = dest;

  silent(() => generateInit(config));

  // Frontend standards adapted
  assertExists(dest, 'ai-specs/specs/frontend-standards.mdc');
  assertFileContains(dest, 'ai-specs/specs/frontend-standards.mdc', 'Next.js');
  assertFileContains(dest, 'ai-specs/specs/frontend-standards.mdc', 'Tailwind CSS');
  assertFileContains(dest, 'ai-specs/specs/frontend-standards.mdc', 'Zustand');

  // key_facts has frontend stack
  assertFileContains(dest, 'docs/project_notes/key_facts.md', 'Next.js');

  // No backend agents (frontend-only detection)
  assertNotExists(dest, '.claude/agents/backend-developer.md');
  assertNotExists(dest, '.claude/agents/database-architect.md');
  assertNotExists(dest, '.gemini/agents/backend-developer.md');

  // Frontend agents exist
  assertExists(dest, '.claude/agents/frontend-developer.md');
  assertExists(dest, '.gemini/agents/frontend-developer.md');

  // Frontend-only: no backend sections in key_facts
  assertFileNotContains(dest, 'docs/project_notes/key_facts.md', 'Backend Port');
  assertFileNotContains(dest, 'docs/project_notes/key_facts.md', 'Database Port');
  assertFileNotContains(dest, 'docs/project_notes/key_facts.md', 'API Base URL');
  assertFileNotContains(dest, 'docs/project_notes/key_facts.md', 'Backend Hosting');
  assertFileNotContains(dest, 'docs/project_notes/key_facts.md', 'Database Hosting');
  assertFileNotContains(dest, 'docs/project_notes/key_facts.md', '### Backend');
  assertFileNotContains(dest, 'docs/project_notes/key_facts.md', '**ORM**');
  assertFileNotContains(dest, 'docs/project_notes/key_facts.md', '**Database**');

  // Frontend-only: no Backend task table in sprint tracker
  assertFileNotContains(dest, 'docs/project_notes/sprint-0-tracker.md', '### Backend');
  assertFileNotContains(dest, 'docs/project_notes/sprint-0-tracker.md', 'B0.1');

  // Frontend-only: no backend standards or API spec
  assertNotExists(dest, 'ai-specs/specs/backend-standards.mdc');
  assertNotExists(dest, 'docs/specs/api-spec.yaml');
}

// --- Scenario 7: --init with existing OpenAPI file ---

function testInitWithOpenAPI() {
  const dest = path.join(TMP_BASE, 'test-init-openapi');
  fs.mkdirSync(dest, { recursive: true });

  // Create a mock project with OpenAPI
  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify({
    name: 'my-api-project',
    dependencies: { express: '^4.18.0' },
  }), 'utf8');
  fs.mkdirSync(path.join(dest, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'src', 'index.js'), '', 'utf8');

  // Create a swagger.json
  const swaggerContent = JSON.stringify({ openapi: '3.0.0', info: { title: 'My API', version: '1.0.0' } });
  fs.writeFileSync(path.join(dest, 'swagger.json'), swaggerContent, 'utf8');

  const { scan } = require('../lib/scanner');
  const { buildInitDefaultConfig } = require('../lib/init-wizard');
  const { generateInit } = require('../lib/init-generator');

  const scanResult = scan(dest);
  const config = buildInitDefaultConfig(scanResult);
  config.projectDir = dest;

  silent(() => generateInit(config));

  // OpenAPI imported to docs/specs/
  assertExists(dest, 'docs/specs/api-spec.yaml');
  assertFileContains(dest, 'docs/specs/api-spec.yaml', 'My API');

  // SDD files created
  assertExists(dest, 'AGENTS.md');
  assertExists(dest, 'ai-specs/specs/base-standards.mdc');

  // Retrofit testing suggested (no test files)
  assertFileContains(dest, 'docs/project_notes/sprint-0-tracker.md', 'Retrofit Testing');

  // Express without ORM: no "Unknown (Unknown)" in backend-standards
  assertExists(dest, 'ai-specs/specs/backend-standards.mdc');
  assertFileNotContains(dest, 'ai-specs/specs/backend-standards.mdc', 'Unknown');
  // No ORM or Database lines in key_facts when not detected
  assertFileNotContains(dest, 'docs/project_notes/key_facts.md', '**ORM**');
  assertFileNotContains(dest, 'docs/project_notes/key_facts.md', '**Database**');
}

// --- Scenario 8: --init on fullstack project (Express + Next.js) ---

function testInitFullstack() {
  const dest = path.join(TMP_BASE, 'test-init-fullstack');
  fs.mkdirSync(dest, { recursive: true });

  // Create a mock fullstack project
  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify({
    name: 'my-fullstack-app',
    description: 'A fullstack app',
    dependencies: {
      express: '^4.18.0',
      mongoose: '^7.0.0',
      next: '^14.0.0',
      react: '^18.0.0',
      'react-dom': '^18.0.0',
      tailwindcss: '^3.0.0',
    },
    devDependencies: {
      typescript: '^5.0.0',
      vitest: '^1.0.0',
    },
  }), 'utf8');
  fs.writeFileSync(path.join(dest, 'tsconfig.json'), '{}', 'utf8');
  fs.mkdirSync(path.join(dest, 'src', 'controllers'), { recursive: true });
  fs.mkdirSync(path.join(dest, 'src', 'models'), { recursive: true });
  fs.mkdirSync(path.join(dest, 'app'), { recursive: true });
  fs.mkdirSync(path.join(dest, 'components'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'src', 'index.ts'), '', 'utf8');
  fs.writeFileSync(path.join(dest, 'app', 'page.tsx'), '', 'utf8');

  const { scan } = require('../lib/scanner');
  const { buildInitDefaultConfig } = require('../lib/init-wizard');
  const { generateInit } = require('../lib/init-generator');

  const scanResult = scan(dest);
  const config = buildInitDefaultConfig(scanResult);
  config.projectDir = dest;

  silent(() => generateInit(config));

  // Both standards files created
  assertExists(dest, 'ai-specs/specs/backend-standards.mdc');
  assertExists(dest, 'ai-specs/specs/frontend-standards.mdc');

  // Both agent sets exist
  assertExists(dest, '.claude/agents/backend-developer.md');
  assertExists(dest, '.claude/agents/frontend-developer.md');
  assertExists(dest, '.gemini/agents/backend-developer.md');
  assertExists(dest, '.gemini/agents/frontend-developer.md');

  // key_facts has both stacks
  assertFileContains(dest, 'docs/project_notes/key_facts.md', 'Express');
  assertFileContains(dest, 'docs/project_notes/key_facts.md', 'Next.js');
  assertFileContains(dest, 'docs/project_notes/key_facts.md', 'Backend Port');
  assertFileContains(dest, 'docs/project_notes/key_facts.md', 'Frontend Port');

  // Both Infrastructure hosting lines present
  assertFileContains(dest, 'docs/project_notes/key_facts.md', 'Frontend Hosting');
  assertFileContains(dest, 'docs/project_notes/key_facts.md', 'Backend Hosting');

  // Both Reusable Components subsections present
  assertFileContains(dest, 'docs/project_notes/key_facts.md', '### Backend');
  assertFileContains(dest, 'docs/project_notes/key_facts.md', '### Frontend');

  // Sprint tracker has both task tables
  assertFileContains(dest, 'docs/project_notes/sprint-0-tracker.md', '### Backend');
  assertFileContains(dest, 'docs/project_notes/sprint-0-tracker.md', '### Frontend');
  assertFileContains(dest, 'docs/project_notes/sprint-0-tracker.md', 'B0.1');
  assertFileContains(dest, 'docs/project_notes/sprint-0-tracker.md', 'F0.1');

  // Vitest detected and capitalized
  assertFileContains(dest, 'ai-specs/specs/backend-standards.mdc', 'Vitest');

  // Mongoose detected — ORM line present, not Unknown
  assertFileContains(dest, 'docs/project_notes/key_facts.md', 'Mongoose');
  assertFileNotContains(dest, 'docs/project_notes/key_facts.md', 'Unknown');

  // Prisma-specific advice replaced for Mongoose project
  assertFileNotContains(dest, 'ai-specs/specs/backend-standards.mdc', 'Prisma handles this');
  assertFileNotContains(dest, 'ai-specs/specs/backend-standards.mdc', 'Prisma `include`');
  assertFileContains(dest, 'ai-specs/specs/backend-standards.mdc', 'prevent injection');
  assertFileContains(dest, 'ai-specs/specs/backend-standards.mdc', 'N+1 queries');

  // AGENTS.md Standards References adapted
  assertFileContains(dest, 'AGENTS.md', 'MVC, Express, Mongoose');
  assertFileNotContains(dest, 'AGENTS.md', 'DDD, Express, Prisma');

  // MongoDB-specific DB hosting examples
  assertFileContains(dest, 'docs/project_notes/key_facts.md', 'MongoDB Atlas');

  // .env.example adapted for MongoDB
  assertExists(dest, '.env.example');
  assertFileContains(dest, '.env.example', 'MONGODB_URI');
  assertFileNotContains(dest, '.env.example', 'postgresql://');
}

// --- Run all ---

console.log('\nSmoke tests\n');

setup();

try {
  console.log('  New project scenarios:');
  run('Scenario 1: Default fullstack project', testDefaults);
  run('Scenario 2: Backend only project', testBackendOnly);
  run('Scenario 3: Claude only + custom config', testClaudeOnly);
  run('Scenario 4: Gemini only + skills/commands', testGeminiOnly);
  console.log('\n  Init scenarios (existing projects):');
  run('Scenario 5: --init Express+Prisma (MVC)', testInitExpressPrisma);
  run('Scenario 6: --init Next.js only', testInitNextjsOnly);
  run('Scenario 7: --init with existing OpenAPI', testInitWithOpenAPI);
  run('Scenario 8: --init fullstack (Express + Next.js)', testInitFullstack);
} finally {
  cleanup();
}

console.log(`\n  ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
