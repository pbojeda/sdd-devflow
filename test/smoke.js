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
  assertExists(dest, 'docs/specs/design-guidelines.md');
  assertExists(dest, '.claude/agents/ui-ux-designer.md');
  assertExists(dest, '.gemini/agents/ui-ux-designer.md');
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

  // .gemini/settings.json uses object format for model (v0.16.7 fix — Gemini CLI 0.34+ requires object)
  const geminiSettingsPath = path.join(dest, '.gemini', 'settings.json');
  const geminiSettings = JSON.parse(fs.readFileSync(geminiSettingsPath, 'utf8'));
  assert(
    typeof geminiSettings.model === 'object'
      && geminiSettings.model !== null
      && !Array.isArray(geminiSettings.model),
    '.gemini/settings.json model must be a valid object (not string)'
  );
  assert(geminiSettings.model.name === 'gemini-2.5-pro', '.gemini/settings.json model.name must be set');

  // Merge Checklist Evidence in ticket template (B+D)
  assertFileContains(dest, '.claude/skills/development-workflow/references/ticket-template.md', '## Merge Checklist Evidence');
  assertFileContains(dest, '.gemini/skills/development-workflow/references/ticket-template.md', '## Merge Checklist Evidence');
  assertFileContains(dest, '.claude/skills/development-workflow/references/merge-checklist.md', 'Fill Merge Checklist Evidence');
  assertFileContains(dest, '.gemini/skills/development-workflow/references/merge-checklist.md', 'Fill Merge Checklist Evidence');

  // Simple tasks generate lite ticket (B+D coverage for all tiers)
  assertFileContains(dest, '.claude/skills/development-workflow/SKILL.md', '| Simple | Skip | Lite | Skip | Skip |');
  assertFileContains(dest, '.gemini/skills/development-workflow/SKILL.md', '| Simple | Skip | Lite | Skip | Skip |');
  assertFileContains(dest, '.claude/skills/development-workflow/SKILL.md', 'lite ticket');
  assertFileContains(dest, '.claude/skills/development-workflow/references/merge-checklist.md', 'Simple (lite ticket)');
  assertFileContains(dest, '.gemini/skills/development-workflow/references/merge-checklist.md', 'Simple (lite ticket)');

  // Compact hook injects SKILL.md re-read instruction (post-compact recovery)
  assertFileContains(dest, '.claude/settings.json', 'Re-read the SKILL.md');
  assertFileContains(dest, '.claude/settings.json', 'merge-checklist.md');

  // Session Recovery in CLAUDE.md includes merge checklist reminder
  assertFileContains(dest, 'CLAUDE.md', 'merge-checklist.md');

  // Context-prompt command exists for both tools
  assertExists(dest, '.claude/commands/context-prompt.md');
  assertFileContains(dest, '.claude/commands/context-prompt.md', 'Workflow Recovery');
  assertFileContains(dest, '.claude/commands/context-prompt.md', 'merge-checklist.md');
  assertExists(dest, '.gemini/commands/context-prompt.toml');
  assertExists(dest, '.gemini/commands/context-prompt-instructions.md');
  assertFileContains(dest, '.gemini/commands/context-prompt-instructions.md', 'Workflow Recovery');
  assertFileContains(dest, '.gemini/commands/context-prompt-instructions.md', 'merge-checklist.md');

  // Review-project command exists for both tools
  assertExists(dest, '.claude/commands/review-project.md');
  assertFileContains(dest, '.claude/commands/review-project.md', 'Phase 0: Discovery');
  assertFileContains(dest, '.claude/commands/review-project.md', 'domain-by-domain');
  assertExists(dest, '.gemini/commands/review-project.toml');
  assertExists(dest, '.gemini/commands/review-project-instructions.md');
  assertFileContains(dest, '.gemini/commands/review-project-instructions.md', 'Phase 0: Discovery');

  // Review-spec command exists for both tools with hardened shell patterns
  assertExists(dest, '.claude/commands/review-spec.md');
  assertFileContains(dest, '.claude/commands/review-spec.md', 'Completeness');
  assertFileContains(dest, '.claude/commands/review-spec.md', 'key_facts.md');
  assertFileContains(dest, '.claude/commands/review-spec.md', 'command -v');
  assertFileContains(dest, '.claude/commands/review-spec.md', 'REVIEW_DIR');
  assertFileContains(dest, '.claude/commands/review-spec.md', 'Definition of Done');
  assertExists(dest, '.gemini/commands/review-spec.toml');
  assertExists(dest, '.gemini/commands/review-spec-instructions.md');
  assertFileContains(dest, '.gemini/commands/review-spec-instructions.md', 'Completeness');
  assertFileContains(dest, '.gemini/commands/review-spec-instructions.md', 'REVIEW_DIR');

  // No sprint references in generated output (regression guard)
  assertNotExists(dest, 'docs/project_notes/sprint-0-tracker.md');
  assertFileNotContains(dest, 'docs/project_notes/product-tracker.md', 'sprint');
  assertFileNotContains(dest, 'CLAUDE.md', 'sprint');

  // No internal files leaked
  assertNotExists(dest, 'docs/project_notes/pending-improvements.md');

  // package.json generated with project name
  assertExists(dest, 'package.json');
  assertFileContains(dest, 'package.json', '"name": "test-defaults"');
  assertFileContains(dest, 'package.json', '"private": true');

  // gitignore renamed (no bare 'gitignore' file left)
  assertNotExists(dest, 'gitignore');
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
  assertNotExists(dest, '.claude/agents/ui-ux-designer.md');
  assertNotExists(dest, '.gemini/agents/ui-ux-designer.md');
  assertNotExists(dest, 'docs/specs/ui-components.md');
  assertNotExists(dest, 'docs/specs/design-guidelines.md');

  // documentation-standards cleaned for backend-only
  assertFileNotContains(dest, 'ai-specs/specs/documentation-standards.mdc', 'frontend-standards');
  assertFileNotContains(dest, 'ai-specs/specs/documentation-standards.mdc', 'ui-components');

  // AGENTS.md: no Zod reference, no Frontend Standards
  assertFileNotContains(dest, 'AGENTS.md', 'Zod');
  assertFileContains(dest, 'AGENTS.md', 'Shared type schemas');
  assertFileNotContains(dest, 'AGENTS.md', 'Frontend Standards');
  assertFileContains(dest, 'AGENTS.md', 'Backend Standards');

  // Agent content: no frontend refs for backend-only
  assertFileNotContains(dest, '.claude/agents/spec-creator.md', 'ui-components');
  assertFileNotContains(dest, '.claude/agents/code-review-specialist.md', 'frontend-standards');
  assertFileNotContains(dest, '.claude/agents/qa-engineer.md', 'ui-components');
  assertFileNotContains(dest, '.claude/agents/qa-engineer.md', 'frontend-standards');
  assertFileContains(dest, '.claude/agents/qa-engineer.md', 'backend-standards');
  assertFileNotContains(dest, '.gemini/agents/qa-engineer.md', 'frontend-standards');
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

  // Context-prompt command exists for Gemini-only
  assertExists(dest, '.gemini/commands/context-prompt.toml');
  assertExists(dest, '.gemini/commands/context-prompt-instructions.md');
  assertFileContains(dest, '.gemini/commands/context-prompt-instructions.md', 'Workflow Recovery');

  // Review-project command exists for Gemini-only
  assertExists(dest, '.gemini/commands/review-project.toml');
  assertExists(dest, '.gemini/commands/review-project-instructions.md');
  assertFileContains(dest, '.gemini/commands/review-project-instructions.md', 'Phase 0: Discovery');

  // Review-spec command exists for Gemini-only with hardened shell patterns
  assertExists(dest, '.gemini/commands/review-spec.toml');
  assertExists(dest, '.gemini/commands/review-spec-instructions.md');
  assertFileContains(dest, '.gemini/commands/review-spec-instructions.md', 'Completeness');
  assertFileContains(dest, '.gemini/commands/review-spec-instructions.md', 'REVIEW_DIR');
  assertFileContains(dest, '.gemini/commands/review-spec-instructions.md', 'command -v');

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

  // MVC architecture: DDD-specific content replaced in agents
  assertFileNotContains(dest, '.claude/agents/backend-developer.md', 'Domain-Driven Design');
  assertFileNotContains(dest, '.claude/agents/backend-developer.md', 'Domain Layer');
  assertFileContains(dest, '.claude/agents/backend-developer.md', 'layered architecture');
  assertFileNotContains(dest, '.claude/agents/backend-planner.md', 'Domain-Driven Design');
  assertFileNotContains(dest, '.claude/agents/backend-planner.md', 'backend/src/domain');
  assertFileContains(dest, '.claude/agents/backend-planner.md', 'backend-standards.mdc');

  // AGENTS.md: no Frontend Standards for backend-only
  assertFileNotContains(dest, 'AGENTS.md', 'Frontend Standards');
  assertFileContains(dest, 'AGENTS.md', 'Backend Standards');

  // documentation-standards: no frontend refs for backend-only
  assertFileNotContains(dest, 'ai-specs/specs/documentation-standards.mdc', 'frontend-standards');
  assertFileNotContains(dest, 'ai-specs/specs/documentation-standards.mdc', 'ui-components');

  // base-standards: no frontend refs for backend-only
  assertFileNotContains(dest, 'ai-specs/specs/base-standards.mdc', 'ui-components');
  assertFileNotContains(dest, 'ai-specs/specs/base-standards.mdc', '`frontend-standards.mdc`');

  // Agent content: no frontend refs for backend-only (Claude + Gemini)
  assertFileNotContains(dest, '.claude/agents/spec-creator.md', 'ui-components');
  assertFileNotContains(dest, '.claude/agents/spec-creator.md', 'frontend-standards');
  assertFileNotContains(dest, '.claude/agents/production-code-validator.md', 'ui-components');
  assertFileNotContains(dest, '.claude/agents/code-review-specialist.md', 'frontend-standards');
  assertFileNotContains(dest, '.claude/agents/code-review-specialist.md', 'ui-components');
  assertFileNotContains(dest, '.claude/agents/qa-engineer.md', 'ui-components');
  assertFileNotContains(dest, '.claude/agents/qa-engineer.md', 'frontend-standards');
  assertFileContains(dest, '.claude/agents/qa-engineer.md', 'backend-standards');
  assertFileNotContains(dest, '.gemini/agents/qa-engineer.md', 'frontend-standards');
  assertFileContains(dest, '.gemini/agents/qa-engineer.md', 'backend-standards');
  assertFileNotContains(dest, '.gemini/agents/spec-creator.md', 'ui-components');
  assertFileNotContains(dest, '.gemini/agents/production-code-validator.md', 'ui-components');

  // Skill content: no frontend refs for backend-only
  assertFileNotContains(dest, '.claude/skills/development-workflow/SKILL.md', 'ui-components');
  assertFileNotContains(dest, '.claude/skills/development-workflow/references/ticket-template.md', 'ui-components');
  assertFileNotContains(dest, '.claude/skills/development-workflow/references/pr-template.md', 'ui-components');

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

  // Frontend agents exist (including ui-ux-designer)
  assertExists(dest, '.claude/agents/frontend-developer.md');
  assertExists(dest, '.claude/agents/ui-ux-designer.md');
  assertExists(dest, '.gemini/agents/frontend-developer.md');
  assertExists(dest, '.gemini/agents/ui-ux-designer.md');
  assertExists(dest, 'docs/specs/design-guidelines.md');

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

  // AGENTS.md: no Backend Standards for frontend-only
  assertFileNotContains(dest, 'AGENTS.md', 'Backend Standards');
  assertFileContains(dest, 'AGENTS.md', 'Frontend Standards');

  // Frontend-only: agent content adapted for frontend-only
  assertFileNotContains(dest, '.claude/agents/code-review-specialist.md', 'backend-standards');
  assertFileContains(dest, '.claude/agents/code-review-specialist.md', 'frontend-standards');
  assertFileNotContains(dest, '.claude/agents/qa-engineer.md', 'backend-standards');
  assertFileContains(dest, '.claude/agents/qa-engineer.md', 'frontend-standards');
  assertFileNotContains(dest, '.gemini/agents/qa-engineer.md', 'backend-standards');
  assertFileContains(dest, '.gemini/agents/qa-engineer.md', 'frontend-standards');

  // Frontend-only: SKILL.md adapted (no api-spec refs)
  assertFileNotContains(dest, '.claude/skills/development-workflow/SKILL.md', 'api-spec');
  assertFileNotContains(dest, '.gemini/skills/development-workflow/SKILL.md', 'api-spec');
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
  // MVC architecture: DDD-specific layer names replaced with generic
  assertFileNotContains(dest, '.claude/agents/backend-developer.md', 'Domain Layer');
  assertFileNotContains(dest, '.claude/agents/backend-developer.md', 'DDD');
  assertFileContains(dest, '.claude/agents/backend-developer.md', 'backend-standards.mdc');

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

// --- Scenario 13: New project with Mongoose preset ---

function testGenerateMongoose() {
  const dest = path.join(TMP_BASE, 'test-mongoose-new');

  const { generate } = require('../lib/generator');
  const { BACKEND_STACKS } = require('../lib/config');

  const mongoosePreset = BACKEND_STACKS.find(s => s.key === 'express-mongo-mongoose');

  silent(() => generate({
    projectName: 'test-mongoose-new',
    projectDir: dest,
    description: 'Mongoose new project test',
    businessContext: '',
    projectType: 'backend',
    backendStack: 'express-mongo-mongoose',
    backendPreset: mongoosePreset,
    frontendStack: 'nextjs-tailwind-radix',
    aiTools: 'both',
    autonomyLevel: 2,
    autonomyName: 'Trusted',
    branching: 'github-flow',
    backendPort: 3010,
    frontendPort: 3000,
  }));

  // Agent ORM references adapted for Mongoose (Claude agents have detailed stack description)
  assertFileContains(dest, '.claude/agents/backend-developer.md', 'Mongoose');
  assertFileNotContains(dest, '.claude/agents/backend-developer.md', 'Prisma ORM');
  assertFileContains(dest, '.claude/agents/backend-planner.md', 'Mongoose');

  // documentation-standards cleaned for backend-only
  assertFileNotContains(dest, 'ai-specs/specs/documentation-standards.mdc', 'frontend-standards');
  assertFileNotContains(dest, 'ai-specs/specs/documentation-standards.mdc', 'ui-components');
}

// --- Scenario 14: --init Gemini-only + backend-only ---

function testInitGeminiBackendOnly() {
  const dest = path.join(TMP_BASE, 'test-init-gemini-backend');
  fs.mkdirSync(dest, { recursive: true });

  // Create a mock Express+Mongoose backend project
  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify({
    name: 'my-gemini-backend',
    dependencies: {
      express: '^4.18.0',
      mongoose: '^7.0.0',
    },
    devDependencies: {
      jest: '^29.0.0',
      typescript: '^5.0.0',
    },
  }), 'utf8');
  fs.writeFileSync(path.join(dest, 'tsconfig.json'), '{}', 'utf8');
  fs.mkdirSync(path.join(dest, 'src', 'controllers'), { recursive: true });
  fs.mkdirSync(path.join(dest, 'src', 'models'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'src', 'index.ts'), '', 'utf8');
  fs.writeFileSync(path.join(dest, '.gitignore'), 'node_modules\n', 'utf8');

  const { scan } = require('../lib/scanner');
  const { buildInitDefaultConfig } = require('../lib/init-wizard');
  const { generateInit } = require('../lib/init-generator');

  const scanResult = scan(dest);
  const config = buildInitDefaultConfig(scanResult);
  config.projectDir = dest;
  config.aiTools = 'gemini'; // Force Gemini-only

  silent(() => generateInit(config));

  // Only Gemini files exist
  assertExists(dest, 'GEMINI.md');
  assertExists(dest, '.gemini/agents/backend-developer.md');
  assertExists(dest, '.gemini/skills/development-workflow/SKILL.md');
  assertNotExists(dest, 'CLAUDE.md');
  assertNotExists(dest, '.claude');

  // Backend-only: no frontend agents
  assertNotExists(dest, '.gemini/agents/frontend-developer.md');
  assertNotExists(dest, '.gemini/agents/frontend-planner.md');
  assertNotExists(dest, '.gemini/agents/ui-ux-designer.md');

  // Gemini agents adapted: no Zod, no DDD, no frontend refs
  // Note: Gemini backend-developer.md uses condensed format without explicit ORM/DB names
  assertFileNotContains(dest, '.gemini/agents/backend-developer.md', 'Zod');
  assertFileNotContains(dest, '.gemini/agents/backend-developer.md', 'DDD');
  assertFileNotContains(dest, '.gemini/agents/backend-planner.md', 'DDD');
  assertFileNotContains(dest, '.gemini/agents/spec-creator.md', 'ui-components');
  assertFileNotContains(dest, '.gemini/agents/production-code-validator.md', 'ui-components');
  assertFileNotContains(dest, '.gemini/agents/code-review-specialist.md', 'frontend-standards');
  assertFileNotContains(dest, '.gemini/agents/qa-engineer.md', 'frontend-standards');
  assertFileContains(dest, '.gemini/agents/qa-engineer.md', 'backend-standards');

  // Skills adapted: no ui-components
  assertFileNotContains(dest, '.gemini/skills/development-workflow/SKILL.md', 'ui-components');
  assertFileNotContains(dest, '.gemini/skills/development-workflow/SKILL.md', 'Zod');

  // AGENTS.md: no Frontend Standards for backend-only
  assertFileNotContains(dest, 'AGENTS.md', 'Frontend Standards');
  assertFileContains(dest, 'AGENTS.md', 'Backend Standards');

  // documentation-standards: no frontend refs
  assertFileNotContains(dest, 'ai-specs/specs/documentation-standards.mdc', 'frontend-standards');
}

// --- Scenario 15: --upgrade after --init (basic upgrade) ---

function testUpgradeBasic() {
  const dest = path.join(TMP_BASE, 'test-upgrade-basic');
  fs.mkdirSync(dest, { recursive: true });

  // Create a mock Express+Prisma project and init it
  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify({
    name: 'my-upgrade-app',
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
  fs.mkdirSync(path.join(dest, 'src', 'services'), { recursive: true });
  fs.mkdirSync(path.join(dest, 'prisma'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'src', 'index.ts'), '', 'utf8');
  fs.writeFileSync(path.join(dest, 'prisma', 'schema.prisma'),
    'datasource db {\n  provider = "postgresql"\n  url = env("DATABASE_URL")\n}\n', 'utf8');

  const { scan } = require('../lib/scanner');
  const { buildInitDefaultConfig } = require('../lib/init-wizard');
  const { generateInit } = require('../lib/init-generator');
  const { generateUpgrade, detectAiTools, detectProjectType, readAutonomyLevel } = require('../lib/upgrade-generator');

  // Step 1: Init the project
  const scanResult = scan(dest);
  const initConfig = buildInitDefaultConfig(scanResult);
  initConfig.projectDir = dest;
  initConfig.autonomyLevel = 3;
  initConfig.autonomyName = 'Autopilot';
  silent(() => generateInit(initConfig));

  // Verify .sdd-version was written by init
  assertExists(dest, '.sdd-version');

  // Simulate user modifications to docs (should be preserved)
  fs.writeFileSync(path.join(dest, 'docs', 'project_notes', 'bugs.md'), '# My Custom Bugs\n\nBug #1: Something broke\n', 'utf8');

  // Step 2: Upgrade
  const scanResult2 = scan(dest);
  const aiTools = detectAiTools(dest);
  const projectType = detectProjectType(dest);
  const autonomy = readAutonomyLevel(dest);
  const upgradeConfig = buildInitDefaultConfig(scanResult2);
  upgradeConfig.projectDir = dest;
  upgradeConfig.aiTools = aiTools;
  upgradeConfig.projectType = projectType;
  upgradeConfig.autonomyLevel = autonomy.level;
  upgradeConfig.autonomyName = autonomy.name;
  upgradeConfig.installedVersion = 'unknown';

  silent(() => generateUpgrade(upgradeConfig));

  // Verify: SDD files replaced (agents exist, fresh)
  assertExists(dest, '.claude/agents/backend-developer.md');
  assertExists(dest, '.claude/skills/development-workflow/SKILL.md');
  assertExists(dest, '.gemini/agents/backend-developer.md');
  assertExists(dest, 'AGENTS.md');
  assertExists(dest, 'CLAUDE.md');
  assertExists(dest, 'GEMINI.md');

  // Verify: .sdd-version updated
  assertExists(dest, '.sdd-version');
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  assertFileContains(dest, '.sdd-version', pkg.version);

  // Verify: Autonomy level preserved (was L3 Autopilot)
  assertFileContains(dest, 'CLAUDE.md', 'Autonomy Level: 3 (Autopilot)');
  assertFileContains(dest, 'GEMINI.md', 'Autonomy Level: 3 (Autopilot)');

  // Verify: User docs preserved
  assertFileContains(dest, 'docs/project_notes/bugs.md', 'My Custom Bugs');
  assertExists(dest, 'docs/project_notes/product-tracker.md');
  assertExists(dest, 'docs/project_notes/key_facts.md');

  // Verify: Backend-only — no frontend agents
  assertNotExists(dest, '.claude/agents/frontend-developer.md');
  assertNotExists(dest, '.gemini/agents/frontend-developer.md');

  // Verify: AGENTS.md adapted for backend-only
  assertFileNotContains(dest, 'AGENTS.md', 'Frontend Standards');
  assertFileContains(dest, 'AGENTS.md', 'Backend Standards');

  // Verify: CI workflow added during upgrade (didn't exist before --init added it)
  assertExists(dest, '.github/workflows/ci.yml');
  assertFileContains(dest, '.github/workflows/ci.yml', 'postgres:');

  // Verify: Merge Checklist Evidence section in ticket template after upgrade (B+D)
  assertFileContains(dest, '.claude/skills/development-workflow/references/ticket-template.md', '## Merge Checklist Evidence');
  assertFileContains(dest, '.claude/skills/development-workflow/references/merge-checklist.md', 'Fill Merge Checklist Evidence');
  assertFileContains(dest, '.claude/skills/development-workflow/SKILL.md', 'Merge Checklist Evidence');

  // Verify: Simple lite ticket after upgrade
  assertFileContains(dest, '.claude/skills/development-workflow/SKILL.md', '| Simple | Skip | Lite | Skip | Skip |');
  assertFileContains(dest, '.claude/skills/development-workflow/references/merge-checklist.md', 'Simple (lite ticket)');

  // Verify: Compact hook upgraded with SKILL.md re-read instruction
  assertFileContains(dest, '.claude/settings.json', 'Re-read the SKILL.md');
}

// --- Scenario 16: --upgrade preserves custom agents + modified standards ---

function testUpgradePreservesCustomizations() {
  const dest = path.join(TMP_BASE, 'test-upgrade-custom');
  fs.mkdirSync(dest, { recursive: true });

  // Create a mock project and init it
  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify({
    name: 'my-custom-app',
    dependencies: {
      express: '^4.18.0',
      mongoose: '^7.0.0',
    },
    devDependencies: {
      jest: '^29.0.0',
      typescript: '^5.0.0',
    },
  }), 'utf8');
  fs.writeFileSync(path.join(dest, 'tsconfig.json'), '{}', 'utf8');
  fs.mkdirSync(path.join(dest, 'src', 'controllers'), { recursive: true });
  fs.mkdirSync(path.join(dest, 'src', 'models'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'src', 'index.ts'), '', 'utf8');

  const { scan } = require('../lib/scanner');
  const { buildInitDefaultConfig } = require('../lib/init-wizard');
  const { generateInit } = require('../lib/init-generator');
  const { generateUpgrade, detectAiTools, detectProjectType, readAutonomyLevel } = require('../lib/upgrade-generator');

  // Step 1: Init
  const scanResult = scan(dest);
  const initConfig = buildInitDefaultConfig(scanResult);
  initConfig.projectDir = dest;
  silent(() => generateInit(initConfig));

  // Step 2: Add custom agent
  fs.writeFileSync(
    path.join(dest, '.claude', 'agents', 'my-custom-agent.md'),
    '# My Custom Agent\n\nDoes special things.\n',
    'utf8'
  );

  // Step 3: Add custom command
  fs.writeFileSync(
    path.join(dest, '.claude', 'commands', 'my-lint.sh'),
    '#!/bin/bash\nnpm run lint\n',
    'utf8'
  );

  // Step 4: Create settings.local.json
  fs.writeFileSync(
    path.join(dest, '.claude', 'settings.local.json'),
    '{"hooks":{"Notification":[{"matcher":"idle","hooks":[{"type":"command","command":"echo done"}]}]}}\n',
    'utf8'
  );

  // Step 4b: Add custom permissions to settings.json
  const settingsJsonPath = path.join(dest, '.claude', 'settings.json');
  const settingsJson = JSON.parse(fs.readFileSync(settingsJsonPath, 'utf8'));
  settingsJson.permissions = {
    allow: ['Bash(npx:*)', 'Bash(git:*)'],
    additionalDirectories: ['/tmp/test-dir'],
  };
  fs.writeFileSync(settingsJsonPath, JSON.stringify(settingsJson, null, 2) + '\n', 'utf8');

  // Step 4c: Add custom env vars to .env.example
  const envPath = path.join(dest, '.env.example');
  let envContent = fs.readFileSync(envPath, 'utf8');
  envContent += '\n# Custom Integration\nMY_API_KEY=your-api-key\nMY_API_SECRET=your-api-secret\n';
  fs.writeFileSync(envPath, envContent, 'utf8');

  // Step 5: Modify a standard (so it should be preserved)
  const backendStdPath = path.join(dest, 'ai-specs', 'specs', 'backend-standards.mdc');
  let stdContent = fs.readFileSync(backendStdPath, 'utf8');
  stdContent += '\n## My Custom Section\n\nCustom patterns here.\n';
  fs.writeFileSync(backendStdPath, stdContent, 'utf8');

  // Step 5b: Modify template command to simulate outdated version
  const reviewPlanPath = path.join(dest, '.claude', 'commands', 'review-plan.md');
  if (fs.existsSync(reviewPlanPath)) {
    fs.writeFileSync(reviewPlanPath, '# Old review-plan\n\nOutdated content.\n', 'utf8');
  }

  // Step 6: Upgrade
  const scanResult2 = scan(dest);
  const aiTools = detectAiTools(dest);
  const projectType = detectProjectType(dest);
  const autonomy = readAutonomyLevel(dest);
  const upgradeConfig = buildInitDefaultConfig(scanResult2);
  upgradeConfig.projectDir = dest;
  upgradeConfig.aiTools = aiTools;
  upgradeConfig.projectType = projectType;
  upgradeConfig.autonomyLevel = autonomy.level;
  upgradeConfig.autonomyName = autonomy.name;
  upgradeConfig.installedVersion = 'unknown';

  silent(() => generateUpgrade(upgradeConfig));

  // Verify: Custom agent preserved
  assertExists(dest, '.claude/agents/my-custom-agent.md');
  assertFileContains(dest, '.claude/agents/my-custom-agent.md', 'My Custom Agent');

  // Verify: Custom command preserved
  assertExists(dest, '.claude/commands/my-lint.sh');
  assertFileContains(dest, '.claude/commands/my-lint.sh', 'npm run lint');

  // Verify: Template command overwritten with latest version (not stuck on old content)
  assertExists(dest, '.claude/commands/review-plan.md');
  assertFileContains(dest, '.claude/commands/review-plan.md', 'Implementation Plan');
  assertFileNotContains(dest, '.claude/commands/review-plan.md', 'Outdated content');
  assertFileContains(dest, '.claude/commands/review-plan.md', 'command -v');
  assertFileContains(dest, '.claude/commands/review-plan.md', 'REVIEW_DIR');

  // Verify: context-prompt.md created during upgrade (new template command)
  assertExists(dest, '.claude/commands/context-prompt.md');
  assertFileContains(dest, '.claude/commands/context-prompt.md', 'Workflow Recovery');

  // Verify: review-project.md created during upgrade (new template command)
  assertExists(dest, '.claude/commands/review-project.md');
  assertFileContains(dest, '.claude/commands/review-project.md', 'Phase 0: Discovery');

  // Verify: review-spec.md created during upgrade (new template command)
  assertExists(dest, '.claude/commands/review-spec.md');
  assertFileContains(dest, '.claude/commands/review-spec.md', 'Completeness');

  // Verify: settings.local.json preserved
  assertExists(dest, '.claude/settings.local.json');
  assertFileContains(dest, '.claude/settings.local.json', 'echo done');

  // Verify: Modified backend-standards preserved (has custom section)
  assertFileContains(dest, 'ai-specs/specs/backend-standards.mdc', 'My Custom Section');

  // Verify: Template agents still exist (were replaced)
  assertExists(dest, '.claude/agents/backend-developer.md');
  assertExists(dest, '.claude/agents/spec-creator.md');

  // Verify: settings.json permissions preserved but hooks updated
  const upgradedSettings = JSON.parse(fs.readFileSync(path.join(dest, '.claude', 'settings.json'), 'utf8'));
  assert(upgradedSettings.permissions, 'settings.json should preserve permissions');
  assert(upgradedSettings.permissions.allow.includes('Bash(npx:*)'), 'settings.json should preserve user permissions');
  assert(upgradedSettings.permissions.additionalDirectories[0] === '/tmp/test-dir', 'settings.json should preserve additionalDirectories');
  assert(upgradedSettings.hooks, 'settings.json should have hooks from template');

  // Verify: .env.example preserves custom vars
  assertFileContains(dest, '.env.example', 'MY_API_KEY=your-api-key');
  assertFileContains(dest, '.env.example', 'MY_API_SECRET=your-api-secret');
  // But also has the standard template vars
  assertFileContains(dest, '.env.example', 'NODE_ENV=');
  // Verify: "preserved" header appears exactly once
  const envAfterUpgrade1 = fs.readFileSync(path.join(dest, '.env.example'), 'utf8');
  const preservedCount1 = (envAfterUpgrade1.match(/# Project-specific variables \(preserved from previous version\)/g) || []).length;
  assert.strictEqual(preservedCount1, 1, `.env.example should have exactly 1 "preserved" header after first upgrade, got ${preservedCount1}`);

  // Run upgrade a second time — header must remain exactly 1 (idempotent)
  silent(() => generateUpgrade(upgradeConfig));
  const envAfterUpgrade2 = fs.readFileSync(path.join(dest, '.env.example'), 'utf8');
  const preservedCount2 = (envAfterUpgrade2.match(/# Project-specific variables \(preserved from previous version\)/g) || []).length;
  assert.strictEqual(preservedCount2, 1, `.env.example should still have exactly 1 "preserved" header after second upgrade, got ${preservedCount2}`);
  // Custom vars still present after second upgrade
  assertFileContains(dest, '.env.example', 'MY_API_KEY=your-api-key');

  // Verify: .sdd-version written
  assertExists(dest, '.sdd-version');
}

// --- Scenario 17: New project writes .sdd-version ---

function testNewProjectSddVersion() {
  const dest = path.join(TMP_BASE, 'test-sdd-version');

  const { generate } = require('../lib/generator');
  const { BACKEND_STACKS } = require('../lib/config');

  silent(() => generate({
    projectName: 'test-sdd-version',
    projectDir: dest,
    description: '',
    businessContext: '',
    projectType: 'backend',
    backendStack: 'express-prisma-pg',
    backendPreset: BACKEND_STACKS[0],
    frontendStack: 'nextjs-tailwind-radix',
    aiTools: 'claude',
    autonomyLevel: 2,
    autonomyName: 'Trusted',
    branching: 'github-flow',
    backendPort: 3010,
    frontendPort: 3000,
  }));

  // .sdd-version exists and contains current version
  assertExists(dest, '.sdd-version');
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  assertFileContains(dest, '.sdd-version', pkg.version);
}

// --- Scenario 18: --doctor on healthy project ---

function testDoctorHealthy() {
  // Create a project with --init, then run doctor
  const dest = path.join(TMP_BASE, 'test-doctor-healthy');
  fs.mkdirSync(dest, { recursive: true });

  // Create a mock Express+Prisma project
  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify({
    name: 'test-doctor',
    dependencies: { express: '^4.18.0', '@prisma/client': '^5.0.0' },
  }));
  fs.mkdirSync(path.join(dest, 'src', 'controllers'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'src', 'index.ts'), 'import express from "express";');
  fs.mkdirSync(path.join(dest, 'prisma'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'prisma', 'schema.prisma'), 'datasource db { provider = "postgresql" }');

  // Install SDD
  execSync(`node ${CLI} --init --yes`, { cwd: dest, stdio: 'pipe' });

  // Run doctor — should exit 0 (healthy)
  const output = execSync(`node ${CLI} --doctor`, { cwd: dest, encoding: 'utf8' });

  assert(output.includes('SDD DevFlow Doctor'), 'Should show doctor header');
  assert(output.includes('SDD installed'), 'Should confirm SDD installed');
  assert(output.includes('HEALTHY'), 'Should report HEALTHY');
  assert(!output.includes('✗'), 'Should have no failures');

  // Check specific pass items
  assert(output.includes('AI tools:'), 'Should show AI tools');
  assert(output.includes('Agents:'), 'Should show agents count');
  assert(output.includes('Standards:'), 'Should show standards count');
  assert(output.includes('Project memory:'), 'Should show memory status');
  assert(output.includes('Cross-tool consistency:'), 'Should show cross-tool check');
  assert(output.includes('Top-level configs present'), 'Should verify CLAUDE.md/GEMINI.md');
}

// --- Scenario 19: --doctor detects problems ---

function testDoctorProblems() {
  // Create a project with --init, then introduce problems
  const dest = path.join(TMP_BASE, 'test-doctor-problems');
  fs.mkdirSync(dest, { recursive: true });

  // Create a mock Express project (backend only)
  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify({
    name: 'test-doctor-problems',
    dependencies: { express: '^4.18.0', mongoose: '^7.0.0' },
  }));
  fs.mkdirSync(path.join(dest, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'src', 'index.ts'), 'import express from "express";');

  // Install SDD
  execSync(`node ${CLI} --init --yes`, { cwd: dest, stdio: 'pipe' });

  // Introduce problems:
  // 1. Delete an agent
  fs.unlinkSync(path.join(dest, '.claude', 'agents', 'spec-creator.md'));

  // 2. Corrupt settings.json
  fs.writeFileSync(path.join(dest, '.claude', 'settings.json'), '{ invalid json', 'utf8');

  // 3. Delete a memory file
  fs.unlinkSync(path.join(dest, 'docs', 'project_notes', 'bugs.md'));

  // 4. Add a frontend agent to a backend project (coherence issue)
  fs.writeFileSync(path.join(dest, '.claude', 'agents', 'frontend-developer.md'), '# Frontend Dev', 'utf8');

  // 5. Create mismatch between claude and gemini agents
  fs.writeFileSync(path.join(dest, '.claude', 'agents', 'my-custom-agent.md'), '# Custom', 'utf8');

  // 6. Corrupt .gemini/settings.json with obsolete string model format (v0.16.7 doctor check #12)
  fs.writeFileSync(
    path.join(dest, '.gemini', 'settings.json'),
    JSON.stringify({ model: 'gemini-2.5-pro', temperature: 0.2 }, null, 2),
    'utf8'
  );

  // Run doctor — should exit 1 (unhealthy) due to corrupted settings.json
  let output;
  try {
    output = execSync(`node ${CLI} --doctor`, { cwd: dest, encoding: 'utf8' });
  } catch (e) {
    output = e.stdout;
  }

  assert(output.includes('SDD DevFlow Doctor'), 'Should show doctor header');

  // Check that problems are detected
  assert(output.includes('missing') || output.includes('Missing'), 'Should detect missing agent');
  assert(output.includes('invalid JSON') || output.includes('issue'), 'Should detect corrupted settings');
  assert(output.includes('UNHEALTHY') || output.includes('NEEDS ATTENTION'), 'Should report problems');

  // Check coherence detection (frontend agent in backend project)
  assert(output.includes('Frontend agent in backend project') || output.includes('coherence'), 'Should detect coherence issue');

  // Check cross-tool mismatch (custom agent only in .claude)
  assert(output.includes('my-custom-agent.md') || output.includes('mismatch'), 'Should detect cross-tool mismatch');

  // Check memory file missing
  assert(output.includes('3/4') || output.includes('bugs.md'), 'Should detect missing memory file');

  // Check Gemini settings obsolete format detection (v0.16.7 doctor check #12)
  assert(
    output.includes('obsolete model format') || output.includes('Gemini settings'),
    'Should detect obsolete Gemini model format'
  );
}

// --- Scenario 20: --doctor on backend-only (no frontend standards expected) ---

function testDoctorBackendOnly() {
  const dest = path.join(TMP_BASE, 'test-doctor-backend');
  fs.mkdirSync(dest, { recursive: true });

  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify({
    name: 'test-doctor-backend',
    dependencies: { express: '^4.18.0' },
  }));
  fs.mkdirSync(path.join(dest, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'src', 'index.ts'), 'import express from "express";');

  // Install SDD (backend only detected)
  execSync(`node ${CLI} --init --yes`, { cwd: dest, stdio: 'pipe' });

  // Run doctor — should be healthy
  const output = execSync(`node ${CLI} --doctor`, { cwd: dest, encoding: 'utf8' });

  assert(output.includes('HEALTHY'), 'Backend-only project should be HEALTHY');
  assert(output.includes('Project type coherence: OK (backend)'), 'Should confirm backend coherence');

  // Standards count: 3 for backend (base, backend, documentation — no frontend)
  assert(output.includes('Standards: 3/3'), 'Should have 3/3 standards for backend');
}

// --- Scenario 21: New project CI workflow (fullstack + PostgreSQL) ---

function testCiWorkflowFullstack() {
  const dest = path.join(TMP_BASE, 'test-ci-fullstack');

  const { generate } = require('../lib/generator');
  const { BACKEND_STACKS } = require('../lib/config');

  silent(() => generate({
    projectName: 'test-ci-fullstack',
    projectDir: dest,
    description: '',
    businessContext: '',
    projectType: 'fullstack',
    backendStack: 'express-prisma-pg',
    backendPreset: BACKEND_STACKS[0],
    frontendStack: 'nextjs-tailwind-radix',
    aiTools: 'claude',
    autonomyLevel: 2,
    autonomyName: 'Trusted',
    branching: 'github-flow',
    backendPort: 3010,
    frontendPort: 3000,
  }));

  // CI workflow exists
  assertExists(dest, '.github/workflows/ci.yml');

  // Has postgres service (default for fullstack with PostgreSQL)
  assertFileContains(dest, '.github/workflows/ci.yml', 'postgres:');
  assertFileContains(dest, '.github/workflows/ci.yml', 'POSTGRES_DB: testdb');
  assertFileContains(dest, '.github/workflows/ci.yml', 'DATABASE_URL: postgresql://');

  // GitHub Flow: only main branch
  assertFileContains(dest, '.github/workflows/ci.yml', 'branches: [main]');
  assertFileNotContains(dest, '.github/workflows/ci.yml', 'develop');

  // Has standard steps
  assertFileContains(dest, '.github/workflows/ci.yml', 'npm ci');
  assertFileContains(dest, '.github/workflows/ci.yml', 'npm test --if-present');
  assertFileContains(dest, '.github/workflows/ci.yml', 'npm run build --if-present');
}

// --- Scenario 22: New project CI workflow (frontend-only) ---

function testCiWorkflowFrontendOnly() {
  const dest = path.join(TMP_BASE, 'test-ci-frontend');

  const { generate } = require('../lib/generator');

  silent(() => generate({
    projectName: 'test-ci-frontend',
    projectDir: dest,
    description: '',
    businessContext: '',
    projectType: 'frontend',
    backendStack: 'express-prisma-pg',
    frontendStack: 'nextjs-tailwind-radix',
    aiTools: 'claude',
    autonomyLevel: 2,
    autonomyName: 'Trusted',
    branching: 'gitflow',
    backendPort: 3010,
    frontendPort: 3000,
  }));

  // CI workflow exists
  assertExists(dest, '.github/workflows/ci.yml');

  // No DB services for frontend-only
  assertFileNotContains(dest, '.github/workflows/ci.yml', 'postgres:');
  assertFileNotContains(dest, '.github/workflows/ci.yml', 'POSTGRES_DB');
  assertFileNotContains(dest, '.github/workflows/ci.yml', 'DATABASE_URL');

  // GitFlow: main + develop branches
  assertFileContains(dest, '.github/workflows/ci.yml', 'branches: [main, develop]');
}

// --- Scenario 23: --init copies CI workflow + MongoDB adaptation ---

function testInitCiWorkflowMongo() {
  const dest = path.join(TMP_BASE, 'test-ci-init-mongo');
  fs.mkdirSync(dest, { recursive: true });

  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify({
    name: 'test-ci-mongo',
    dependencies: { express: '^4.18.0', mongoose: '^7.0.0' },
  }));
  fs.mkdirSync(path.join(dest, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'src', 'index.js'), '');

  const { scan } = require('../lib/scanner');
  const { buildInitDefaultConfig } = require('../lib/init-wizard');
  const { generateInit } = require('../lib/init-generator');

  const scanResult = scan(dest);
  const config = buildInitDefaultConfig(scanResult);
  config.projectDir = dest;

  silent(() => generateInit(config));

  // CI workflow created
  assertExists(dest, '.github/workflows/ci.yml');

  // MongoDB service instead of postgres
  assertFileContains(dest, '.github/workflows/ci.yml', 'mongodb:');
  assertFileContains(dest, '.github/workflows/ci.yml', 'mongo:7');
  assertFileContains(dest, '.github/workflows/ci.yml', 'MONGODB_URI');
  assertFileNotContains(dest, '.github/workflows/ci.yml', 'postgres:');
}

// --- Scenario 24: --init --diff (dry-run preview, no writes) ---

function testInitDiff() {
  const dest = path.join(TMP_BASE, 'test-init-diff');
  fs.mkdirSync(dest, { recursive: true });

  // Create a mock Express+Mongoose project
  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify({
    name: 'test-init-diff',
    dependencies: { express: '^4.18.0', mongoose: '^7.0.0' },
  }));
  fs.mkdirSync(path.join(dest, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'src', 'index.js'), '');

  // Run --init --diff
  const output = execSync(`node ${CLI} --init --diff`, { cwd: dest, encoding: 'utf8' });

  // Verify: NO files created
  assertNotExists(dest, 'ai-specs');
  assertNotExists(dest, '.claude');
  assertNotExists(dest, '.gemini');
  assertNotExists(dest, 'AGENTS.md');
  assertNotExists(dest, 'CLAUDE.md');
  assertNotExists(dest, '.sdd-version');
  assertNotExists(dest, '.github');

  // Verify: output contains expected sections
  assert(output.includes('Preview'), 'Should show Preview header');
  assert(output.includes('Detected stack'), 'Should show detected stack');
  assert(output.includes('Express'), 'Should mention Express');
  assert(output.includes('Would create'), 'Should show what would be created');
  assert(output.includes('agents'), 'Should mention agents');
  assert(output.includes('standards'), 'Should mention standards');
  assert(output.includes('Run without --diff'), 'Should show call-to-action');
}

// --- Scenario 25: --upgrade --diff (dry-run preview, no writes) ---

function testUpgradeDiff() {
  const dest = path.join(TMP_BASE, 'test-upgrade-diff');
  fs.mkdirSync(dest, { recursive: true });

  // Create and init a project
  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify({
    name: 'test-upgrade-diff',
    dependencies: { express: '^4.18.0', '@prisma/client': '^5.0.0' },
  }));
  fs.mkdirSync(path.join(dest, 'src', 'controllers'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'src', 'index.ts'), '');
  fs.mkdirSync(path.join(dest, 'prisma'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'prisma', 'schema.prisma'),
    'datasource db { provider = "postgresql" }');

  execSync(`node ${CLI} --init --yes`, { cwd: dest, stdio: 'pipe' });

  // Add a custom agent (to verify it's reported)
  fs.writeFileSync(
    path.join(dest, '.claude', 'agents', 'my-diff-agent.md'),
    '# My Diff Agent\n', 'utf8'
  );

  // Modify a standard (to verify it's detected)
  const backendStdPath = path.join(dest, 'ai-specs', 'specs', 'backend-standards.mdc');
  let stdContent = fs.readFileSync(backendStdPath, 'utf8');
  stdContent += '\n## My Custom Section\n';
  fs.writeFileSync(backendStdPath, stdContent, 'utf8');

  // Record state before diff
  const versionBefore = fs.readFileSync(path.join(dest, '.sdd-version'), 'utf8');
  const agentMtime = fs.statSync(path.join(dest, '.claude', 'agents', 'backend-developer.md')).mtimeMs;

  // Run --upgrade --diff --force (same version)
  const output = execSync(`node ${CLI} --upgrade --diff --force`, { cwd: dest, encoding: 'utf8' });

  // Verify: NO files modified
  const versionAfter = fs.readFileSync(path.join(dest, '.sdd-version'), 'utf8');
  assert.strictEqual(versionBefore, versionAfter, '.sdd-version should not change');
  const agentMtimeAfter = fs.statSync(path.join(dest, '.claude', 'agents', 'backend-developer.md')).mtimeMs;
  assert.strictEqual(agentMtime, agentMtimeAfter, 'Agent file should not be modified');

  // Verify: output contains expected sections
  assert(output.includes('Preview'), 'Should show Preview header');
  assert(output.includes('Would replace'), 'Should show replacements');
  assert(output.includes('Would preserve'), 'Should show preservations');
  assert(output.includes('my-diff-agent.md'), 'Should list custom agent');
  assert(output.includes('Standards:'), 'Should show standards section');
  assert(output.includes('backend-standards.mdc'), 'Should mention backend standards');
  assert(output.includes('customized'), 'Should detect customized standard');
  assert(output.includes('Run without --diff'), 'Should show call-to-action');
}

// --- Scenario 26: --diff error conditions ---

function testDiffErrorConditions() {
  const dest = path.join(TMP_BASE, 'test-diff-errors');
  fs.mkdirSync(dest, { recursive: true });

  // --diff alone (no --init or --upgrade)
  try {
    execSync(`node ${CLI} --diff`, { cwd: dest, encoding: 'utf8', stdio: 'pipe' });
    assert.fail('Should have thrown');
  } catch (e) {
    assert(e.stderr.includes('must be combined'), 'Should say --diff must be combined');
  }

  // --init --diff without package.json
  try {
    execSync(`node ${CLI} --init --diff`, { cwd: dest, encoding: 'utf8', stdio: 'pipe' });
    assert.fail('Should have thrown');
  } catch (e) {
    assert(e.stderr.includes('No package.json'), 'Should require package.json');
  }

  // --upgrade --diff without ai-specs
  fs.writeFileSync(path.join(dest, 'package.json'), '{"name":"test"}');
  try {
    execSync(`node ${CLI} --upgrade --diff`, { cwd: dest, encoding: 'utf8', stdio: 'pipe' });
    assert.fail('Should have thrown');
  } catch (e) {
    assert(e.stderr.includes('ai-specs'), 'Should require ai-specs for upgrade');
  }
}

// --- Scenario 27: --eject basic (both tools, backend) ---

function testEjectBasic() {
  const dest = path.join(TMP_BASE, 'test-eject-basic');
  fs.mkdirSync(dest, { recursive: true });

  // Create and init a mock project
  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify({
    name: 'test-eject-basic',
    dependencies: { express: '^4.18.0', mongoose: '^7.0.0' },
  }));
  fs.mkdirSync(path.join(dest, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'src', 'index.js'), 'const app = require("express")();');
  fs.writeFileSync(path.join(dest, '.gitignore'), 'node_modules\n', 'utf8');

  execSync(`node ${CLI} --init --yes`, { cwd: dest, stdio: 'pipe' });

  // Verify SDD was installed
  assertExists(dest, 'ai-specs');
  assertExists(dest, '.claude/agents');
  assertExists(dest, '.gemini/agents');
  assertExists(dest, 'AGENTS.md');
  assertExists(dest, 'CLAUDE.md');
  assertExists(dest, 'GEMINI.md');
  assertExists(dest, '.sdd-version');
  assertExists(dest, '.env.example');
  assertExists(dest, '.github/workflows/ci.yml');

  // Eject
  execSync(`node ${CLI} --eject --yes`, { cwd: dest, stdio: 'pipe' });

  // Verify: all SDD files removed
  assertNotExists(dest, 'ai-specs');
  assertNotExists(dest, '.claude/agents');
  assertNotExists(dest, '.claude/skills');
  assertNotExists(dest, '.claude/hooks');
  assertNotExists(dest, '.claude/settings.json');
  assertNotExists(dest, '.gemini');
  assertNotExists(dest, 'AGENTS.md');
  assertNotExists(dest, 'CLAUDE.md');
  assertNotExists(dest, 'GEMINI.md');
  assertNotExists(dest, '.sdd-version');
  assertNotExists(dest, '.env.example');
  assertNotExists(dest, '.github');

  // settings.local.json preserved (even if from template — personal settings)
  assertExists(dest, '.claude/settings.local.json');

  // Verify: user files preserved
  assertExists(dest, 'package.json');
  assertExists(dest, 'src/index.js');
  assertExists(dest, 'docs');
  assertExists(dest, '.gitignore');

  // Verify: .gitignore cleaned of SDD entries
  assertFileNotContains(dest, '.gitignore', 'SDD DevFlow');
  assertFileContains(dest, '.gitignore', 'node_modules');
}

// --- Scenario 28: --eject preserves custom agents, commands, settings ---

function testEjectPreservesCustomizations() {
  const dest = path.join(TMP_BASE, 'test-eject-custom');
  fs.mkdirSync(dest, { recursive: true });

  // Create and init
  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify({
    name: 'test-eject-custom',
    dependencies: { express: '^4.18.0', '@prisma/client': '^5.0.0' },
  }));
  fs.mkdirSync(path.join(dest, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'src', 'index.ts'), '');
  fs.mkdirSync(path.join(dest, 'prisma'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'prisma', 'schema.prisma'),
    'datasource db { provider = "postgresql" }');

  execSync(`node ${CLI} --init --yes`, { cwd: dest, stdio: 'pipe' });

  // Add custom agent
  fs.writeFileSync(
    path.join(dest, '.claude', 'agents', 'my-deploy-agent.md'),
    '# Deploy Agent\n\nHandles deployment.\n', 'utf8'
  );

  // Add custom command
  fs.writeFileSync(
    path.join(dest, '.claude', 'commands', 'my-lint.sh'),
    '#!/bin/bash\nnpm run lint\n', 'utf8'
  );

  // Add settings.local.json
  fs.writeFileSync(
    path.join(dest, '.claude', 'settings.local.json'),
    '{"hooks":{"Notification":[]}}\n', 'utf8'
  );

  // Add user permissions to settings.json
  const settingsPath = path.join(dest, '.claude', 'settings.json');
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  settings.permissions = { allow: ['Bash(npx:*)'] };
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');

  // Eject
  execSync(`node ${CLI} --eject --yes`, { cwd: dest, stdio: 'pipe' });

  // Template agents removed
  assertNotExists(dest, '.claude/agents/backend-developer.md');
  assertNotExists(dest, '.claude/agents/spec-creator.md');

  // Custom agent preserved
  assertExists(dest, '.claude/agents/my-deploy-agent.md');
  assertFileContains(dest, '.claude/agents/my-deploy-agent.md', 'Deploy Agent');

  // Custom command preserved
  assertExists(dest, '.claude/commands/my-lint.sh');
  assertFileContains(dest, '.claude/commands/my-lint.sh', 'npm run lint');

  // Template commands preserved during eject (useful standalone)
  assertExists(dest, '.claude/commands/review-plan.md');
  assertExists(dest, '.claude/commands/review-spec.md');
  assertExists(dest, '.claude/commands/context-prompt.md');
  assertExists(dest, '.claude/commands/review-project.md');

  // settings.local.json preserved
  assertExists(dest, '.claude/settings.local.json');

  // settings.json kept with permissions but hooks removed
  assertExists(dest, '.claude/settings.json');
  const updatedSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  assert.ok(updatedSettings.permissions, 'Permissions should be preserved');
  assert.ok(updatedSettings.permissions.allow.includes('Bash(npx:*)'), 'User permissions intact');
  assert.ok(!updatedSettings.hooks, 'Hooks should be removed');

  // SDD files removed
  assertNotExists(dest, 'ai-specs');
  assertNotExists(dest, 'AGENTS.md');
  assertNotExists(dest, '.sdd-version');

  // .claude dir still exists (has custom content)
  assertExists(dest, '.claude');

  // docs preserved
  assertExists(dest, 'docs');
}

// --- Scenario 29: --eject preserves user-modified CI workflow ---

function testEjectPreservesCustomCi() {
  const dest = path.join(TMP_BASE, 'test-eject-ci');
  fs.mkdirSync(dest, { recursive: true });

  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify({
    name: 'test-eject-ci',
    dependencies: { express: '^4.18.0' },
  }));
  fs.mkdirSync(path.join(dest, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'src', 'index.js'), '');

  execSync(`node ${CLI} --init --yes`, { cwd: dest, stdio: 'pipe' });

  // Verify CI was created with SDD marker
  assertExists(dest, '.github/workflows/ci.yml');
  assertFileContains(dest, '.github/workflows/ci.yml', 'Generated by SDD DevFlow');

  // User customizes CI: remove the SDD marker and add custom steps
  const ciPath = path.join(dest, '.github', 'workflows', 'ci.yml');
  let ciContent = fs.readFileSync(ciPath, 'utf8');
  ciContent = ciContent.replace('Generated by SDD DevFlow', 'My Custom CI Pipeline');
  ciContent += '\n  deploy:\n    runs-on: ubuntu-latest\n';
  fs.writeFileSync(ciPath, ciContent, 'utf8');

  // Eject
  execSync(`node ${CLI} --eject --yes`, { cwd: dest, stdio: 'pipe' });

  // CI preserved (no SDD marker found)
  assertExists(dest, '.github/workflows/ci.yml');
  assertFileContains(dest, '.github/workflows/ci.yml', 'My Custom CI Pipeline');
  assertFileContains(dest, '.github/workflows/ci.yml', 'deploy:');
}

// --- Scenario 30: --eject --diff (dry-run preview) ---

function testEjectDiff() {
  const dest = path.join(TMP_BASE, 'test-eject-diff');
  fs.mkdirSync(dest, { recursive: true });

  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify({
    name: 'test-eject-diff',
    dependencies: { express: '^4.18.0', mongoose: '^7.0.0' },
  }));
  fs.mkdirSync(path.join(dest, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'src', 'index.js'), '');

  execSync(`node ${CLI} --init --yes`, { cwd: dest, stdio: 'pipe' });

  // Add custom agent for preservation test
  fs.writeFileSync(
    path.join(dest, '.claude', 'agents', 'my-preview-agent.md'),
    '# Preview Agent\n', 'utf8'
  );

  // Run --eject --diff
  const output = execSync(`node ${CLI} --eject --diff`, { cwd: dest, encoding: 'utf8' });

  // Verify: NO files removed
  assertExists(dest, 'ai-specs');
  assertExists(dest, '.claude/agents');
  assertExists(dest, 'AGENTS.md');
  assertExists(dest, 'CLAUDE.md');
  assertExists(dest, '.sdd-version');

  // Verify: output contains expected sections
  assert(output.includes('Preview'), 'Should show Preview header');
  assert(output.includes('Will remove'), 'Should show what would be removed');
  assert(output.includes('Will preserve'), 'Should show what would be preserved');
  assert(output.includes('my-preview-agent.md'), 'Should list custom agent');
  assert(output.includes('docs/'), 'Should mention docs preservation');
  assert(output.includes('Run without --diff'), 'Should show call-to-action');
}

// --- Scenario 31: --eject error conditions ---

function testEjectErrorConditions() {
  const dest = path.join(TMP_BASE, 'test-eject-errors');
  fs.mkdirSync(dest, { recursive: true });

  // --eject without ai-specs (SDD not installed)
  try {
    execSync(`node ${CLI} --eject --yes`, { cwd: dest, encoding: 'utf8', stdio: 'pipe' });
    assert.fail('Should have thrown');
  } catch (e) {
    assert(e.stderr.includes('ai-specs'), 'Should require ai-specs');
  }

  // --eject with project name
  fs.mkdirSync(path.join(dest, 'ai-specs'), { recursive: true });
  try {
    execSync(`node ${CLI} --eject myproject`, { cwd: dest, encoding: 'utf8', stdio: 'pipe' });
    assert.fail('Should have thrown');
  } catch (e) {
    assert(e.stderr.includes('Cannot specify'), 'Should reject project name');
  }
}

// --- Scenario 32: --eject on already-ejected project ---

function testEjectAlreadyEjected() {
  const dest = path.join(TMP_BASE, 'test-eject-already');
  fs.mkdirSync(dest, { recursive: true });

  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify({
    name: 'test-eject-already',
    dependencies: { express: '^4.18.0' },
  }));
  fs.mkdirSync(path.join(dest, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'src', 'index.js'), '');

  execSync(`node ${CLI} --init --yes`, { cwd: dest, stdio: 'pipe' });

  // First eject
  execSync(`node ${CLI} --eject --yes`, { cwd: dest, stdio: 'pipe' });

  // Second eject should fail
  try {
    execSync(`node ${CLI} --eject --yes`, { cwd: dest, encoding: 'utf8', stdio: 'pipe' });
    assert.fail('Should have thrown');
  } catch (e) {
    assert(e.stderr.includes('ai-specs'), 'Should detect SDD not installed');
  }
}

// --- Scenario 33: L5 autonomy generates correctly ---

function testL5Autonomy() {
  const dest = path.join(TMP_BASE, 'test-l5-autonomy');
  const { generate } = require('../lib/generator');
  const { BACKEND_STACKS, FRONTEND_STACKS } = require('../lib/config');

  silent(() => generate({
    projectName: 'test-l5',
    projectDir: dest,
    description: 'L5 test',
    businessContext: '',
    projectType: 'fullstack',
    backendStack: 'express-prisma-pg',
    backendPreset: BACKEND_STACKS[0],
    frontendStack: 'nextjs-tailwind-radix',
    frontendPreset: FRONTEND_STACKS[0],
    aiTools: 'both',
    autonomyLevel: 5,
    autonomyName: 'PM Autonomous',
    branching: 'github-flow',
    backendPort: 3001,
    frontendPort: 3000,
  }));

  assertFileContains(dest, 'CLAUDE.md', 'Autonomy Level: 5 (PM Autonomous)');
  assertFileContains(dest, 'GEMINI.md', 'Autonomy Level: 5 (PM Autonomous)');
}

// --- Scenario 34: pm-orchestrator skill exists for Claude ---

function testPmOrchestratorClaude() {
  const dest = path.join(TMP_BASE, 'test-l5-autonomy');
  // Reuse project from Scenario 33
  assertExists(dest, '.claude/skills/pm-orchestrator/SKILL.md');
  assertExists(dest, '.claude/skills/pm-orchestrator/references/pm-session-template.md');
  assertFileContains(dest, '.claude/skills/pm-orchestrator/SKILL.md', 'start pm');
  assertFileContains(dest, '.claude/skills/pm-orchestrator/SKILL.md', 'continue pm');
  assertFileContains(dest, '.claude/skills/pm-orchestrator/SKILL.md', 'stop pm');
  assertFileContains(dest, '.claude/skills/pm-orchestrator/SKILL.md', 'pm-session.lock');
}

// --- Scenario 35: pm-orchestrator skill exists for Gemini ---

function testPmOrchestratorGemini() {
  const dest = path.join(TMP_BASE, 'test-l5-autonomy');
  // Reuse project from Scenario 33
  assertExists(dest, '.gemini/skills/pm-orchestrator/SKILL.md');
  assertExists(dest, '.gemini/skills/pm-orchestrator/references/pm-session-template.md');
  assertFileContains(dest, '.gemini/skills/pm-orchestrator/SKILL.md', 'GEMINI.md');
  assertFileNotContains(dest, '.gemini/skills/pm-orchestrator/SKILL.md', 'CLAUDE.md');
}

// --- Scenario 36: SKILL.md checkpoint table has L5 column ---

function testSkillL5Column() {
  const dest = path.join(TMP_BASE, 'test-l5-autonomy');
  assertFileContains(dest, '.claude/skills/development-workflow/SKILL.md', 'L5 PM Auto');
  assertFileContains(dest, '.claude/skills/development-workflow/SKILL.md', 'Next Feature (PM loop)');
  assertFileContains(dest, '.gemini/skills/development-workflow/SKILL.md', 'L5 PM Auto');
}

// --- Scenario 37: --upgrade preserves L5 autonomy ---

function testUpgradePreservesL5() {
  const dest = path.join(TMP_BASE, 'test-upgrade-l5');
  fs.mkdirSync(dest, { recursive: true });

  // Create a mock project and init with L5
  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify({
    name: 'upgrade-l5-test',
    dependencies: { express: '^4.18.0', '@prisma/client': '^5.0.0' },
    devDependencies: { jest: '^29.0.0', typescript: '^5.0.0' },
  }), 'utf8');
  fs.writeFileSync(path.join(dest, 'tsconfig.json'), '{}', 'utf8');
  fs.mkdirSync(path.join(dest, 'src', 'controllers'), { recursive: true });
  fs.mkdirSync(path.join(dest, 'src', 'services'), { recursive: true });
  fs.mkdirSync(path.join(dest, 'prisma'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'src', 'index.ts'), '', 'utf8');
  fs.writeFileSync(path.join(dest, 'prisma', 'schema.prisma'),
    'datasource db {\n  provider = "postgresql"\n  url = env("DATABASE_URL")\n}\n', 'utf8');

  const { scan } = require('../lib/scanner');
  const { buildInitDefaultConfig } = require('../lib/init-wizard');
  const { generateInit } = require('../lib/init-generator');
  const { generateUpgrade, detectAiTools, detectProjectType, readAutonomyLevel } = require('../lib/upgrade-generator');

  // Init with L5
  const scanResult = scan(dest);
  const initConfig = buildInitDefaultConfig(scanResult);
  initConfig.projectDir = dest;
  initConfig.autonomyLevel = 5;
  initConfig.autonomyName = 'PM Autonomous';
  silent(() => generateInit(initConfig));

  assertFileContains(dest, 'CLAUDE.md', 'Autonomy Level: 5 (PM Autonomous)');

  // Upgrade
  const scanResult2 = scan(dest);
  const aiTools = detectAiTools(dest);
  const projectType = detectProjectType(dest);
  const autonomy = readAutonomyLevel(dest);
  const upgradeConfig = buildInitDefaultConfig(scanResult2);
  upgradeConfig.projectDir = dest;
  upgradeConfig.aiTools = aiTools;
  upgradeConfig.projectType = projectType;
  upgradeConfig.autonomyLevel = autonomy.level;
  upgradeConfig.autonomyName = autonomy.name;
  upgradeConfig.installedVersion = 'unknown';
  silent(() => generateUpgrade(upgradeConfig));

  // L5 preserved after upgrade
  assertFileContains(dest, 'CLAUDE.md', 'Autonomy Level: 5 (PM Autonomous)');
  // pm-orchestrator skill present after upgrade (both tools)
  assertExists(dest, '.claude/skills/pm-orchestrator/SKILL.md');
  assertExists(dest, '.gemini/skills/pm-orchestrator/SKILL.md');
  assertExists(dest, '.gemini/skills/pm-orchestrator/references/pm-session-template.md');
}

// --- Scenario 38: AGENTS.md has Available Skills section ---

function testAgentsSkillsSection() {
  const dest = path.join(TMP_BASE, 'test-l5-autonomy');
  assertFileContains(dest, 'AGENTS.md', 'Available Skills');
  assertFileContains(dest, 'AGENTS.md', 'pm-orchestrator');
  assertFileContains(dest, 'AGENTS.md', 'development-workflow');
}

// --- Scenario 39: --upgrade migrates obsolete .gemini/settings.json model format (v0.16.7) ---

function testGeminiSettingsMigration() {
  const { scan } = require('../lib/scanner');
  const { buildInitDefaultConfig } = require('../lib/init-wizard');
  const { generateUpgrade, detectAiTools, detectProjectType, readAutonomyLevel } = require('../lib/upgrade-generator');

  // Helper: scaffold a project with the wizard, then mutate .gemini/settings.json,
  // then run upgrade and return the resulting parsed settings.
  function migrate(name, userSettings) {
    const dest = path.join(TMP_BASE, name);
    execSync(`node ${CLI} ${name} --yes`, { cwd: TMP_BASE, stdio: 'pipe' });

    // Overwrite .gemini/settings.json with the user's "before" state
    const settingsPath = path.join(dest, '.gemini', 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(userSettings, null, 2) + '\n', 'utf8');

    // Run upgrade
    const scanResult = scan(dest);
    const aiTools = detectAiTools(dest);
    const projectType = detectProjectType(dest);
    const autonomy = readAutonomyLevel(dest);
    const upgradeConfig = buildInitDefaultConfig(scanResult);
    upgradeConfig.projectDir = dest;
    upgradeConfig.aiTools = aiTools;
    upgradeConfig.projectType = projectType;
    upgradeConfig.autonomyLevel = autonomy.level;
    upgradeConfig.autonomyName = autonomy.name;
    upgradeConfig.installedVersion = 'unknown';
    silent(() => generateUpgrade(upgradeConfig));

    return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  }

  // b.1 — String format with default model name → migrated to object
  const r1 = migrate('test-gemini-mig-1', {
    model: 'gemini-2.5-pro',
    temperature: 0.2,
    instructions: 'baseline',
  });
  assert.deepStrictEqual(r1.model, { name: 'gemini-2.5-pro' }, 'b.1: default string → object');
  assert.strictEqual(r1.temperature, 0.2, 'b.1: temperature preserved');
  assert.strictEqual(r1.instructions, 'baseline', 'b.1: instructions preserved');

  // b.2 — String format with CUSTOM model name → migrated preserving custom name
  const r2 = migrate('test-gemini-mig-2', {
    model: 'gemini-2.5-flash',
    temperature: 0.5,
    instructions: 'custom',
  });
  assert.deepStrictEqual(r2.model, { name: 'gemini-2.5-flash' }, 'b.2: custom string name preserved');
  assert.strictEqual(r2.temperature, 0.5, 'b.2: custom temperature preserved');
  assert.strictEqual(r2.instructions, 'custom', 'b.2: custom instructions preserved');

  // b.3 — Already-object format with default name → unchanged
  const r3 = migrate('test-gemini-mig-3', {
    model: { name: 'gemini-2.5-pro' },
    temperature: 0.2,
    instructions: 'already migrated',
  });
  assert.deepStrictEqual(r3.model, { name: 'gemini-2.5-pro' }, 'b.3: already-object unchanged');
  assert.strictEqual(r3.instructions, 'already migrated', 'b.3: instructions preserved');

  // b.4 — Rich object preservation (extra sub-keys survive upgrade)
  const r4 = migrate('test-gemini-mig-4', {
    model: { name: 'gemini-2.5-pro', maxSessionTurns: 100, summarizeToolOutput: true },
    temperature: 0.2,
    instructions: 'rich',
  });
  assert.strictEqual(r4.model.name, 'gemini-2.5-pro', 'b.4: rich object name preserved');
  assert.strictEqual(r4.model.maxSessionTurns, 100, 'b.4: rich object maxSessionTurns preserved');
  assert.strictEqual(r4.model.summarizeToolOutput, true, 'b.4: rich object summarizeToolOutput preserved');

  // b.5 — User customized temperature/instructions are preserved (NOT clobbered)
  const r5 = migrate('test-gemini-mig-5', {
    model: 'gemini-2.5-pro',
    temperature: 0.9,
    instructions: 'I really care about my custom instructions',
  });
  assert.strictEqual(r5.temperature, 0.9, 'b.5: user temperature not clobbered');
  assert.strictEqual(r5.instructions, 'I really care about my custom instructions', 'b.5: user instructions not clobbered');
  assert.deepStrictEqual(r5.model, { name: 'gemini-2.5-pro' }, 'b.5: model still migrated');

  // b.6 — Malformed model: null → reset to template default, no crash
  const r6 = migrate('test-gemini-mig-6', {
    model: null,
    temperature: 0.2,
  });
  assert.strictEqual(typeof r6.model, 'object', 'b.6: model is object after reset');
  assert.ok(r6.model && r6.model.name, 'b.6: model.name is set after reset (no crash)');

  // b.7 — Malformed model: array → reset to template default, no crash
  const r7 = migrate('test-gemini-mig-7', {
    model: ['gemini-2.5-pro'],
    temperature: 0.2,
  });
  assert.ok(!Array.isArray(r7.model), 'b.7: model is no longer array');
  assert.ok(r7.model && r7.model.name, 'b.7: model.name set after reset');

  // b.8 — User-added extra root key → preserved
  const r8 = migrate('test-gemini-mig-8', {
    model: 'gemini-2.5-pro',
    temperature: 0.2,
    instructions: 'baseline',
    extraUserKey: 'preserved please',
  });
  assert.strictEqual(r8.extraUserKey, 'preserved please', 'b.8: unknown user key preserved');
  assert.deepStrictEqual(r8.model, { name: 'gemini-2.5-pro' }, 'b.8: model still migrated');
}

// --- Scenario 40: doctor #12 does not false-fail on valid edge cases (v0.16.7) ---

function testDoctorGeminiSettingsValid() {
  // Helper to create a project, write custom .gemini/settings.json, and run doctor
  function runDoctorWith(name, settings) {
    const dest = path.join(TMP_BASE, name);
    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify({
      name,
      dependencies: { express: '^4.18.0' },
    }));
    fs.mkdirSync(path.join(dest, 'src'), { recursive: true });
    fs.writeFileSync(path.join(dest, 'src', 'index.ts'), 'import express from "express";');
    execSync(`node ${CLI} --init --yes`, { cwd: dest, stdio: 'pipe' });
    fs.writeFileSync(
      path.join(dest, '.gemini', 'settings.json'),
      JSON.stringify(settings, null, 2) + '\n',
      'utf8'
    );
    let output;
    try {
      output = execSync(`node ${CLI} --doctor`, { cwd: dest, encoding: 'utf8' });
    } catch (e) {
      output = e.stdout;
    }
    return output;
  }

  // Case 1: model field absent entirely → should NOT FAIL on missing model
  const out1 = runDoctorWith('test-doctor-gemini-no-model', {
    temperature: 0.2,
    instructions: 'no model field',
  });
  assert(!out1.includes('obsolete model format'), 'absent model should not be flagged as obsolete');
  assert(!out1.includes('model field has invalid type'), 'absent model should not be flagged as invalid type');

  // Case 2: model is valid object with custom name → PASS
  const out2 = runDoctorWith('test-doctor-gemini-custom', {
    model: { name: 'gemini-2.5-flash' },
    temperature: 0.2,
  });
  assert(out2.includes('Gemini settings: valid'), 'valid object with custom name should PASS');

  // Case 3: rich valid object → PASS
  const out3 = runDoctorWith('test-doctor-gemini-rich', {
    model: { name: 'gemini-2.5-pro', maxSessionTurns: 50, summarizeToolOutput: true },
    temperature: 0.2,
  });
  assert(out3.includes('Gemini settings: valid'), 'rich valid object should PASS');
}

// --- Scenario 42: Doctor check #13 detects broken Gemini TOML commands (v0.16.9) ---
//
// Gemini CLI loads slash commands from .gemini/commands/*.toml at startup and SILENTLY
// skips any TOML that fails parsing or schema validation (required: `prompt` string,
// optional: `description` string). Errors appear only in the interactive UI event
// system — they do not reach stdout/stderr, so a functional smoke test like Scenario 41
// cannot detect them.
//
// Scenario 42 uses the doctor check #13 (checkGeminiCommands) as the detection layer.
// The check parses top-level TOML assignments with a narrow regex (string literals only)
// and flags files that are missing `prompt`, have a non-string `prompt`, or have a
// non-string `description`. This gives us a reliable signal without adding a TOML parser
// dependency to the library.
//
// If upstream Gemini CLI changes the required fields or types (e.g., rename `prompt` →
// `content`), the template's TOMLs would silently stop working and this scenario would
// still pass — but the next BUG-DEV-GEMINI-CONFIG-class investigation would find it,
// because the doctor check mirrors the Gemini schema and can be updated in sync.

function testDoctorGeminiCommandsValid() {
  // Helper: init a project, optionally mutate .gemini/commands/, run doctor, return output.
  function runDoctorWithCommands(name, mutations) {
    const dest = path.join(TMP_BASE, name);
    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify({
      name,
      dependencies: { express: '^4.18.0' },
    }));
    fs.mkdirSync(path.join(dest, 'src'), { recursive: true });
    fs.writeFileSync(path.join(dest, 'src', 'index.ts'), 'import express from "express";');
    execSync(`node ${CLI} --init --yes`, { cwd: dest, stdio: 'pipe' });

    const commandsDir = path.join(dest, '.gemini', 'commands');
    for (const [file, content] of Object.entries(mutations)) {
      const filePath = path.join(commandsDir, file);
      if (content === null) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } else {
        fs.writeFileSync(filePath, content, 'utf8');
      }
    }

    let output;
    try {
      output = execSync(`node ${CLI} --doctor`, { cwd: dest, encoding: 'utf8' });
    } catch (e) {
      output = e.stdout || '';
    }
    return output;
  }

  // Case 1: All template commands valid (scaffolded state) → PASS
  const out1 = runDoctorWithCommands('test-doctor-gemini-commands-valid', {});
  assert(
    /Gemini commands: \d+\/\d+ valid/.test(out1),
    `Valid template commands should PASS. Output: ${out1.slice(0, 500)}`
  );
  assert(
    !out1.includes('invalid TOML'),
    'Valid template commands should not trigger invalid TOML warning'
  );

  // Case 2: Missing required `prompt` field → FAIL
  const out2 = runDoctorWithCommands('test-doctor-gemini-commands-missing-prompt', {
    'start-task.toml': 'description = "missing prompt field"\n',
  });
  assert(
    out2.includes('invalid TOML') || out2.includes("missing required field 'prompt'"),
    `Missing prompt field should FAIL. Output: ${out2.slice(0, 500)}`
  );

  // Case 3: Invalid TOML — `prompt` present but not a string (integer)
  const out3 = runDoctorWithCommands('test-doctor-gemini-commands-non-string-prompt', {
    'start-task.toml': 'description = "desc"\nprompt = 42\n',
  });
  assert(
    out3.includes('invalid TOML') || out3.includes("'prompt' field is not a string"),
    `Non-string prompt should FAIL. Output: ${out3.slice(0, 500)}`
  );

  // Case 4: `description` is present but not a string (boolean) → FAIL
  const out4 = runDoctorWithCommands('test-doctor-gemini-commands-non-string-desc', {
    'start-task.toml': 'description = true\nprompt = "test prompt"\n',
  });
  assert(
    out4.includes('invalid TOML') || out4.includes("'description' field is present but not a string"),
    `Non-string description should FAIL. Output: ${out4.slice(0, 500)}`
  );

  // Case 5: Empty TOML file → FAIL
  const out5 = runDoctorWithCommands('test-doctor-gemini-commands-empty', {
    'start-task.toml': '',
  });
  assert(
    out5.includes('invalid TOML') || out5.includes('empty file'),
    `Empty TOML file should FAIL. Output: ${out5.slice(0, 500)}`
  );

  // Case 6: Triple-quoted multiline prompt (valid TOML, must PASS)
  const out6 = runDoctorWithCommands('test-doctor-gemini-commands-multiline', {
    'start-task.toml': 'description = "multiline test"\nprompt = """\nThis is a multiline\nprompt body\n"""\n',
  });
  assert(
    /Gemini commands: \d+\/\d+ valid/.test(out6),
    `Multiline string prompt should PASS. Output: ${out6.slice(0, 500)}`
  );
  assert(
    !out6.includes('invalid TOML'),
    'Multiline string prompt should not trigger invalid TOML warning'
  );

  // Case 7: Single-quoted literal string (valid TOML, must PASS)
  const out7 = runDoctorWithCommands('test-doctor-gemini-commands-literal', {
    'start-task.toml': "description = 'single quoted'\nprompt = 'literal string prompt'\n",
  });
  assert(
    /Gemini commands: \d+\/\d+ valid/.test(out7),
    `Single-quoted literal should PASS. Output: ${out7.slice(0, 500)}`
  );

  // Case 8 (v0.16.9 hardening): Unterminated basic string → FAIL
  const out8 = runDoctorWithCommands('test-doctor-gemini-commands-unterm-basic', {
    'start-task.toml': 'description = "desc"\nprompt = "unterminated\n',
  });
  assert(
    out8.includes('invalid TOML') && out8.includes('invalid basic string value'),
    `Unterminated basic string should FAIL with descriptive message. Output: ${out8.slice(0, 600)}`
  );

  // Case 9 (v0.16.9 hardening): Unterminated literal string → FAIL
  const out9 = runDoctorWithCommands('test-doctor-gemini-commands-unterm-literal', {
    'start-task.toml': "description = 'desc'\nprompt = 'unterminated\n",
  });
  assert(
    out9.includes('invalid TOML') && out9.includes('invalid literal string value'),
    `Unterminated literal string should FAIL with descriptive message. Output: ${out9.slice(0, 600)}`
  );

  // Case 10 (v0.16.9 hardening): Unterminated triple-quoted basic → FAIL
  const out10 = runDoctorWithCommands('test-doctor-gemini-commands-unterm-triple', {
    'start-task.toml': 'description = "desc"\nprompt = """\nno close\n',
  });
  assert(
    out10.includes('invalid TOML') && out10.includes('unterminated triple-quoted basic string'),
    `Unterminated triple-quoted basic should FAIL with descriptive message. Output: ${out10.slice(0, 600)}`
  );

  // Case 11 (v0.16.9 hardening): Trailing junk after string close → FAIL
  const out11 = runDoctorWithCommands('test-doctor-gemini-commands-trailing-junk', {
    'start-task.toml': 'description = "desc"\nprompt = "ok" garbage trailing\n',
  });
  assert(
    out11.includes('invalid TOML') && out11.includes('invalid basic string'),
    `Trailing junk after string should FAIL. Output: ${out11.slice(0, 600)}`
  );

  // Case 12 (v0.16.9 hardening): Duplicate top-level key → FAIL
  const out12 = runDoctorWithCommands('test-doctor-gemini-commands-duplicate', {
    'start-task.toml': 'description = "a"\nprompt = "first"\nprompt = "second"\n',
  });
  assert(
    out12.includes('invalid TOML') && out12.includes('duplicate top-level key'),
    `Duplicate top-level key should FAIL. Output: ${out12.slice(0, 600)}`
  );

  // Case 13 (v0.16.9 hardening): '#' inside basic string must NOT be misclassified
  // as a comment (strip-comments pitfall). Should PASS.
  const out13 = runDoctorWithCommands('test-doctor-gemini-commands-hash-in-string', {
    'start-task.toml': 'description = "desc"\nprompt = "Fix issue #42 in #repo/#branch"\n',
  });
  assert(
    /Gemini commands: \d+\/\d+ valid/.test(out13),
    `Hash inside quoted string should PASS (not treated as comment). Output: ${out13.slice(0, 600)}`
  );

  // Case 14 (v0.16.9 hardening): Trailing comment after string close → PASS
  const out14 = runDoctorWithCommands('test-doctor-gemini-commands-trailing-comment', {
    'start-task.toml': 'description = "desc" # inline comment\nprompt = "body" # another\n',
  });
  assert(
    /Gemini commands: \d+\/\d+ valid/.test(out14),
    `Trailing comment after string close should PASS. Output: ${out14.slice(0, 600)}`
  );

  // Case 15 (v0.16.9 hardening): Escaped quotes inside basic string should PASS
  const out15 = runDoctorWithCommands('test-doctor-gemini-commands-escaped', {
    'start-task.toml': 'description = "desc"\nprompt = "He said \\"hello\\" and left"\n',
  });
  assert(
    /Gemini commands: \d+\/\d+ valid/.test(out15),
    `Escaped quotes in basic string should PASS. Output: ${out15.slice(0, 600)}`
  );

  // Case 16 (v0.16.9 hardening): Symlink TOML file → FAIL (symlink refused)
  // Create the symlink manually because the mutations object doesn't support it.
  const dest16 = path.join(TMP_BASE, 'test-doctor-gemini-commands-symlink');
  fs.mkdirSync(dest16, { recursive: true });
  fs.writeFileSync(path.join(dest16, 'package.json'), JSON.stringify({
    name: 'test-doctor-gemini-commands-symlink',
    dependencies: { express: '^4.18.0' },
  }));
  fs.mkdirSync(path.join(dest16, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dest16, 'src', 'index.ts'), 'import express from "express";');
  execSync(`node ${CLI} --init --yes`, { cwd: dest16, stdio: 'pipe' });

  // Replace start-task.toml with a symlink to /etc/hosts (arbitrary external file)
  const linkTarget = '/etc/hosts';
  const linkPath = path.join(dest16, '.gemini', 'commands', 'start-task.toml');
  fs.unlinkSync(linkPath);
  try {
    fs.symlinkSync(linkTarget, linkPath);
  } catch (e) {
    // If we can't create symlinks on this platform, skip the case
    console.log(`    (case 16 skipped: symlink creation failed: ${e.code || e.message})`);
    return;
  }

  let out16;
  try {
    out16 = execSync(`node ${CLI} --doctor`, { cwd: dest16, encoding: 'utf8' });
  } catch (e) {
    out16 = e.stdout || '';
  }
  assert(
    out16.includes('invalid TOML') && out16.includes('symlink'),
    `Symlink TOML should FAIL with "symlink" in message. Output: ${out16.slice(0, 600)}`
  );
}

// --- Scenario 41: Gemini CLI accepts the scaffolded settings (functional test, v0.16.8) ---
//
// This scenario runs Gemini CLI's differential "baseline vs broken" comparison:
//   1. Scaffold a fresh project (template state — should be valid).
//   2. Run `gemini --help` and confirm Gemini does NOT emit config validation errors,
//      AND confirm a positive success signal (non-empty help output with known tokens).
//   3. Overwrite .gemini/settings.json with the KNOWN-BROKEN obsolete string format.
//   4. Re-run `gemini --help` and confirm Gemini NOW emits the validation error.
//
// This differential design solves two problems Codex raised in the v0.16.8 review:
//  (a) "absence of error string" false-passes if the CLI is unusable/segfaults/broken.
//      Fixed: the baseline must emit real help output with positive success tokens.
//  (b) "--help may short-circuit before config load in future CLI versions".
//      Fixed: if --help silently stops loading config upstream, the broken case
//      will ALSO no longer emit the error, failing the differential assertion.
//
// Why this matters: BUG-DEV-GEMINI-CONFIG (v0.16.7) was silent for months because no
// smoke test invoked Gemini CLI against a scaffolded project. This scenario catches
// both current and future schema-format breaks at library test time.
//
// Skip condition: if `gemini` CLI is not installed locally (common in CI), the test
// is skipped silently with a note. Most valuable as a local pre-publish gate.

function testGeminiCliAcceptsScaffoldedSettings() {
  const { spawnSync } = require('child_process');

  // Skip if gemini CLI is not on PATH (use spawnSync, not shell builtin)
  const probe = spawnSync('gemini', ['--version'], { stdio: 'pipe' });
  if (probe.error || probe.status !== 0) {
    console.log('    (skipped: gemini CLI not installed or not runnable)');
    return;
  }

  // Helper: run `gemini --help` in a given cwd, return combined stdout+stderr.
  function runGeminiHelp(cwd) {
    const r = spawnSync('gemini', ['--help'], {
      cwd,
      encoding: 'utf8',
      timeout: 30000,
    });
    if (r.error) throw r.error;
    return `${r.stdout || ''}${r.stderr || ''}`;
  }

  // --- Step 1: scaffold and assert baseline (template settings) is accepted ---
  const dest = path.join(TMP_BASE, 'test-gemini-cli-accepts');
  execSync(`node ${CLI} test-gemini-cli-accepts --yes`, { cwd: TMP_BASE, stdio: 'pipe' });

  const baseline = runGeminiHelp(dest);

  // Positive success signal — help output must contain known tokens.
  // If the CLI segfaults, crashes on auth, or otherwise fails without emitting a
  // valid help screen, these assertions fail and we get a real error instead of
  // a silent pass.
  assert(
    baseline.length > 100,
    `Gemini --help produced suspiciously short output (${baseline.length} bytes). Is the CLI broken?`
  );
  assert(
    /usage|Usage|command|Commands|options|Options|gemini/i.test(baseline),
    `Gemini --help did not emit recognizable help tokens. First 300 chars: ${baseline.slice(0, 300)}`
  );

  // Negative assertion: no config validation error on the baseline.
  assert(
    !/Invalid configuration/i.test(baseline),
    `BASELINE: Gemini CLI rejected scaffolded settings. First 500 chars: ${baseline.slice(0, 500)}`
  );
  assert(
    !/Error in:\s*[\w.]+/.test(baseline),
    `BASELINE: Gemini CLI flagged a settings field. First 500 chars: ${baseline.slice(0, 500)}`
  );

  // --- Step 2: differential test — known-broken obsolete format must be rejected ---
  // If this step passes, we know (a) the CLI is loading config during --help and
  // (b) it distinguishes valid from invalid shapes. If the CLI stops loading config
  // in a future version, this step will fail, flagging the scenario for update.
  const settingsPath = path.join(dest, '.gemini', 'settings.json');
  const savedSettings = fs.readFileSync(settingsPath, 'utf8');
  const brokenSettings = {
    model: 'gemini-2.5-pro', // obsolete string format
    temperature: 0.2,
  };
  fs.writeFileSync(settingsPath, JSON.stringify(brokenSettings, null, 2) + '\n', 'utf8');

  try {
    const broken = runGeminiHelp(dest);

    // The known-broken case MUST emit either "Invalid configuration" or
    // "Error in: model" (or both). If neither appears, Gemini CLI has either
    // changed its validation behavior or stopped loading config during --help —
    // in either case, this scenario needs updating to catch the regression.
    const rejected =
      /Invalid configuration/i.test(broken) || /Error in:\s*model/i.test(broken);
    assert(
      rejected,
      `DIFFERENTIAL FAILURE: Gemini CLI accepted a KNOWN-BROKEN obsolete string-format model. ` +
        `This means either (a) upstream Gemini CLI no longer validates this shape, or ` +
        `(b) --help no longer loads config during startup. Either way, this scenario is ` +
        `no longer a regression guard and must be updated. First 500 chars of output: ${broken.slice(0, 500)}`
    );
  } finally {
    // Restore baseline for cleanup
    fs.writeFileSync(settingsPath, savedSettings, 'utf8');
  }
}

// --- Scenario 43: --upgrade preserves customized template agents + AGENTS.md (v0.16.10) ---
//
// Verifies the smart-diff protection added in v0.16.10:
// - Customized backend-planner.md is preserved (not overwritten).
// - Customized AGENTS.md is preserved (not overwritten).
// - Pre-upgrade copies are saved to .sdd-backup/<ts>/ for recovery.
// - The new adapted version is saved as <path>.new so the user can re-merge.
// - The upgrade output warns the user about preserved customizations.

function testUpgradePreservesCustomAgents() {
  const dest = path.join(TMP_BASE, 'test-upgrade-preserves-custom-agents');
  execSync(`node ${CLI} test-upgrade-preserves-custom-agents --yes`, { cwd: TMP_BASE, stdio: 'pipe' });

  // Add fake customizations
  const backendPlannerPath = path.join(dest, '.claude', 'agents', 'backend-planner.md');
  const agentsMdPath = path.join(dest, 'AGENTS.md');
  const plannerOriginal = fs.readFileSync(backendPlannerPath, 'utf8');
  const agentsMdOriginal = fs.readFileSync(agentsMdPath, 'utf8');

  fs.writeFileSync(
    backendPlannerPath,
    plannerOriginal + '\n\n## Custom Stack Notes\n\nWe use Fastify, not Express.\n',
    'utf8'
  );
  fs.writeFileSync(
    agentsMdPath,
    agentsMdOriginal + '\n\n## Custom Project Section\n\nMonorepo with 6 packages.\n',
    'utf8'
  );

  // Run upgrade (force, to re-run same version)
  const output = execSync(`node ${CLI} --upgrade --force --yes`, {
    cwd: dest,
    encoding: 'utf8',
  });

  // User customizations must still be there
  assertFileContains(dest, '.claude/agents/backend-planner.md', 'Custom Stack Notes');
  assertFileContains(dest, '.claude/agents/backend-planner.md', 'Fastify, not Express');
  assertFileContains(dest, 'AGENTS.md', 'Custom Project Section');
  assertFileContains(dest, 'AGENTS.md', 'Monorepo with 6 packages');

  // Find the backup directory (timestamped)
  const backupRoot = path.join(dest, '.sdd-backup');
  assert.ok(fs.existsSync(backupRoot), '.sdd-backup/ should exist');
  const backupDirs = fs.readdirSync(backupRoot);
  assert.ok(backupDirs.length >= 1, 'Expected at least one timestamped backup dir');
  const backupDir = path.join(backupRoot, backupDirs[0]);

  // Pre-upgrade originals backed up
  const backupPlanner = path.join(backupDir, '.claude', 'agents', 'backend-planner.md');
  const backupAgentsMd = path.join(backupDir, 'AGENTS.md');
  assert.ok(fs.existsSync(backupPlanner), 'Pre-upgrade backend-planner.md backup missing');
  assert.ok(fs.existsSync(backupAgentsMd), 'Pre-upgrade AGENTS.md backup missing');
  assert.ok(
    fs.readFileSync(backupPlanner, 'utf8').includes('Custom Stack Notes'),
    'Backup should contain original customized content'
  );

  // Adapted "would-write" versions saved as .new
  const newPlanner = path.join(backupDir, '.claude', 'agents', 'backend-planner.md.new');
  const newAgentsMd = path.join(backupDir, 'AGENTS.md.new');
  assert.ok(fs.existsSync(newPlanner), '.new adapted planner should exist');
  assert.ok(fs.existsSync(newAgentsMd), '.new adapted AGENTS.md should exist');
  // The .new versions must NOT contain the user customization — they are the
  // fresh adapted template output.
  assert.ok(
    !fs.readFileSync(newPlanner, 'utf8').includes('Custom Stack Notes'),
    '.new planner should be fresh template, not user customization'
  );
  assert.ok(
    !fs.readFileSync(newAgentsMd, 'utf8').includes('Custom Project Section'),
    '.new AGENTS.md should be fresh template, not user customization'
  );

  // Upgrade output must warn about preserved customizations
  assert.ok(
    output.includes('Review preserved customizations') || output.includes('customized — not updated'),
    `Upgrade output should warn about preserved customizations. Output: ${output.slice(0, 800)}`
  );
}

// --- Scenario 44: --upgrade on pristine fullstack replaces agents + AGENTS.md cleanly (v0.16.10) ---
//
// If the user has NOT customized anything, the smart-diff should replace
// agents/AGENTS.md in place with no "customized" warning. The backup dir
// still gets created (cheap insurance) but must not contain .new files
// for the pristine paths.

function testUpgradeReplacesPristineAgentsFullstack() {
  const dest = path.join(TMP_BASE, 'test-upgrade-pristine-fullstack');
  execSync(`node ${CLI} test-upgrade-pristine-fullstack --yes`, { cwd: TMP_BASE, stdio: 'pipe' });

  // Immediately upgrade without any modifications
  const output = execSync(`node ${CLI} --upgrade --force --yes`, {
    cwd: dest,
    encoding: 'utf8',
  });

  // Template agent + AGENTS.md should still be present and valid
  assertExists(dest, '.claude/agents/backend-planner.md');
  assertExists(dest, 'AGENTS.md');

  // No v0.16.10 "preserved customizations" block — the block only prints when
  // modifiedAgentsResults has entries, i.e. when an agent or AGENTS.md was
  // flagged as customized. Pre-existing standards smart-diff warnings use a
  // separate "Review preserved standards" block that is out of scope here.
  assert.ok(
    !output.includes('Review preserved customizations'),
    `Pristine fullstack upgrade should not flag agents or AGENTS.md as customized. Output: ${output.slice(0, 800)}`
  );

  // If .sdd-backup/ exists, there must be no .new files for pristine paths
  const backupRoot = path.join(dest, '.sdd-backup');
  if (fs.existsSync(backupRoot)) {
    const backupDirs = fs.readdirSync(backupRoot);
    for (const d of backupDirs) {
      const newPlanner = path.join(backupRoot, d, '.claude', 'agents', 'backend-planner.md.new');
      const newAgentsMd = path.join(backupRoot, d, 'AGENTS.md.new');
      assert.ok(!fs.existsSync(newPlanner), 'Pristine planner should not have .new backup');
      assert.ok(!fs.existsSync(newAgentsMd), 'Pristine AGENTS.md should not have .new backup');
    }
  }
}

// --- Scenario 45: adaptAgentContentString handles projectType !== 'fullstack' (v0.16.10) ---
//
// Unit-level regression guard for the upgrade smart-diff's pure adapter.
// The plan (Codex + Gemini critique) required verifying that
// adaptAgentContentString correctly strips frontend/backend refs for
// single-stack projects, so the upgrade comparison works in all three modes:
// fullstack, backend, frontend.
//
// We don't exercise the full --init → --upgrade round trip here: init-generator.js
// applies additional stack-specific adaptations (DDD → layered, ORM swaps,
// schema path rewrites) that are NOT mirrored in upgrade-generator.js. That
// cross-adapter drift is an accepted v0.16.10 limitation — the smart-diff
// conservatively preserves the init'd files on upgrade, surfacing them via
// the "Review preserved customizations" block with `.new` backups. Provenance
// tracking via .sdd-meta.json is deferred to v0.17.0 (see CHANGELOG).
//
// Instead, we test the pure function directly against its own invariants:
// 1. For fullstack projects the adapter is a no-op.
// 2. For backend projects the adapter removes frontend-only references from
//    the files listed in AGENT_ADAPTATION_RULES.backend.
// 3. For frontend projects the adapter removes backend-only references from
//    the files listed in AGENT_ADAPTATION_RULES.frontend.
// 4. The function is deterministic: calling it twice yields the same output.

function testUpgradeReplacesPristineAgentsBackendOnly() {
  const {
    adaptAgentContentString,
    AGENT_ADAPTATION_RULES,
  } = require('../lib/adapt-agents');
  const templateDir = path.join(__dirname, '..', 'template');

  // Load a representative template agent that has rules for both backend and
  // frontend single-stack modes.
  const specCreatorPath = path.join(templateDir, '.claude', 'agents', 'spec-creator.md');
  const rawTemplate = fs.readFileSync(specCreatorPath, 'utf8');

  // Invariant 1: fullstack is a no-op
  const fullstackOut = adaptAgentContentString(rawTemplate, 'spec-creator.md', 'fullstack');
  assert.strictEqual(
    fullstackOut,
    rawTemplate,
    'adaptAgentContentString should be a no-op for fullstack'
  );

  // Invariant 2: backend strips frontend-only refs
  const backendOut = adaptAgentContentString(rawTemplate, 'spec-creator.md', 'backend');
  assert.notStrictEqual(
    backendOut,
    rawTemplate,
    'Backend adaptation should modify spec-creator.md (has rules in AGENT_ADAPTATION_RULES.backend)'
  );
  assert.ok(
    !backendOut.includes('ui-components.md'),
    'Backend-only spec-creator.md should not mention ui-components.md after adaptation'
  );
  assert.ok(
    !backendOut.includes('Frontend Specifications'),
    'Backend-only spec-creator.md should not have the Frontend Specifications section'
  );

  // Invariant 3: frontend strips backend-only refs
  const frontendOut = adaptAgentContentString(rawTemplate, 'spec-creator.md', 'frontend');
  assert.notStrictEqual(
    frontendOut,
    rawTemplate,
    'Frontend adaptation should modify spec-creator.md'
  );
  assert.ok(
    !frontendOut.includes('api-spec.yaml, ui-components.md'),
    'Frontend-only spec-creator.md should not mention api-spec.yaml'
  );

  // Invariant 4: deterministic — upgrade smart-diff relies on this
  assert.strictEqual(
    adaptAgentContentString(rawTemplate, 'spec-creator.md', 'backend'),
    adaptAgentContentString(rawTemplate, 'spec-creator.md', 'backend'),
    'adaptAgentContentString must be deterministic'
  );

  // Invariant 5: AGENT_ADAPTATION_RULES keys are the files we expect to adapt.
  // Regression guard: if someone renames a template file without updating
  // the rules, this test fails loudly.
  const backendRuleFiles = Object.keys(AGENT_ADAPTATION_RULES.backend || {});
  for (const file of backendRuleFiles) {
    const p = path.join(templateDir, '.claude', 'agents', file);
    assert.ok(fs.existsSync(p), `AGENT_ADAPTATION_RULES.backend references missing template file: ${file}`);
  }
  const frontendRuleFiles = Object.keys(AGENT_ADAPTATION_RULES.frontend || {});
  for (const file of frontendRuleFiles) {
    const p = path.join(templateDir, '.claude', 'agents', file);
    assert.ok(fs.existsSync(p), `AGENT_ADAPTATION_RULES.frontend references missing template file: ${file}`);
  }
}

// --- Scenario 46: doctor check #14 detects AGENTS.md empty parens (v0.16.10) ---

function testDoctorAgentsMdEmptyParens() {
  const dest = path.join(TMP_BASE, 'test-doctor-agentsmd-empty-parens');
  execSync(`node ${CLI} test-doctor-agentsmd-empty-parens --yes`, { cwd: TMP_BASE, stdio: 'pipe' });

  // Corrupt AGENTS.md: replace "Backend patterns (...)" with "Backend patterns ()"
  const agentsMdPath = path.join(dest, 'AGENTS.md');
  const original = fs.readFileSync(agentsMdPath, 'utf8');
  const corrupted = original.replace(
    /Backend patterns \([^)]*\)/,
    'Backend patterns ()'
  );
  assert.notStrictEqual(corrupted, original, 'Test setup: should have replaced at least one pattern');
  fs.writeFileSync(agentsMdPath, corrupted, 'utf8');

  // Run doctor — check #14 must WARN
  let output;
  try {
    output = execSync(`node ${CLI} --doctor`, { cwd: dest, encoding: 'utf8' });
  } catch (e) {
    output = e.stdout || '';
  }

  assert.ok(
    output.includes('AGENTS.md:') && output.includes('issue'),
    `Doctor should report AGENTS.md issue. Output: ${output.slice(0, 800)}`
  );
  assert.ok(
    output.includes('empty parens') || output.includes('Backend patterns ()'),
    `Doctor should mention empty parens. Output: ${output.slice(0, 800)}`
  );
}

// --- Scenario 47: planner templates are project-agnostic (v0.16.10) ---
//
// Guard against foodXPlorer-specific overfit regressions in future edits.
// The 4 planner templates must not leak any project-specific strings.

function testAgentExamplesAreProjectAgnostic() {
  const plannerTemplates = [
    'template/.claude/agents/backend-planner.md',
    'template/.gemini/agents/backend-planner.md',
    'template/.claude/agents/frontend-planner.md',
    'template/.gemini/agents/frontend-planner.md',
  ];
  const forbidden = [
    'PortionContext',
    'StandardPortion',
    'formatPortionTermLabel',
    '@foodxplorer',
    'dishId',
    'croqueta',
    'pgvector',
    'racion',
    'tapa',
    'pincho',
  ];

  const repoRoot = path.join(__dirname, '..');
  for (const rel of plannerTemplates) {
    const full = path.join(repoRoot, rel);
    assert.ok(fs.existsSync(full), `Template missing: ${rel}`);
    const content = fs.readFileSync(full, 'utf8');
    for (const bad of forbidden) {
      assert.ok(
        !content.includes(bad),
        `${rel}: must not contain project-specific string "${bad}"`
      );
    }
  }
}

// --- Scenario 48: --upgrade idempotently appends .sdd-backup/ to .gitignore (v0.16.10) ---

function testUpgradeGitignoreAppend() {
  const dest = path.join(TMP_BASE, 'test-upgrade-gitignore-append');
  execSync(`node ${CLI} test-upgrade-gitignore-append --yes`, { cwd: TMP_BASE, stdio: 'pipe' });

  // Simulate an older project: strip .sdd-backup/ from .gitignore
  const gitignorePath = path.join(dest, '.gitignore');
  const withoutEntry = fs
    .readFileSync(gitignorePath, 'utf8')
    .split('\n')
    .filter((l) => !/\.sdd-backup/.test(l))
    .join('\n');
  fs.writeFileSync(gitignorePath, withoutEntry, 'utf8');
  assertFileNotContains(dest, '.gitignore', '.sdd-backup/');

  // Upgrade — should append .sdd-backup/
  execSync(`node ${CLI} --upgrade --force --yes`, { cwd: dest, stdio: 'pipe' });
  assertFileContains(dest, '.gitignore', '.sdd-backup/');

  // Count occurrences — must be exactly 1
  const after1 = fs.readFileSync(gitignorePath, 'utf8');
  const count1 = (after1.match(/^\.sdd-backup\/?\s*$/gm) || []).length;
  assert.strictEqual(count1, 1, `Expected exactly 1 .sdd-backup/ entry, got ${count1}`);

  // Upgrade again — must still be exactly 1 (idempotent)
  execSync(`node ${CLI} --upgrade --force --yes`, { cwd: dest, stdio: 'pipe' });
  const after2 = fs.readFileSync(gitignorePath, 'utf8');
  const count2 = (after2.match(/^\.sdd-backup\/?\s*$/gm) || []).length;
  assert.strictEqual(count2, 1, `After second upgrade expected 1 .sdd-backup/ entry, got ${count2}`);
}

// --- Scenario 49: --force-template replaces customized AGENTS.md unconditionally (v0.16.10) ---

function testForceTemplateFlag() {
  const dest = path.join(TMP_BASE, 'test-force-template-flag');
  execSync(`node ${CLI} test-force-template-flag --yes`, { cwd: TMP_BASE, stdio: 'pipe' });

  // Customize AGENTS.md
  const agentsMdPath = path.join(dest, 'AGENTS.md');
  const original = fs.readFileSync(agentsMdPath, 'utf8');
  fs.writeFileSync(
    agentsMdPath,
    original + '\n\n## My Custom Section X\n\nShould be wiped by --force-template.\n',
    'utf8'
  );

  // Upgrade with --force-template
  execSync(`node ${CLI} --upgrade --force --force-template --yes`, {
    cwd: dest,
    stdio: 'pipe',
  });

  // Customization is gone
  assertFileNotContains(dest, 'AGENTS.md', 'My Custom Section X');

  // Pre-replace content is recoverable from .sdd-backup/<ts>/AGENTS.md
  const backupRoot = path.join(dest, '.sdd-backup');
  assert.ok(fs.existsSync(backupRoot), '.sdd-backup/ must exist for recovery');
  const backupDirs = fs.readdirSync(backupRoot);
  assert.ok(backupDirs.length >= 1, 'Expected at least one backup dir');
  let foundCustomization = false;
  for (const d of backupDirs) {
    const backupAgents = path.join(backupRoot, d, 'AGENTS.md');
    if (fs.existsSync(backupAgents)) {
      const c = fs.readFileSync(backupAgents, 'utf8');
      if (c.includes('My Custom Section X')) {
        foundCustomization = true;
        break;
      }
    }
  }
  assert.ok(
    foundCustomization,
    'Pre-replace customization should be recoverable from .sdd-backup/<ts>/AGENTS.md'
  );
}

// --- Scenario 50: create-sdd-project writes .sdd-meta.json (v0.17.0) ---
//
// Fresh scaffold must produce a valid provenance file with hashes for
// every expected tracked file. Primary sanity check for the write path
// in lib/generator.js.

function testCreateWritesMetaJson() {
  const dest = path.join(TMP_BASE, 'test-create-meta');
  execSync(`node ${CLI} test-create-meta --yes`, { cwd: TMP_BASE, stdio: 'pipe' });

  assertExists(dest, '.sdd-meta.json');
  const meta = JSON.parse(fs.readFileSync(path.join(dest, '.sdd-meta.json'), 'utf8'));
  assert.strictEqual(meta.schemaVersion, 1, 'schemaVersion must be 1');
  assert.ok(typeof meta.hashes === 'object' && meta.hashes !== null, 'hashes must be an object');

  // Default scaffold is fullstack + both → 10 unique template agents × 2 tool dirs + AGENTS.md = 21
  const hashCount = Object.keys(meta.hashes).length;
  // v0.17.0 = 21 (10 agents × 2 tools + AGENTS.md). v0.17.1 adds 4 standards + 6 workflow-core files × 2 tools = 31 total.
  assert.strictEqual(hashCount, 31, `Expected 31 hash entries (v0.17.1), got ${hashCount}`);

  // Spot check: backend-planner + AGENTS.md present, valid shape
  const HASH_RE = /^sha256:[0-9a-f]{64}$/;
  assert.ok(
    HASH_RE.test(meta.hashes['.claude/agents/backend-planner.md']),
    'backend-planner hash must match sha256:<hex>'
  );
  assert.ok(HASH_RE.test(meta.hashes['AGENTS.md']), 'AGENTS.md hash must match sha256:<hex>');
}

// --- Scenario 51: --init writes .sdd-meta.json after stack adaptations (v0.17.0) ---
//
// --init applies stack adaptations (Zod → validation, Prisma → detected,
// DDD → layered). The post-init backend-developer.md must differ from
// the raw template, and its hash must reflect the adapted content.

function testInitWritesMetaJsonAfterStackAdaptations() {
  const dest = path.join(TMP_BASE, 'test-init-meta');
  fs.mkdirSync(dest, { recursive: true });
  // Create a minimal backend project that the scanner will detect as
  // Express + Mongoose (non-Prisma) → triggers ORM adaptations.
  fs.writeFileSync(
    path.join(dest, 'package.json'),
    JSON.stringify({
      name: 'test-init-meta',
      dependencies: { express: '^4.18.0', mongoose: '^7.0.0' },
    })
  );
  fs.mkdirSync(path.join(dest, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'src', 'index.ts'), 'import express from "express";');

  execSync(`node ${CLI} --init --yes`, { cwd: dest, stdio: 'pipe' });

  assertExists(dest, '.sdd-meta.json');
  const meta = JSON.parse(fs.readFileSync(path.join(dest, '.sdd-meta.json'), 'utf8'));
  assert.ok(Object.keys(meta.hashes).length > 0, 'hashes must not be empty');

  // backend-developer.md was stack-adapted: Prisma → Mongoose. Its hash
  // should reflect the adapted content, not the raw template.
  const backendDev = fs.readFileSync(path.join(dest, '.claude/agents/backend-developer.md'), 'utf8');
  assert.ok(
    backendDev.includes('Mongoose') || !backendDev.includes('Prisma ORM'),
    'backend-developer.md should have been stack-adapted to Mongoose'
  );
}

// --- Scenario 52: --upgrade updates .sdd-meta.json (v0.17.0) ---
//
// Round-trip: fresh scaffold → upgrade (same version, --force) → meta
// file is still valid and present.

function testUpgradeUpdatesMetaJson() {
  const dest = path.join(TMP_BASE, 'test-upgrade-meta');
  execSync(`node ${CLI} test-upgrade-meta --yes`, { cwd: TMP_BASE, stdio: 'pipe' });

  execSync(`node ${CLI} --upgrade --force --yes`, { cwd: dest, stdio: 'pipe' });

  assertExists(dest, '.sdd-meta.json');
  const meta = JSON.parse(fs.readFileSync(path.join(dest, '.sdd-meta.json'), 'utf8'));
  assert.strictEqual(meta.schemaVersion, 1);
  assert.strictEqual(Object.keys(meta.hashes).length, 31);
}

// --- Scenario 53: hash path produces no preserve warnings on clean upgrade ---
//
// **PRIMARY CODEX P1 REGRESSION GUARD**.
//
// Fresh v0.17.0 scaffold → upgrade twice with zero user edits → second
// upgrade MUST NOT produce a "Review preserved customizations" block
// for any template agent or AGENTS.md. This is the cross-version-drift
// fix at work: hash match proves the file is tool-canonical, upgrade
// replaces cleanly regardless of template evolution.

function testUpgradeHashPathReplacesWithoutWarning() {
  const dest = path.join(TMP_BASE, 'test-hash-path-clean');
  execSync(`node ${CLI} test-hash-path-clean --yes`, { cwd: TMP_BASE, stdio: 'pipe' });
  execSync(`node ${CLI} --upgrade --force --yes`, { cwd: dest, stdio: 'pipe' });

  const output = execSync(`node ${CLI} --upgrade --force --yes`, {
    cwd: dest,
    encoding: 'utf8',
  });

  assert.ok(
    !output.includes('Review preserved customizations'),
    `Second upgrade on pristine v0.17.0 project must not warn about customizations. Output: ${output.slice(0, 800)}`
  );
}

// --- Scenario 54: hash mismatch preserves file AND keeps old hash ---
//
// **PRIMARY CODEX M1 REGRESSION GUARD**.
//
// v0.17.0 scaffold → customize backend-planner → upgrade → file is
// preserved (good). Critically, the stored hash for backend-planner
// MUST still point at the ORIGINAL adapted content (pre-customization),
// NOT the customized content. Otherwise the next upgrade would hash-
// match the customization and silently overwrite it — reintroducing the
// exact class of bug v0.16.10 fixed.

function testUpgradeHashMismatchPreservesAndKeepsOldHash() {
  const dest = path.join(TMP_BASE, 'test-hash-mismatch');
  execSync(`node ${CLI} test-hash-mismatch --yes`, { cwd: TMP_BASE, stdio: 'pipe' });

  const metaBefore = JSON.parse(fs.readFileSync(path.join(dest, '.sdd-meta.json'), 'utf8'));
  const originalBackendPlannerHash = metaBefore.hashes['.claude/agents/backend-planner.md'];
  assert.ok(originalBackendPlannerHash, 'expected an initial hash for backend-planner');

  // Customize the file
  const plannerPath = path.join(dest, '.claude/agents/backend-planner.md');
  fs.writeFileSync(plannerPath, fs.readFileSync(plannerPath, 'utf8') + '\n## My Edit\n');

  // Upgrade
  const output = execSync(`node ${CLI} --upgrade --force --yes`, {
    cwd: dest,
    encoding: 'utf8',
  });

  // File is preserved
  assertFileContains(dest, '.claude/agents/backend-planner.md', 'My Edit');
  assert.ok(
    output.includes('backend-planner.md') && output.includes('not updated'),
    'Upgrade output must flag backend-planner.md as preserved'
  );

  // Hash UNCHANGED (Codex M1 invariant)
  const metaAfter = JSON.parse(fs.readFileSync(path.join(dest, '.sdd-meta.json'), 'utf8'));
  assert.strictEqual(
    metaAfter.hashes['.claude/agents/backend-planner.md'],
    originalBackendPlannerHash,
    'CODEX M1 VIOLATION: preserved file must NOT get a new hash entry — otherwise next upgrade would silently clobber the customization'
  );

  // Second upgrade: still preserved, still unchanged hash
  execSync(`node ${CLI} --upgrade --force --yes`, { cwd: dest, stdio: 'pipe' });
  assertFileContains(dest, '.claude/agents/backend-planner.md', 'My Edit');
  const metaAfter2 = JSON.parse(fs.readFileSync(path.join(dest, '.sdd-meta.json'), 'utf8'));
  assert.strictEqual(
    metaAfter2.hashes['.claude/agents/backend-planner.md'],
    originalBackendPlannerHash,
    'Hash must remain stable across subsequent preserve-only upgrades'
  );
}

// --- Scenario 55: fallback path handles init-stack-adapted files cleanly ---
//
// **PRIMARY GEMINI M1 REGRESSION GUARD**.
//
// Simulate a pre-v0.17.0 --init project: scaffold via --init (which
// applies stack adaptations), then delete .sdd-meta.json. Run upgrade.
// The fallback path must compare the user's stack-adapted file against
// applyStackAdaptationsToContent(adaptedCoreTarget) — NOT the bare core
// target — otherwise every init-adapted file would false-positive as
// "customized".

function testFallbackPathHandlesInitStackAdaptedFiles() {
  const dest = path.join(TMP_BASE, 'test-fallback-init');
  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(
    path.join(dest, 'package.json'),
    JSON.stringify({
      name: 'test-fallback-init',
      dependencies: { express: '^4.18.0', mongoose: '^7.0.0' },
    })
  );
  fs.mkdirSync(path.join(dest, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'src', 'index.ts'), 'import express from "express";');

  execSync(`node ${CLI} --init --yes`, { cwd: dest, stdio: 'pipe' });

  // Simulate pre-v0.17.0: no meta file
  fs.unlinkSync(path.join(dest, '.sdd-meta.json'));

  const output = execSync(`node ${CLI} --upgrade --force --yes`, {
    cwd: dest,
    encoding: 'utf8',
  });

  // The fallback path must NOT flag backend-developer.md as customized.
  // If applyStackAdaptationsToContent is broken, this assertion fails
  // because the comparison target lacks Mongoose adaptations and every
  // stack-adapted file mismatches.
  assert.ok(
    !/backend-developer\.md.*not updated/.test(output),
    `Fallback path must handle init-stack-adapted backend-developer.md without false positive. Output: ${output.slice(0, 1000)}`
  );
  assert.ok(
    !/backend-planner\.md.*not updated/.test(output),
    `Fallback path must handle init-stack-adapted backend-planner.md without false positive`
  );

  // After the upgrade, meta is re-written
  assertExists(dest, '.sdd-meta.json');

  // Second upgrade uses the hash path and should be clean
  const output2 = execSync(`node ${CLI} --upgrade --force --yes`, {
    cwd: dest,
    encoding: 'utf8',
  });
  assert.ok(
    !output2.includes('Review preserved customizations'),
    `Second upgrade via hash path must be clean. Output: ${output2.slice(0, 800)}`
  );
}

// --- Scenario 56: stack adaptations are idempotent (unit) ---
//
// Every rule in applyStackAdaptationsToContent must be safe to apply
// more than once. If a rule's source pattern re-appears in its own
// replacement, the second pass would further mutate the content and
// break the smart-diff invariant ("same input → same output").

function testStackAdaptationsIdempotent() {
  const { applyStackAdaptationsToContent } = require('../lib/stack-adaptations');
  const templateDir = path.join(__dirname, '..', 'template');

  const scan = {
    backend: { orm: 'Mongoose', db: 'MongoDB', validation: 'Joi' },
    srcStructure: { pattern: 'layered' },
  };
  const config = { projectType: 'backend', aiTools: 'claude' };

  const filesToTest = [
    '.claude/agents/backend-developer.md',
    '.claude/agents/backend-planner.md',
    '.claude/agents/spec-creator.md',
    '.claude/agents/production-code-validator.md',
    '.claude/agents/database-architect.md',
    '.claude/skills/development-workflow/SKILL.md',
    '.claude/skills/development-workflow/references/ticket-template.md',
  ];

  for (const relPath of filesToTest) {
    const absPath = path.join(templateDir, relPath);
    const raw = fs.readFileSync(absPath, 'utf8');

    const once = applyStackAdaptationsToContent(raw, relPath, scan, config);
    const twice = applyStackAdaptationsToContent(once, relPath, scan, config);

    assert.strictEqual(
      once,
      twice,
      `IDEMPOTENCY VIOLATION in ${relPath}: applying rules twice changes content. ` +
      `This would break the hash invariant.`
    );
  }
}

// --- Scenario 57: doctor check #15 validates .sdd-meta.json integrity ---

function testDoctorMetaJsonValidity() {
  const dest = path.join(TMP_BASE, 'test-doctor-meta');
  execSync(`node ${CLI} test-doctor-meta --yes`, { cwd: TMP_BASE, stdio: 'pipe' });

  // Fresh scaffold has valid meta — doctor should PASS check #15
  let output = execSync(`node ${CLI} --doctor`, { cwd: dest, encoding: 'utf8' });
  assert.ok(
    output.includes('Provenance metadata: valid'),
    `Fresh scaffold should have valid provenance. Output: ${output.slice(0, 800)}`
  );

  // Delete meta → informational PASS
  fs.unlinkSync(path.join(dest, '.sdd-meta.json'));
  output = execSync(`node ${CLI} --doctor`, { cwd: dest, encoding: 'utf8' });
  assert.ok(
    output.includes('Provenance metadata: not present'),
    `Missing meta should report informationally, not WARN. Output: ${output.slice(0, 800)}`
  );

  // Corrupt meta with invalid JSON → WARN
  fs.writeFileSync(path.join(dest, '.sdd-meta.json'), 'not json', 'utf8');
  try {
    output = execSync(`node ${CLI} --doctor`, { cwd: dest, encoding: 'utf8' });
  } catch (e) {
    output = e.stdout || '';
  }
  assert.ok(
    output.includes('invalid JSON'),
    `Corrupt meta should be reported as invalid JSON. Output: ${output.slice(0, 800)}`
  );

  // Orphan entry → WARN
  const validWithOrphan = {
    schemaVersion: 1,
    hashes: {
      'AGENTS.md': 'sha256:' + 'a'.repeat(64),
      'some/orphan/path.md': 'sha256:' + 'b'.repeat(64),
    },
  };
  fs.writeFileSync(path.join(dest, '.sdd-meta.json'), JSON.stringify(validWithOrphan), 'utf8');
  try {
    output = execSync(`node ${CLI} --doctor`, { cwd: dest, encoding: 'utf8' });
  } catch (e) {
    output = e.stdout || '';
  }
  assert.ok(
    output.includes('orphan'),
    `Orphan entry should be flagged. Output: ${output.slice(0, 800)}`
  );
}

// --- Scenario 58b: --init excludes pre-existing user files from provenance ---
//
// **CODEX ROUND 2 P1 REGRESSION GUARD**.
//
// When --init runs on a project that already has AGENTS.md (user-owned),
// copyFileIfNotExists skips it and records it in `skipped`. The post-init
// `.sdd-meta.json` must NOT contain a hash for AGENTS.md — otherwise the
// next upgrade would hash-match the user's file and silently overwrite
// it with SDD's template content.

function testInitExcludesPreExistingUserFiles() {
  const dest = path.join(TMP_BASE, 'test-init-preexisting');
  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(
    path.join(dest, 'package.json'),
    JSON.stringify({ name: 'test-preexisting', dependencies: { express: '^4.18.0' } })
  );
  fs.mkdirSync(path.join(dest, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'src', 'index.ts'), 'import express from "express";');

  // Create a pre-existing AGENTS.md that the user owns. --init must
  // skip it and NOT hash it.
  fs.writeFileSync(
    path.join(dest, 'AGENTS.md'),
    '# Our custom AGENTS.md\n\nDo not touch this.\n'
  );

  // Also create an existing .gitignore so appendGitignore runs.
  fs.writeFileSync(path.join(dest, '.gitignore'), 'node_modules/\n');

  execSync(`node ${CLI} --init --yes`, { cwd: dest, stdio: 'pipe' });

  // AGENTS.md was preserved
  assertFileContains(dest, 'AGENTS.md', 'Our custom AGENTS.md');
  assertFileContains(dest, 'AGENTS.md', 'Do not touch this');

  // .sdd-meta.json exists but does NOT contain AGENTS.md hash
  assertExists(dest, '.sdd-meta.json');
  const meta = JSON.parse(fs.readFileSync(path.join(dest, '.sdd-meta.json'), 'utf8'));
  assert.ok(
    !('AGENTS.md' in meta.hashes),
    'CODEX ROUND 2 P1 VIOLATION: pre-existing AGENTS.md must NOT be hashed by --init. ' +
    'If it is, the next upgrade will silently overwrite user content.'
  );

  // .gitignore now includes .sdd-meta.json and .sdd-backup (Codex round 2 P2 fix)
  assertFileContains(dest, '.gitignore', '.sdd-meta.json');
  assertFileContains(dest, '.gitignore', '.sdd-backup/');

  // Now run upgrade. AGENTS.md should still be the user's version.
  execSync(`node ${CLI} --upgrade --force --yes`, { cwd: dest, stdio: 'pipe' });
  assertFileContains(dest, 'AGENTS.md', 'Our custom AGENTS.md');
}

// --- Scenario 58: scanner overrides wizard on upgrade (documented semantics) ---
//
// Documents the v0.17.0 design decision that scanner is the authoritative
// source of truth post-install. A project scaffolded via create-sdd-project
// captures wizard-driven adaptations at install. Post-install, when the
// user adds real source code (e.g., Mongoose), the scanner detects the
// actual stack. First upgrade: hash matches (user didn't edit) → replace
// → scanner-driven adaptations apply → file now reflects Mongoose.

function testScannerOverridesWizardOnUpgrade() {
  const dest = path.join(TMP_BASE, 'test-scanner-wizard');
  // Fresh scaffold (generator.js path — lighter adaptations, Prisma default)
  execSync(`node ${CLI} test-scanner-wizard --yes`, { cwd: TMP_BASE, stdio: 'pipe' });

  // Simulate user installing Mongoose after scaffold
  const pkgPath = path.join(dest, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.dependencies = pkg.dependencies || {};
  pkg.dependencies.mongoose = '^7.0.0';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');

  // Upgrade — scanner detects Mongoose, stack adaptations re-apply. This
  // scenario asserts the upgrade COMPLETES without crashing and the
  // backend-developer.md does NOT still claim "Prisma ORM" afterwards.
  // (Hash match → replace → stack adaptations → Mongoose in, Prisma out.)
  execSync(`node ${CLI} --upgrade --force --yes`, { cwd: dest, stdio: 'pipe' });

  const backendDev = fs.readFileSync(path.join(dest, '.claude/agents/backend-developer.md'), 'utf8');
  assert.ok(
    !backendDev.includes('Prisma ORM'),
    'Post-upgrade backend-developer.md must not contain Prisma ORM — scanner detected Mongoose'
  );
  // Documented: the replacement does NOT necessarily include the word
  // "Mongoose" (the replacement rule swaps "Prisma ORM, and PostgreSQL"
  // for ORM+DB labels). Just assert the Prisma reference is gone.
}

// --- v0.17.1 Scenarios 62-63c: Monorepo scanner detection + additive invariant ---

function setupFakeMonorepo(destName, opts = {}) {
  const dest = path.join(TMP_BASE, destName);
  const workspaces = opts.workspaces || ['packages/*'];
  const wsPackages = opts.wsPackages || [
    { relPath: 'packages/api', name: '@test/api', deps: { fastify: '^5.0.0', '@prisma/client': '^6.0.0' } },
  ];
  const rootDeps = opts.rootDeps || {};

  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(
    path.join(dest, 'package.json'),
    JSON.stringify({ name: destName, workspaces, dependencies: rootDeps }, null, 2)
  );
  for (const ws of wsPackages) {
    const wsDir = path.join(dest, ...ws.relPath.split('/'));
    fs.mkdirSync(wsDir, { recursive: true });
    fs.writeFileSync(
      path.join(wsDir, 'package.json'),
      JSON.stringify({ name: ws.name, dependencies: ws.deps || {} }, null, 2)
    );
  }
  return dest;
}

function testMonorepoScannerDetection() {
  // Root has NO backend deps; workspace packages/api has fastify + prisma.
  // v0.17.0 scanner would return { detected: false } because it only reads
  // root package.json. v0.17.1 scanner must enumerate workspaces and detect
  // the Fastify + Prisma stack from packages/api, recording workspaceSource.
  delete require.cache[require.resolve('../lib/scanner')];
  const { scan } = require('../lib/scanner');
  const dest = setupFakeMonorepo('test-monorepo-scanner');

  const result = scan(dest);

  assert.strictEqual(result.isMonorepo, true, 'isMonorepo should be true');
  assert.strictEqual(
    result.backend.detected,
    true,
    'backend should be detected via workspace enumeration (v0.17.1 monorepo fix)'
  );
  assert.strictEqual(result.backend.framework, 'Fastify', 'framework should be Fastify');
  assert.strictEqual(result.backend.orm, 'Prisma', 'orm should be Prisma');
  assert.strictEqual(
    result.backend.workspaceSource,
    'packages/api',
    'workspaceSource should name the detected workspace'
  );
}

function testAgentsMdMonorepoOutput() {
  // Same fixture as scenario 62: monorepo with Fastify+Prisma in packages/api.
  // After Feature 2 scanner fix, adaptAgentsMd must substitute the template
  // literal `Backend patterns (DDD, Express, Prisma)` with the detected stack.
  delete require.cache[require.resolve('../lib/scanner')];
  delete require.cache[require.resolve('../lib/init-generator')];
  const { scan } = require('../lib/scanner');
  const { adaptAgentsMd } = require('../lib/init-generator');
  const dest = setupFakeMonorepo('test-agents-md-monorepo');

  const scanResult = scan(dest);
  const template = fs.readFileSync(path.join(__dirname, '..', 'template', 'AGENTS.md'), 'utf8');
  const config = { projectType: 'backend', aiTools: 'both' };
  const adapted = adaptAgentsMd(template, config, scanResult);

  assert.ok(
    !adapted.includes('Backend patterns (DDD, Express, Prisma)'),
    'adaptAgentsMd output must NOT contain the unsubstituted template literal'
  );
  assert.ok(
    /Backend patterns \([^)]*Fastify[^)]*\)/.test(adapted),
    'adaptAgentsMd output must include Fastify in Backend patterns (...)'
  );
}

function testMonorepoGlobOrdering() {
  // Two patterns, multiple matches per pattern. Iteration order MUST be:
  //   declaration order outer, lexical Unicode codepoint order inner,
  //   deduplicated by normalized path (first occurrence wins).
  delete require.cache[require.resolve('../lib/scanner')];
  const scannerMod = require('../lib/scanner');
  assert.ok(
    typeof scannerMod.enumerateWorkspaces === 'function',
    'scanner.enumerateWorkspaces must be exported for deterministic ordering tests'
  );

  // Case 1: typical non-overlapping patterns, two declaration groups
  const dest1 = path.join(TMP_BASE, 'test-monorepo-ordering-1');
  fs.mkdirSync(dest1, { recursive: true });
  fs.writeFileSync(
    path.join(dest1, 'package.json'),
    JSON.stringify({ name: 'test-ordering-1', workspaces: ['packages/*', 'apps/*'] }, null, 2)
  );
  for (const rel of ['packages/web', 'packages/api', 'packages/shared', 'apps/landing', 'apps/admin']) {
    const wsDir = path.join(dest1, ...rel.split('/'));
    fs.mkdirSync(wsDir, { recursive: true });
    fs.writeFileSync(path.join(wsDir, 'package.json'), JSON.stringify({ name: rel }, null, 2));
  }
  const order1 = scannerMod.enumerateWorkspaces(dest1, {
    name: 'test-ordering-1',
    workspaces: ['packages/*', 'apps/*'],
  });
  assert.deepStrictEqual(
    order1,
    ['packages/api', 'packages/shared', 'packages/web', 'apps/admin', 'apps/landing'],
    'declaration order outer, lexical inner'
  );

  // Case 2: overlapping patterns must dedupe by normalized path, first wins
  const dest2 = path.join(TMP_BASE, 'test-monorepo-ordering-2');
  fs.mkdirSync(dest2, { recursive: true });
  fs.writeFileSync(
    path.join(dest2, 'package.json'),
    JSON.stringify({ name: 'test-ordering-2', workspaces: ['packages/*', 'packages/api'] }, null, 2)
  );
  for (const rel of ['packages/api', 'packages/bot', 'packages/shared']) {
    const wsDir = path.join(dest2, ...rel.split('/'));
    fs.mkdirSync(wsDir, { recursive: true });
    fs.writeFileSync(path.join(wsDir, 'package.json'), JSON.stringify({ name: rel }, null, 2));
  }
  const order2 = scannerMod.enumerateWorkspaces(dest2, {
    name: 'test-ordering-2',
    workspaces: ['packages/*', 'packages/api'],
  });
  assert.deepStrictEqual(
    order2,
    ['packages/api', 'packages/bot', 'packages/shared'],
    'overlapping patterns dedupe by normalized path, first occurrence wins'
  );
}

function testScannerAdditiveInvariant() {
  // Scanner additive invariant: for single-package projects, v0.17.1 produces
  // the SAME result as v0.17.0 (no workspace enumeration fires). For monorepos
  // where v0.17.0 would have returned { detected: false }, v0.17.1 returns
  // equal-or-richer detection.
  //
  // Since we cannot run v0.17.0 binary in-process, we structurally verify:
  //   (a) single-package with root backend deps → workspaceSource is undefined
  //       (enumeration never ran — same behavior as v0.17.0)
  //   (b) monorepo with workspace-only deps → workspaceSource is set
  //       (new behavior — strict superset of v0.17.0)
  delete require.cache[require.resolve('../lib/scanner')];
  const { scan } = require('../lib/scanner');

  // Case (a): single-package project, root has express+prisma
  const destA = path.join(TMP_BASE, 'test-additive-single');
  fs.mkdirSync(destA, { recursive: true });
  fs.writeFileSync(
    path.join(destA, 'package.json'),
    JSON.stringify({
      name: 'test-single',
      dependencies: { express: '^4.0.0', '@prisma/client': '^6.0.0' },
    }, null, 2)
  );
  const scanA = scan(destA);
  assert.strictEqual(scanA.backend.detected, true, 'single-package backend must be detected from root');
  assert.strictEqual(scanA.backend.framework, 'Express');
  assert.strictEqual(scanA.backend.orm, 'Prisma');
  assert.strictEqual(
    scanA.backend.workspaceSource,
    undefined,
    'single-package project must not have workspaceSource set (enumeration did not fire — byte-identical to v0.17.0)'
  );
  assert.strictEqual(scanA.isMonorepo, false, 'single-package project must not be flagged as monorepo');

  // Case (b): monorepo, root has no deps, workspace has fastify+prisma
  const destB = setupFakeMonorepo('test-additive-monorepo');
  const scanB = scan(destB);
  assert.strictEqual(scanB.isMonorepo, true);
  assert.strictEqual(scanB.backend.detected, true, 'monorepo backend must be detected via workspace enumeration');
  assert.strictEqual(scanB.backend.framework, 'Fastify');
  assert.strictEqual(scanB.backend.workspaceSource, 'packages/api');

  // Parenthesis-entry-count invariant: v0.17.1 adaptAgentsMd for monorepo
  // must produce ≥ entries than the v0.17.0 equivalent (empty, because the
  // template literal would have stayed unsubstituted).
  delete require.cache[require.resolve('../lib/init-generator')];
  const { adaptAgentsMd } = require('../lib/init-generator');
  const template = fs.readFileSync(path.join(__dirname, '..', 'template', 'AGENTS.md'), 'utf8');
  const config = { projectType: 'backend', aiTools: 'both' };
  const adaptedB = adaptAgentsMd(template, config, scanB);
  const matchB = adaptedB.match(/Backend patterns \(([^)]*)\)/);
  assert.ok(matchB, 'adapted AGENTS.md must contain a Backend patterns (...) line');
  const entriesB = matchB[1].split(',').filter((s) => s.trim().length > 0).length;
  assert.ok(
    entriesB >= 2,
    `v0.17.1 monorepo adaptAgentsMd must produce ≥2 Backend patterns entries (got ${entriesB}: "${matchB[1]}")`
  );
}

// --- v0.17.1 Scenarios 60-69: Smart-diff expansion (Feature 1) ---

function testHashBasedStandardsUpgrade() {
  // Scaffold v0.17.1 project → 4 standards + 6 workflow-core files are hashed
  // (31 total entries). Customize backend-standards.mdc. Run upgrade.
  // Assert: customized file preserved with .new backup, hash NOT updated.
  // Assert: other standards replaced, hashes present.
  const dest = path.join(TMP_BASE, 'test-hash-standards-upgrade');
  execSync(`node ${CLI} test-hash-standards-upgrade --yes`, { cwd: TMP_BASE, stdio: 'pipe' });

  const beforeMeta = JSON.parse(fs.readFileSync(path.join(dest, '.sdd-meta.json'), 'utf8'));
  const standardsKey = 'ai-specs/specs/backend-standards.mdc';
  assert.ok(beforeMeta.hashes[standardsKey], 'backend-standards.mdc must be hashed after fresh install');
  const preCustomizationHash = beforeMeta.hashes[standardsKey];

  // Customize the backend-standards file
  const backendStdPath = path.join(dest, 'ai-specs', 'specs', 'backend-standards.mdc');
  const originalContent = fs.readFileSync(backendStdPath, 'utf8');
  fs.writeFileSync(backendStdPath, originalContent + '\n\n## Custom user section\n\nThis is my custom addition.\n', 'utf8');

  // Upgrade
  execSync(`node ${CLI} --upgrade --force --yes`, { cwd: dest, stdio: 'pipe' });

  // Customized file preserved on disk (still has the custom section)
  const postUpgradeContent = fs.readFileSync(backendStdPath, 'utf8');
  assert.ok(
    postUpgradeContent.includes('Custom user section'),
    'Customized backend-standards.mdc must be preserved on upgrade'
  );

  // Hash NOT updated (Codex M1 invariant)
  const afterMeta = JSON.parse(fs.readFileSync(path.join(dest, '.sdd-meta.json'), 'utf8'));
  assert.strictEqual(
    afterMeta.hashes[standardsKey],
    preCustomizationHash,
    'Preserved file must keep its pre-customization hash (Codex M1 invariant)'
  );

  // .new backup exists
  const backupDirs = fs.readdirSync(path.join(dest, '.sdd-backup'));
  assert.ok(backupDirs.length > 0, 'at least one .sdd-backup timestamp dir must exist');
  const latest = backupDirs.sort().pop();
  const newBackupPath = path.join(dest, '.sdd-backup', latest, 'ai-specs', 'specs', 'backend-standards.mdc.new');
  assert.ok(fs.existsSync(newBackupPath), '.new backup of adapted target must exist for preserved standard');

  // Other standards were still replaced (their hashes should be present, same or new)
  assert.ok(afterMeta.hashes['ai-specs/specs/base-standards.mdc'], 'base-standards.mdc hash must still be present');
  assert.ok(afterMeta.hashes['ai-specs/specs/frontend-standards.mdc'], 'frontend-standards.mdc hash must still be present');
  assert.ok(afterMeta.hashes['ai-specs/specs/documentation-standards.mdc'], 'documentation-standards.mdc hash must still be present');
}

function testFallbackCompareForWorkflowCore() {
  // Simulate a pre-v0.17.1 project (fresh v0.17.1 scaffold then delete the
  // v0.17.1 hashes from .sdd-meta.json to emulate the no-hash fallback path).
  // Pristine workflow-core files should be replaced via fallback content-compare.
  const dest = path.join(TMP_BASE, 'test-fallback-workflow-core');
  execSync(`node ${CLI} test-fallback-workflow-core --yes`, { cwd: TMP_BASE, stdio: 'pipe' });

  // Emulate pre-v0.17.1 meta: drop the 10 new hashes, keep only the v0.17.0 set
  const metaPath = path.join(dest, '.sdd-meta.json');
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const v0170Paths = new Set([
    'AGENTS.md',
    '.claude/agents/backend-developer.md',
    '.claude/agents/backend-planner.md',
    '.claude/agents/code-review-specialist.md',
    '.claude/agents/database-architect.md',
    '.claude/agents/frontend-developer.md',
    '.claude/agents/frontend-planner.md',
    '.claude/agents/production-code-validator.md',
    '.claude/agents/qa-engineer.md',
    '.claude/agents/spec-creator.md',
    '.claude/agents/ui-ux-designer.md',
    '.gemini/agents/backend-developer.md',
    '.gemini/agents/backend-planner.md',
    '.gemini/agents/code-review-specialist.md',
    '.gemini/agents/database-architect.md',
    '.gemini/agents/frontend-developer.md',
    '.gemini/agents/frontend-planner.md',
    '.gemini/agents/production-code-validator.md',
    '.gemini/agents/qa-engineer.md',
    '.gemini/agents/spec-creator.md',
    '.gemini/agents/ui-ux-designer.md',
  ]);
  const filtered = {};
  for (const [k, v] of Object.entries(meta.hashes)) {
    if (v0170Paths.has(k)) filtered[k] = v;
  }
  meta.hashes = filtered;
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf8');

  // Leave all workflow-core files pristine and run upgrade
  execSync(`node ${CLI} --upgrade --force --yes`, { cwd: dest, stdio: 'pipe' });

  // Post-upgrade: the v0.17.1 new paths must now be in the meta (fallback path
  // identified them as pristine via normalizedContentEquals and replaced them)
  const afterMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  assert.ok(
    afterMeta.hashes['.claude/skills/development-workflow/SKILL.md'],
    'SKILL.md hash must be present after fallback replace'
  );
  assert.ok(
    afterMeta.hashes['.claude/skills/development-workflow/references/ticket-template.md'],
    'ticket-template.md hash must be present after fallback replace'
  );
  assert.ok(
    afterMeta.hashes['.claude/skills/development-workflow/references/merge-checklist.md'],
    'merge-checklist.md hash must be present after fallback replace'
  );
  assert.ok(
    afterMeta.hashes['ai-specs/specs/backend-standards.mdc'],
    'backend-standards.mdc hash must be present after fallback replace'
  );
}

function testDeletedStandardFileRestored() {
  // Delete a tracked standard, run upgrade, assert it's restored and hashed.
  const dest = path.join(TMP_BASE, 'test-deleted-standard-restored');
  execSync(`node ${CLI} test-deleted-standard-restored --yes`, { cwd: TMP_BASE, stdio: 'pipe' });

  const frontendStdPath = path.join(dest, 'ai-specs', 'specs', 'frontend-standards.mdc');
  assert.ok(fs.existsSync(frontendStdPath), 'frontend-standards.mdc must exist after scaffold');
  fs.unlinkSync(frontendStdPath);

  execSync(`node ${CLI} --upgrade --force --yes`, { cwd: dest, stdio: 'pipe' });

  assert.ok(fs.existsSync(frontendStdPath), 'frontend-standards.mdc must be restored after upgrade of deleted file');
  const meta = JSON.parse(fs.readFileSync(path.join(dest, '.sdd-meta.json'), 'utf8'));
  assert.ok(
    meta.hashes['ai-specs/specs/frontend-standards.mdc'],
    'restored file must have a hash entry in .sdd-meta.json'
  );
}

function testMetaReadCompatibilityContract() {
  // Contract test for D3 invariant: v0.17.1's readMeta + pruneExpectedAbsent
  // composition must drop v0.17.1-specific keys when pruned with v0.17.0's
  // expected-path set. This does NOT simulate the v0.17.0 binary — it tests
  // v0.17.1's own behavior under the D3 invariant.
  delete require.cache[require.resolve('../lib/meta')];
  const meta = require('../lib/meta');

  // Frozen v0.17.0 expected-path snapshot (20 agents × 2 tools + AGENTS.md filtered by aiTools)
  // For aiTools='both', projectType='fullstack': 10 agents per tool × 2 tools + AGENTS.md = 21 paths
  const v0170ExpectedSet = new Set([
    'AGENTS.md',
    '.claude/agents/backend-developer.md', '.claude/agents/backend-planner.md',
    '.claude/agents/code-review-specialist.md', '.claude/agents/database-architect.md',
    '.claude/agents/frontend-developer.md', '.claude/agents/frontend-planner.md',
    '.claude/agents/production-code-validator.md', '.claude/agents/qa-engineer.md',
    '.claude/agents/spec-creator.md', '.claude/agents/ui-ux-designer.md',
    '.gemini/agents/backend-developer.md', '.gemini/agents/backend-planner.md',
    '.gemini/agents/code-review-specialist.md', '.gemini/agents/database-architect.md',
    '.gemini/agents/frontend-developer.md', '.gemini/agents/frontend-planner.md',
    '.gemini/agents/production-code-validator.md', '.gemini/agents/qa-engineer.md',
    '.gemini/agents/spec-creator.md', '.gemini/agents/ui-ux-designer.md',
  ]);

  // Build a v0.17.1-shaped meta (has v0.17.0 paths + v0.17.1 extras)
  const sampleHash = 'sha256:' + '0'.repeat(64);
  const v0171Hashes = {};
  for (const p of v0170ExpectedSet) v0171Hashes[p] = sampleHash;
  v0171Hashes['ai-specs/specs/base-standards.mdc'] = sampleHash;
  v0171Hashes['ai-specs/specs/backend-standards.mdc'] = sampleHash;
  v0171Hashes['.claude/skills/development-workflow/SKILL.md'] = sampleHash;
  v0171Hashes['.claude/skills/development-workflow/references/merge-checklist.md'] = sampleHash;

  // Use v0.17.1 library code but with a frozen v0.17.0 expected-path set
  // (simulating v0.17.0's pruneExpectedAbsent behavior).
  const pruned = {};
  for (const [k, v] of Object.entries(v0171Hashes)) {
    if (v0170ExpectedSet.has(k)) pruned[k] = v;
  }

  // Assert: v0.17.0 paths survive
  assert.strictEqual(Object.keys(pruned).length, 21, 'v0.17.0 should see 21 paths after pruning');
  assert.ok(pruned['AGENTS.md'], 'AGENTS.md must survive pruning');
  assert.ok(pruned['.claude/agents/backend-planner.md'], 'backend-planner.md must survive pruning');

  // Assert: v0.17.1 extras are dropped
  assert.strictEqual(
    pruned['ai-specs/specs/base-standards.mdc'],
    undefined,
    'v0.17.1 standards must be pruned by v0.17.0 expected-path set'
  );
  assert.strictEqual(
    pruned['.claude/skills/development-workflow/SKILL.md'],
    undefined,
    'v0.17.1 workflow-core must be pruned by v0.17.0 expected-path set'
  );

  // Additionally: v0.17.1's readMeta (our own) must successfully parse a meta
  // file with the extra keys — no crash, no rejection.
  const testMetaPath = path.join(TMP_BASE, 'test-meta-read-compat.json');
  fs.mkdirSync(TMP_BASE, { recursive: true });
  fs.writeFileSync(
    testMetaPath,
    JSON.stringify({ schemaVersion: 1, hashes: v0171Hashes }, null, 2),
    'utf8'
  );
  // readMeta expects a directory, not a file, and looks for .sdd-meta.json inside.
  // Use a temp dir.
  const tmpDir = path.join(TMP_BASE, 'test-meta-read-compat');
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(
    path.join(tmpDir, '.sdd-meta.json'),
    JSON.stringify({ schemaVersion: 1, hashes: v0171Hashes }, null, 2),
    'utf8'
  );
  const read = meta.readMeta(tmpDir);
  assert.ok(read, 'readMeta must return a valid object for v0.17.1-shaped input');
  assert.strictEqual(read.schemaVersion, 1);
  assert.ok(Object.keys(read.hashes).length >= Object.keys(v0171Hashes).length,
    'readMeta must retain all valid hash entries (permissive on keys)');
}

function testIdempotencyExtendedRules() {
  // v0.17.1: assert that applying standards adapters twice produces the same
  // output. This is a stronger invariant than scenario 56 (which covers
  // applyStackAdaptationsToContent rules); standards use dedicated functions.
  //
  // Uses a real scan() result from a scaffolded project to avoid mock-object
  // incompleteness (standards adapters access scan.language, scan.tests,
  // scan.srcStructure, etc.).
  delete require.cache[require.resolve('../lib/init-generator')];
  delete require.cache[require.resolve('../lib/scanner')];
  const { adaptBaseStandards, adaptBackendStandards, adaptFrontendStandards } = require('../lib/init-generator');
  const { scan: scanFn } = require('../lib/scanner');

  // Scaffold a project to get a realistic scan object
  const dest = path.join(TMP_BASE, 'test-idempotency-extended');
  execSync(`node ${CLI} test-idempotency-extended --yes`, { cwd: TMP_BASE, stdio: 'pipe' });
  const scan = scanFn(dest);
  const config = { projectType: 'fullstack', aiTools: 'both' };

  const baseRaw = fs.readFileSync(path.join(__dirname, '..', 'template', 'ai-specs', 'specs', 'base-standards.mdc'), 'utf8');
  const backendRaw = fs.readFileSync(path.join(__dirname, '..', 'template', 'ai-specs', 'specs', 'backend-standards.mdc'), 'utf8');
  const frontendRaw = fs.readFileSync(path.join(__dirname, '..', 'template', 'ai-specs', 'specs', 'frontend-standards.mdc'), 'utf8');

  // adaptBaseStandards
  const base1 = adaptBaseStandards(baseRaw, scan, config);
  const base2 = adaptBaseStandards(base1, scan, config);
  assert.strictEqual(base1, base2, 'adaptBaseStandards must be idempotent');

  // adaptBackendStandards
  const backend1 = adaptBackendStandards(backendRaw, scan);
  const backend2 = adaptBackendStandards(backend1, scan);
  assert.strictEqual(backend1, backend2, 'adaptBackendStandards must be idempotent');

  // adaptFrontendStandards
  const frontend1 = adaptFrontendStandards(frontendRaw, scan);
  const frontend2 = adaptFrontendStandards(frontend1, scan);
  assert.strictEqual(frontend1, frontend2, 'adaptFrontendStandards must be idempotent');
}

function testFullUpgradeIdempotency() {
  // Full end-to-end idempotency: run upgrade twice in a row, second run must
  // produce a byte-identical .sdd-meta.json with zero .new files generated
  // in the second pass. This catches non-idempotent adapters + decision-tree
  // bugs where pristine files get treated as dirty on re-upgrade.
  const dest = path.join(TMP_BASE, 'test-full-upgrade-idempotency');
  execSync(`node ${CLI} test-full-upgrade-idempotency --yes`, { cwd: TMP_BASE, stdio: 'pipe' });

  // First upgrade
  execSync(`node ${CLI} --upgrade --force --yes`, { cwd: dest, stdio: 'pipe' });
  const firstMeta = fs.readFileSync(path.join(dest, '.sdd-meta.json'), 'utf8');

  // Count .new files after first upgrade
  const firstBackupDirs = fs.existsSync(path.join(dest, '.sdd-backup'))
    ? fs.readdirSync(path.join(dest, '.sdd-backup'))
    : [];
  const countNewFilesRecursive = (dir) => {
    if (!fs.existsSync(dir)) return 0;
    let count = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) count += countNewFilesRecursive(p);
      else if (entry.name.endsWith('.new')) count += 1;
    }
    return count;
  };
  const firstNewCount = firstBackupDirs.reduce(
    (sum, d) => sum + countNewFilesRecursive(path.join(dest, '.sdd-backup', d)),
    0
  );

  // Second upgrade
  execSync(`node ${CLI} --upgrade --force --yes`, { cwd: dest, stdio: 'pipe' });
  const secondMeta = fs.readFileSync(path.join(dest, '.sdd-meta.json'), 'utf8');

  const secondBackupDirs = fs.readdirSync(path.join(dest, '.sdd-backup'));
  const secondNewCount = secondBackupDirs.reduce(
    (sum, d) => sum + countNewFilesRecursive(path.join(dest, '.sdd-backup', d)),
    0
  );

  // Meta must be byte-identical after second run
  assert.strictEqual(firstMeta, secondMeta, 'meta.json must be byte-identical after two consecutive upgrades');

  // No NEW .new files produced by second upgrade (delta between first and second)
  assert.strictEqual(
    secondNewCount,
    firstNewCount,
    `second upgrade must produce zero additional .new files (delta: ${secondNewCount - firstNewCount})`
  );
}

function testNormalizationResilienceAllTrackedFiles() {
  // Parameterized over all smart-diff tracked paths (v0.17.0 + v0.17.1 new).
  // For each path, write a CRLF variant to disk and run upgrade. The file
  // must be replaced with the LF canonical version (no false-positive preserve).
  //
  // Note: this scenario tests ONLY CRLF drift (the sole transformation that
  // normalizeForCompare handles, per lib/meta.js:63-65). Trailing whitespace
  // and leading/trailing blank lines are NOT normalized — the v0.17.0 Gemini
  // M2 fix deliberately kept normalization conservative to preserve markdown
  // hard-breaks. Plan v1.2's "composite drift" wording was overbroad — scenario
  // scope is adjusted inline to match actual function behavior.
  delete require.cache[require.resolve('../lib/meta')];
  const { expectedSmartDiffTrackedPaths } = require('../lib/meta');

  const dest = path.join(TMP_BASE, 'test-normalization-resilience');
  execSync(`node ${CLI} test-normalization-resilience --yes`, { cwd: TMP_BASE, stdio: 'pipe' });

  const trackedPaths = [...expectedSmartDiffTrackedPaths('both', 'fullstack')];

  let injected = 0;
  for (const posix of trackedPaths) {
    const abs = path.join(dest, ...posix.split('/'));
    if (!fs.existsSync(abs)) continue;
    const content = fs.readFileSync(abs, 'utf8');
    // Convert LF to CRLF
    const crlfContent = content.replace(/\n/g, '\r\n');
    fs.writeFileSync(abs, crlfContent, 'utf8');
    injected++;
  }
  assert.ok(injected > 20, `at least 20 tracked files must be written with CRLF drift (got ${injected})`);

  // Upgrade — all files should be treated as pristine (hash mismatch would be
  // caught by the hash decision tree; CRLF vs LF normalize to equal hashes
  // since computeHash internally calls normalizeForCompare).
  execSync(`node ${CLI} --upgrade --force --yes`, { cwd: dest, stdio: 'pipe' });

  // After upgrade, no files should have a .new backup (all treated as pristine)
  const backupBase = path.join(dest, '.sdd-backup');
  const countNewFiles = (dir) => {
    if (!fs.existsSync(dir)) return [];
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...countNewFiles(p));
      else if (entry.name.endsWith('.new')) out.push(path.relative(backupBase, p));
    }
    return out;
  };
  const newFiles = countNewFiles(backupBase);
  assert.strictEqual(
    newFiles.length,
    0,
    `CRLF-drifted tracked files must NOT produce .new backups (found: ${newFiles.join(', ')})`
  );

  // Also: post-upgrade files must now have LF (canonical) line endings
  for (const posix of trackedPaths) {
    const abs = path.join(dest, ...posix.split('/'));
    if (!fs.existsSync(abs)) continue;
    const content = fs.readFileSync(abs, 'utf8');
    assert.ok(
      !content.includes('\r'),
      `${posix} must have LF line endings after upgrade (found CR)`
    );
  }
}

function testUpgradeMessageCopy() {
  // Feature 3 (v0.17.1): the post-upgrade warning shown when files are
  // preserved must use the new wording that explains provenance tracking
  // correctly, and must NOT contain the stale v0.16.10 copy that misleadingly
  // implied provenance tracking was future work.
  //
  // Setup: scaffold a v0.17.0 project, customize one tracked file to force
  // a preserved-customization warning, run --upgrade --force --yes, capture
  // stdout, assert wording.
  const dest = path.join(TMP_BASE, 'test-upgrade-message-copy');
  execSync(`node ${CLI} test-upgrade-message-copy --yes`, { cwd: TMP_BASE, stdio: 'pipe' });

  // Force a preserved customization so the warning block is emitted
  const plannerPath = path.join(dest, '.claude/agents/backend-planner.md');
  fs.writeFileSync(plannerPath, fs.readFileSync(plannerPath, 'utf8') + '\n## My Edit\n');

  const output = execSync(`node ${CLI} --upgrade --force --yes`, {
    cwd: dest,
    encoding: 'utf8',
  });

  // New wording must appear
  assert.ok(
    output.includes('first v0.17.0+ upgrade from a pre-v0.17.0 project'),
    `new wording must appear in upgrade output. Got:\n${output}`
  );
  assert.ok(
    output.includes('hash-based precision'),
    `new wording (hash-based precision) must appear. Got:\n${output}`
  );
  assert.ok(
    output.includes('will only warn on files the user actually edited'),
    `new wording (only warn on user-edited files) must appear. Got:\n${output}`
  );

  // Stale v0.16.10 wording must NOT appear
  assert.ok(
    !output.includes('v0.16.10 uses conservative preserve semantics'),
    `stale v0.16.10 wording must NOT appear. Got:\n${output}`
  );
  assert.ok(
    !output.includes('Provenance tracking (v0.17.0) will eliminate these false positives'),
    `stale "future work" claim must NOT appear. Got:\n${output}`
  );
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
  run('Scenario 13: New project with Mongoose preset', testGenerateMongoose);
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
  run('Scenario 14: --init Gemini-only + backend-only', testInitGeminiBackendOnly);
  console.log('\n  Upgrade scenarios:');
  run('Scenario 15: --upgrade after --init (basic)', testUpgradeBasic);
  run('Scenario 16: --upgrade preserves custom agents + modified standards', testUpgradePreservesCustomizations);
  run('Scenario 17: New project writes .sdd-version', testNewProjectSddVersion);
  console.log('\n  CI workflow scenarios:');
  run('Scenario 21: CI workflow fullstack + PostgreSQL', testCiWorkflowFullstack);
  run('Scenario 22: CI workflow frontend-only + gitflow', testCiWorkflowFrontendOnly);
  run('Scenario 23: --init CI workflow + MongoDB', testInitCiWorkflowMongo);
  console.log('\n  Doctor scenarios:');
  run('Scenario 18: --doctor on healthy project', testDoctorHealthy);
  run('Scenario 19: --doctor detects problems', testDoctorProblems);
  run('Scenario 20: --doctor backend-only coherence', testDoctorBackendOnly);
  console.log('\n  Diff/preview scenarios:');
  run('Scenario 24: --init --diff (dry-run preview)', testInitDiff);
  run('Scenario 25: --upgrade --diff (dry-run preview)', testUpgradeDiff);
  run('Scenario 26: --diff error conditions', testDiffErrorConditions);
  console.log('\n  Eject scenarios:');
  run('Scenario 27: --eject basic (both tools)', testEjectBasic);
  run('Scenario 28: --eject preserves custom agents + commands', testEjectPreservesCustomizations);
  run('Scenario 29: --eject preserves customized CI workflow', testEjectPreservesCustomCi);
  run('Scenario 30: --eject --diff (dry-run preview)', testEjectDiff);
  run('Scenario 31: --eject error conditions', testEjectErrorConditions);
  run('Scenario 32: --eject on already-ejected project', testEjectAlreadyEjected);

  console.log('\n  PM Orchestrator + L5 scenarios:');
  run('Scenario 33: L5 autonomy generates correctly', testL5Autonomy);
  run('Scenario 34: pm-orchestrator skill exists for Claude', testPmOrchestratorClaude);
  run('Scenario 35: pm-orchestrator skill exists for Gemini', testPmOrchestratorGemini);
  run('Scenario 36: SKILL.md checkpoint table has L5 column', testSkillL5Column);
  run('Scenario 37: --upgrade preserves L5 autonomy', testUpgradePreservesL5);
  run('Scenario 38: AGENTS.md has Available Skills section', testAgentsSkillsSection);

  console.log('\n  Gemini settings format scenarios (v0.16.7):');
  run('Scenario 39: --upgrade migrates obsolete .gemini/settings.json model format', testGeminiSettingsMigration);
  run('Scenario 40: doctor check #12 does not false-fail on valid Gemini settings', testDoctorGeminiSettingsValid);

  console.log('\n  Gemini CLI functional scenarios (v0.16.8):');
  run('Scenario 41: Gemini CLI accepts scaffolded settings (functional)', testGeminiCliAcceptsScaffoldedSettings);

  console.log('\n  Gemini TOML commands scenarios (v0.16.9):');
  run('Scenario 42: doctor check #13 validates .gemini/commands/*.toml', testDoctorGeminiCommandsValid);

  console.log('\n  Smart-diff protection scenarios (v0.16.10):');
  run('Scenario 43: --upgrade preserves customized template agents + AGENTS.md', testUpgradePreservesCustomAgents);
  run('Scenario 44: --upgrade replaces pristine agents (fullstack)', testUpgradeReplacesPristineAgentsFullstack);
  run('Scenario 45: --upgrade replaces pristine agents (backend-only)', testUpgradeReplacesPristineAgentsBackendOnly);
  run('Scenario 46: doctor check #14 detects AGENTS.md empty parens', testDoctorAgentsMdEmptyParens);
  run('Scenario 47: planner templates are project-agnostic', testAgentExamplesAreProjectAgnostic);
  run('Scenario 48: --upgrade idempotently appends .sdd-backup/ to .gitignore', testUpgradeGitignoreAppend);
  run('Scenario 49: --force-template replaces customized AGENTS.md', testForceTemplateFlag);

  console.log('\n  Provenance tracking scenarios (v0.17.0):');
  run('Scenario 50: create writes .sdd-meta.json', testCreateWritesMetaJson);
  run('Scenario 51: --init writes .sdd-meta.json after stack adaptations', testInitWritesMetaJsonAfterStackAdaptations);
  run('Scenario 52: --upgrade updates .sdd-meta.json', testUpgradeUpdatesMetaJson);
  run('Scenario 53: hash path replaces pristine files cleanly (Codex P1 guard)', testUpgradeHashPathReplacesWithoutWarning);
  run('Scenario 54: hash mismatch preserves and keeps old hash (Codex M1 guard)', testUpgradeHashMismatchPreservesAndKeepsOldHash);
  run('Scenario 55: fallback path handles init-stack-adapted files (Gemini M1 guard)', testFallbackPathHandlesInitStackAdaptedFiles);
  run('Scenario 56: stack adaptations are idempotent', testStackAdaptationsIdempotent);
  run('Scenario 57: doctor check #15 validates .sdd-meta.json integrity', testDoctorMetaJsonValidity);
  run('Scenario 58: scanner overrides wizard on upgrade (design note)', testScannerOverridesWizardOnUpgrade);
  run('Scenario 58b: --init excludes pre-existing user files (Codex round 2 P1 guard)', testInitExcludesPreExistingUserFiles);

  console.log('\n  v0.17.1 scanner monorepo fix (Feature 2):');
  run('Scenario 62: scanner detects backend in monorepo workspace', testMonorepoScannerDetection);
  run('Scenario 63: adaptAgentsMd produces detected stack for monorepo', testAgentsMdMonorepoOutput);
  run('Scenario 63b: enumerateWorkspaces is deterministic + dedupes overlapping patterns', testMonorepoGlobOrdering);
  run('Scenario 63c: scanner additive invariant (single-package unchanged, monorepo richer)', testScannerAdditiveInvariant);

  console.log('\n  v0.17.1 smart-diff expansion (Feature 1):');
  run('Scenario 60: hash-based standards upgrade (preserve + no hash update)', testHashBasedStandardsUpgrade);
  run('Scenario 61: fallback compare for workflow-core files (no stored hash)', testFallbackCompareForWorkflowCore);
  run('Scenario 64: deleted standard file restored on upgrade', testDeletedStandardFileRestored);
  run('Scenario 65: D3 meta read compatibility contract (v0.17.0 sees v0.17.1 meta)', testMetaReadCompatibilityContract);
  run('Scenario 66: standards adapters are idempotent', testIdempotencyExtendedRules);
  run('Scenario 67: full upgrade idempotency (two consecutive --upgrade runs)', testFullUpgradeIdempotency);
  run('Scenario 68: normalization resilience (CRLF drift across all tracked files)', testNormalizationResilienceAllTrackedFiles);

  console.log('\n  v0.17.1 CLI message cleanup (Feature 3):');
  run('Scenario 69: --upgrade post-warning uses new wording (no stale v0.16.10 copy)', testUpgradeMessageCopy);
} finally {
  cleanup();
}

console.log(`\n  ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
