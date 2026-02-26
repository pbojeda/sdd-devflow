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
  assertExists(dest, 'docs/project_notes/product-tracker.md');

  // Placeholders replaced
  assertFileContains(dest, 'docs/project_notes/key_facts.md', 'test-defaults');
  assertFileNotContains(dest, 'docs/project_notes/key_facts.md', '[Your project name]');
  assertFileContains(dest, 'docs/specs/api-spec.yaml', 'test-defaults API');

  // Product tracker exists with feature table
  assertFileContains(dest, 'docs/project_notes/product-tracker.md', 'F001');

  // Default autonomy L2
  assertFileContains(dest, 'CLAUDE.md', 'Autonomy Level: 2 (Trusted)');
  assertFileContains(dest, 'GEMINI.md', 'Autonomy Level: 2 (Trusted)');

  // Gemini skills and commands exist
  assertExists(dest, '.gemini/skills/development-workflow/SKILL.md');
  assertExists(dest, '.gemini/skills/bug-workflow/SKILL.md');
  assertExists(dest, '.gemini/skills/project-memory/SKILL.md');
  assertExists(dest, '.gemini/commands/start-task.toml');

  // No sprint references in generated output (regression guard)
  assertNotExists(dest, 'docs/project_notes/sprint-0-tracker.md');
  assertFileNotContains(dest, 'docs/project_notes/product-tracker.md', 'sprint');
  assertFileNotContains(dest, 'CLAUDE.md', 'sprint');

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
  assertExists(dest, 'docs/project_notes/product-tracker.md');
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

  // Product tracker has feature table
  assertFileContains(dest, 'docs/project_notes/product-tracker.md', 'F001');

  // Default autonomy L1 for init
  assertFileContains(dest, 'CLAUDE.md', 'Autonomy Level: 1 (Full Control)');

  // .gitignore appended
  assertFileContains(dest, '.gitignore', 'SDD DevFlow');

  // Backend-only: no frontend sections in key_facts
  assertFileNotContains(dest, 'docs/project_notes/key_facts.md', 'Frontend Hosting');
  assertFileNotContains(dest, 'docs/project_notes/key_facts.md', 'Frontend Port');
  assertFileNotContains(dest, 'docs/project_notes/key_facts.md', '### Frontend');

  // Backend-only: product tracker default type is backend
  assertFileContains(dest, 'docs/project_notes/product-tracker.md', '| backend |');

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

  // Bug #3: base-standards adapted — no Zod prescription for non-Zod project
  assertFileNotContains(dest, 'ai-specs/specs/base-standards.mdc', 'Zod recommended');
  assertFileContains(dest, 'ai-specs/specs/base-standards.mdc', 'runtime validation at system boundaries');
  // Backend-only: Shared Types section not applicable
  assertFileContains(dest, 'ai-specs/specs/base-standards.mdc', 'Not applicable');

  // Agent/skill Zod references replaced (no Zod in project)
  assertFileNotContains(dest, '.claude/agents/backend-developer.md', 'Zod');
  assertFileContains(dest, '.claude/agents/backend-developer.md', 'validation schemas');
  assertFileNotContains(dest, '.claude/agents/backend-planner.md', 'Zod');
  assertFileNotContains(dest, '.claude/agents/spec-creator.md', 'Zod');
  assertFileNotContains(dest, '.claude/skills/development-workflow/SKILL.md', 'Zod');

  // Prisma kept in agent descriptions (correct for Prisma project)
  assertFileContains(dest, '.claude/agents/backend-developer.md', 'Prisma');

  // documentation-standards: no frontend-standards row for backend-only
  assertFileNotContains(dest, 'ai-specs/specs/documentation-standards.mdc', 'frontend-standards');

  // .env.example adapted with correct port
  assertExists(dest, '.env.example');
  assertFileContains(dest, '.env.example', 'PORT=4000');
  assertFileNotContains(dest, '.env.example', 'NEXT_PUBLIC');

  // No sprint references in generated output (regression guard)
  assertNotExists(dest, 'docs/project_notes/sprint-0-tracker.md');
  assertFileNotContains(dest, 'docs/project_notes/product-tracker.md', 'sprint');

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

  // Frontend-only: product tracker default type is frontend
  assertFileContains(dest, 'docs/project_notes/product-tracker.md', '| frontend |');

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
  assertFileContains(dest, 'docs/project_notes/product-tracker.md', 'Retrofit');

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

  // Product tracker has fullstack type for fullstack project
  assertFileContains(dest, 'docs/project_notes/product-tracker.md', '| fullstack |');

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

  // Bug #6: Mongoose patterns generated (not just a TODO)
  assertFileContains(dest, 'ai-specs/specs/backend-standards.mdc', 'Mongoose Best Practices');
  assertFileContains(dest, 'ai-specs/specs/backend-standards.mdc', '.lean()');
  assertFileNotContains(dest, 'ai-specs/specs/backend-standards.mdc', 'TODO: Add Mongoose');

  // Bug #3: base-standards adapted — no Zod for non-Zod fullstack project
  assertFileNotContains(dest, 'ai-specs/specs/base-standards.mdc', 'Zod recommended');
  assertFileContains(dest, 'ai-specs/specs/base-standards.mdc', 'runtime validation at system boundaries');
  // Fullstack but no Zod: Shared Types section generalized (no Zod schemas mention)
  assertFileNotContains(dest, 'ai-specs/specs/base-standards.mdc', 'Zod schemas');

  // AGENTS.md Standards References adapted
  assertFileContains(dest, 'AGENTS.md', 'MVC, Express, Mongoose');
  assertFileNotContains(dest, 'AGENTS.md', 'DDD, Express, Prisma');

  // Agent Zod references replaced (no Zod in project)
  assertFileNotContains(dest, '.claude/agents/backend-developer.md', 'Zod');
  assertFileContains(dest, '.claude/agents/backend-developer.md', 'validation schemas');
  assertFileNotContains(dest, '.claude/agents/spec-creator.md', 'Zod');

  // Agent ORM references adapted for Mongoose
  assertFileContains(dest, '.claude/agents/backend-developer.md', 'Mongoose');
  assertFileNotContains(dest, '.claude/agents/backend-developer.md', 'Prisma ORM');
  assertFileContains(dest, '.claude/agents/backend-developer.md', 'Repository implementations (Mongoose)');

  // Skill Zod references replaced
  assertFileNotContains(dest, '.claude/skills/development-workflow/SKILL.md', 'Zod');

  // MongoDB-specific DB hosting examples
  assertFileContains(dest, 'docs/project_notes/key_facts.md', 'MongoDB Atlas');

  // .env.example adapted for MongoDB
  assertExists(dest, '.env.example');
  assertFileContains(dest, '.env.example', 'MONGODB_URI');
  assertFileNotContains(dest, '.env.example', 'postgresql://');
}

// --- Scenario 9: --init error conditions ---

function testInitErrorConditions() {
  const { scan } = require('../lib/scanner');

  // Error: no package.json → CLI should reject (we test scanner returns empty)
  const emptyDir = path.join(TMP_BASE, 'test-init-empty');
  fs.mkdirSync(emptyDir, { recursive: true });
  const emptyResult = scan(emptyDir);
  assert.strictEqual(emptyResult.backend.detected, false, 'No backend detected in empty dir');
  assert.strictEqual(emptyResult.frontend.detected, false, 'No frontend detected in empty dir');
  assert.strictEqual(emptyResult.projectName, path.basename(emptyDir), 'Falls back to dir name');

  // Error: CLI rejects --init without package.json
  try {
    execSync(`node ${CLI} --init --yes`, { cwd: emptyDir, stdio: 'pipe' });
    assert.fail('Should have thrown for missing package.json');
  } catch (err) {
    assert.ok(err.stderr.toString().includes('No package.json'), 'Error mentions missing package.json');
  }

  // Error: CLI rejects --init when ai-specs/ already exists
  const existingDir = path.join(TMP_BASE, 'test-init-existing');
  fs.mkdirSync(existingDir, { recursive: true });
  fs.writeFileSync(path.join(existingDir, 'package.json'), '{"name":"test"}', 'utf8');
  fs.mkdirSync(path.join(existingDir, 'ai-specs'), { recursive: true });
  try {
    execSync(`node ${CLI} --init --yes`, { cwd: existingDir, stdio: 'pipe' });
    assert.fail('Should have thrown for existing ai-specs/');
  } catch (err) {
    assert.ok(err.stderr.toString().includes('already'), 'Error mentions already installed');
  }

  // Error: CLI rejects --init with project name
  const validDir = path.join(TMP_BASE, 'test-init-with-name');
  fs.mkdirSync(validDir, { recursive: true });
  fs.writeFileSync(path.join(validDir, 'package.json'), '{"name":"test"}', 'utf8');
  try {
    execSync(`node ${CLI} --init myproject`, { cwd: validDir, stdio: 'pipe' });
    assert.fail('Should have thrown for --init with project name');
  } catch (err) {
    assert.ok(err.stderr.toString().includes('Cannot specify'), 'Error mentions cannot specify name');
  }
}

// --- Scenario 10: Scanner edge cases ---

function testScannerEdgeCases() {
  const { scan } = require('../lib/scanner');

  // Edge: Prisma schema with generator before datasource
  const prismaDir = path.join(TMP_BASE, 'test-scanner-prisma');
  fs.mkdirSync(path.join(prismaDir, 'prisma'), { recursive: true });
  fs.writeFileSync(path.join(prismaDir, 'package.json'), JSON.stringify({
    name: 'test-prisma-order',
    dependencies: { express: '^4.0.0', '@prisma/client': '^5.0.0' },
  }), 'utf8');
  fs.writeFileSync(path.join(prismaDir, 'prisma', 'schema.prisma'), [
    'generator client {',
    '  provider = "prisma-client-js"',
    '}',
    '',
    'datasource db {',
    '  provider = "mysql"',
    '  url = env("DATABASE_URL")',
    '}',
  ].join('\n'), 'utf8');

  const prismaResult = scan(prismaDir);
  assert.strictEqual(prismaResult.backend.db, 'MySQL', 'Detects MySQL from datasource block, not generator');

  // Edge: Quoted PORT value in .env
  const quotedPortDir = path.join(TMP_BASE, 'test-scanner-port');
  fs.mkdirSync(quotedPortDir, { recursive: true });
  fs.writeFileSync(path.join(quotedPortDir, 'package.json'), JSON.stringify({
    name: 'test-port', dependencies: { express: '^4.0.0' },
  }), 'utf8');
  fs.writeFileSync(path.join(quotedPortDir, '.env'), 'PORT="5000"\n', 'utf8');

  const portResult = scan(quotedPortDir);
  assert.strictEqual(portResult.backend.port, 5000, 'Detects quoted PORT value');

  // Edge: MONGODB_URI in .env (no ORM)
  const mongoEnvDir = path.join(TMP_BASE, 'test-scanner-mongo-env');
  fs.mkdirSync(mongoEnvDir, { recursive: true });
  fs.writeFileSync(path.join(mongoEnvDir, 'package.json'), JSON.stringify({
    name: 'test-mongo-env', dependencies: { express: '^4.0.0' },
  }), 'utf8');
  fs.writeFileSync(path.join(mongoEnvDir, '.env'), 'MONGODB_URI=mongodb://localhost:27017/test\n', 'utf8');

  const mongoResult = scan(mongoEnvDir);
  assert.strictEqual(mongoResult.backend.db, 'MongoDB', 'Detects MongoDB from MONGODB_URI env var');

  // Edge: Expanded framework detection
  const expandedDir = path.join(TMP_BASE, 'test-scanner-expanded');
  fs.mkdirSync(expandedDir, { recursive: true });
  fs.writeFileSync(path.join(expandedDir, 'package.json'), JSON.stringify({
    name: 'test-expanded',
    dependencies: {
      nuxt: '^3.0.0',
      '@headlessui/react': '^1.0.0',
      jotai: '^2.0.0',
    },
    devDependencies: {
      '@playwright/test': '^1.0.0',
    },
  }), 'utf8');

  const expandedResult = scan(expandedDir);
  assert.strictEqual(expandedResult.frontend.framework, 'Nuxt', 'Detects Nuxt');
  assert.strictEqual(expandedResult.frontend.components, 'Headless UI', 'Detects Headless UI');
  assert.strictEqual(expandedResult.frontend.state, 'Jotai', 'Detects Jotai');
  assert.strictEqual(expandedResult.tests.e2eFramework, 'playwright', 'Detects Playwright');

  // Edge: Backend ORM without framework
  const ormOnlyDir = path.join(TMP_BASE, 'test-scanner-orm-only');
  fs.mkdirSync(ormOnlyDir, { recursive: true });
  fs.writeFileSync(path.join(ormOnlyDir, 'package.json'), JSON.stringify({
    name: 'test-orm-only',
    dependencies: { knex: '^3.0.0' },
  }), 'utf8');

  const ormOnlyResult = scan(ormOnlyDir);
  assert.strictEqual(ormOnlyResult.backend.detected, true, 'Backend detected from ORM alone');
  assert.strictEqual(ormOnlyResult.backend.orm, 'Knex', 'Detects Knex');
  assert.strictEqual(ormOnlyResult.backend.framework, null, 'No framework when only ORM');
}

// --- Scenario 11: --init with ORM-only project (no framework) ---

function testInitOrmOnly() {
  const dest = path.join(TMP_BASE, 'test-init-orm-only');
  fs.mkdirSync(dest, { recursive: true });

  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify({
    name: 'my-orm-only-app',
    dependencies: { knex: '^3.0.0' },
    devDependencies: { typescript: '^5.0.0' },
  }), 'utf8');
  fs.writeFileSync(path.join(dest, 'tsconfig.json'), '{}', 'utf8');
  fs.mkdirSync(path.join(dest, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'src', 'index.ts'), '', 'utf8');

  const { scan } = require('../lib/scanner');
  const { buildInitDefaultConfig } = require('../lib/init-wizard');
  const { generateInit } = require('../lib/init-generator');

  const scanResult = scan(dest);
  const config = buildInitDefaultConfig(scanResult);
  config.projectDir = dest;

  silent(() => generateInit(config));

  // No "Unknown" anywhere in key_facts or backend-standards
  assertFileNotContains(dest, 'docs/project_notes/key_facts.md', 'Unknown');
  assertFileNotContains(dest, 'ai-specs/specs/backend-standards.mdc', 'Unknown');

  // Backend line shows just runtime, not "Unknown, Node.js"
  assertFileContains(dest, 'docs/project_notes/key_facts.md', 'Node.js (TypeScript)');

  // ORM detected
  assertFileContains(dest, 'docs/project_notes/key_facts.md', 'Knex');

  // backend-standards has no Framework line when framework is null
  assertFileNotContains(dest, 'ai-specs/specs/backend-standards.mdc', '**Framework**: Unknown');
}

// --- Scenario 12: --init with existing files (skip behavior) ---

function testInitSkipExisting() {
  const dest = path.join(TMP_BASE, 'test-init-skip');
  fs.mkdirSync(dest, { recursive: true });

  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify({
    name: 'my-skip-app',
    dependencies: { express: '^4.0.0' },
  }), 'utf8');
  fs.mkdirSync(path.join(dest, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'src', 'index.js'), '', 'utf8');

  // Pre-create some SDD files
  fs.writeFileSync(path.join(dest, 'AGENTS.md'), '# Custom AGENTS\n', 'utf8');
  fs.writeFileSync(path.join(dest, '.env.example'), 'CUSTOM=true\n', 'utf8');

  const { scan } = require('../lib/scanner');
  const { buildInitDefaultConfig } = require('../lib/init-wizard');
  const { generateInit } = require('../lib/init-generator');

  const scanResult = scan(dest);
  const config = buildInitDefaultConfig(scanResult);
  config.projectDir = dest;

  silent(() => generateInit(config));

  // Existing files NOT overwritten
  assertFileContains(dest, 'AGENTS.md', 'Custom AGENTS');
  assertFileContains(dest, '.env.example', 'CUSTOM=true');

  // But new files are still created
  assertExists(dest, 'CLAUDE.md');
  assertExists(dest, 'ai-specs/specs/base-standards.mdc');
  assertExists(dest, 'docs/project_notes/key_facts.md');
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
  console.log('\n  Edge cases & error conditions:');
  run('Scenario 9: --init error conditions', testInitErrorConditions);
  run('Scenario 10: Scanner edge cases', testScannerEdgeCases);
  run('Scenario 11: --init ORM-only (no framework)', testInitOrmOnly);
  run('Scenario 12: --init skip existing files', testInitSkipExisting);
} finally {
  cleanup();
}

console.log(`\n  ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
