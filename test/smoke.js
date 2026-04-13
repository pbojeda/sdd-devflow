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
} finally {
  cleanup();
}

console.log(`\n  ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
