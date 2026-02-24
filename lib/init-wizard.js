'use strict';

const path = require('path');
const {
  AI_TOOLS,
  AUTONOMY_LEVELS,
  BRANCHING_STRATEGIES,
} = require('./config');
const { createRL, ask, askChoice, askMultiline, askYesNo, askPath } = require('./prompts');

/**
 * Build a human-readable summary of scan results.
 */
function formatScanSummary(scanResult) {
  const lines = [];
  lines.push(`    Project:       ${scanResult.projectName}`);
  lines.push(`    Language:      ${scanResult.language === 'typescript' ? 'TypeScript' : 'JavaScript'}`);

  if (scanResult.backend.detected) {
    const parts = [scanResult.backend.framework, scanResult.backend.orm, scanResult.backend.db].filter(Boolean);
    lines.push(`    Backend:       ${parts.join(' + ') || 'Detected (unknown stack)'}`);
  } else {
    lines.push('    Backend:       Not detected');
  }

  if (scanResult.frontend.detected) {
    const parts = [scanResult.frontend.framework, scanResult.frontend.styling, scanResult.frontend.components, scanResult.frontend.state].filter(Boolean);
    lines.push(`    Frontend:      ${parts.join(' + ') || 'Detected (unknown stack)'}`);
  } else {
    lines.push('    Frontend:      Not detected');
  }

  const patternLabels = {
    mvc: 'MVC',
    ddd: 'DDD (Domain-Driven Design)',
    'feature-based': 'Feature-based',
    'handler-based': 'Handler-based',
    flat: 'Flat structure',
    unknown: 'Unknown',
  };
  lines.push(`    Architecture:  ${patternLabels[scanResult.srcStructure.pattern] || 'Unknown'}`);

  if (scanResult.tests.framework !== 'none') {
    lines.push(`    Tests:         ${scanResult.tests.framework} (${scanResult.tests.testFiles} test files)`);
  } else {
    lines.push('    Tests:         None detected');
  }

  lines.push(`    Monorepo:      ${scanResult.isMonorepo ? 'Yes' : 'No'}`);

  if (scanResult.existingDocs.hasOpenAPI) {
    lines.push(`    OpenAPI:       Found (${scanResult.existingDocs.openAPIPath})`);
  }
  if (scanResult.existingDocs.hasPrismaSchema) {
    lines.push(`    Prisma schema: Found (${scanResult.existingDocs.prismaSchemaPath})`);
  }

  return lines.join('\n');
}

/**
 * Run the init wizard for existing projects.
 */
async function runInitWizard(scanResult) {
  const rl = createRL();

  try {
    console.log('\n🔍 Analyzing existing project...\n');
    console.log('  Detected:');
    console.log(formatScanSummary(scanResult));

    // Step 1: Confirm & Complete
    console.log('\n── Step 1: Confirm & Complete ──────────────────');

    const config = {
      projectDir: process.cwd(),
      projectName: scanResult.projectName,
      description: scanResult.description,
      businessContext: '',
      projectType: 'fullstack',
      aiTools: 'both',
      autonomyLevel: 1, // Default L1 for existing projects
      autonomyName: 'Full Control',
      branching: 'github-flow',
      backendPort: scanResult.backend.port || 3010,
      // Init-specific fields
      isInit: true,
      scanResult,
      openAPIPath: null,
      dataModelPath: null,
      dataModelFormat: null,
    };

    // Determine project type from scan
    if (scanResult.backend.detected && scanResult.frontend.detected) {
      config.projectType = 'fullstack';
    } else if (scanResult.backend.detected) {
      config.projectType = 'backend';
    } else if (scanResult.frontend.detected) {
      config.projectType = 'frontend';
    }

    config.description = await ask(rl, 'Project description', scanResult.description);

    const stackCorrect = await askYesNo(rl, 'Is the detected stack correct?', true);
    if (!stackCorrect) {
      console.log('\n  Please describe what was incorrectly detected.');
      console.log('  The standards files will include TODO markers for you to adjust.\n');

      // Ask for project type manually
      const PROJECT_TYPES = [
        { key: 'fullstack', label: 'Backend + Frontend', default: scanResult.backend.detected && scanResult.frontend.detected },
        { key: 'backend', label: 'Backend only', default: scanResult.backend.detected && !scanResult.frontend.detected },
        { key: 'frontend', label: 'Frontend only', default: !scanResult.backend.detected && scanResult.frontend.detected },
      ];
      const typeChoice = await askChoice(rl, 'Project type:', PROJECT_TYPES);
      config.projectType = typeChoice.key;
      config.stackOverridden = true;
    }

    // Step 2: Business Context
    console.log('\n── Step 2: Business Context ────────────────────');
    config.businessContext = await askMultiline(
      rl,
      'Business context — helps AI agents understand your project (optional):'
    );

    // Step 3: Existing Documentation
    console.log('\n── Step 3: Existing Documentation ──────────────');

    // OpenAPI
    if (scanResult.existingDocs.hasOpenAPI) {
      console.log(`\n  OpenAPI file detected: ${scanResult.existingDocs.openAPIPath}`);
      const useDetected = await askYesNo(rl, 'Import this as your API spec?', true);
      if (useDetected) {
        config.openAPIPath = scanResult.existingDocs.openAPIPath;
      }
    } else if (config.projectType !== 'frontend') {
      const apiDocOptions = [
        { key: 'openapi', label: 'Yes — OpenAPI/Swagger file' },
        { key: 'other', label: 'Yes — Other format (will be copied to docs/specs/)' },
        { key: 'no', label: 'No', default: true },
      ];
      const apiChoice = await askChoice(rl, 'Do you have existing API documentation?', apiDocOptions);

      if (apiChoice.key === 'openapi') {
        config.openAPIPath = await askPath(rl, 'Path to OpenAPI/Swagger file', '');
      } else if (apiChoice.key === 'other') {
        config.dataModelPath = await askPath(rl, 'Path to API documentation file', '');
        config.dataModelFormat = 'api-docs';
      }
    }

    // Data model
    if (scanResult.existingDocs.hasPrismaSchema) {
      console.log(`\n  Prisma schema detected: ${scanResult.existingDocs.prismaSchemaPath}`);
      console.log('  This will be referenced in your project facts.');
    } else if (config.projectType !== 'frontend') {
      const modelOptions = [
        { key: 'prisma', label: 'Yes — Prisma schema' },
        { key: 'other', label: 'Yes — Other format (SQL, ERD, Mermaid, etc.)' },
        { key: 'no', label: 'No', default: true },
      ];
      const modelChoice = await askChoice(rl, 'Do you have a data model definition?', modelOptions);

      if (modelChoice.key === 'prisma') {
        const prismaPath = await askPath(rl, 'Path to Prisma schema', 'prisma/schema.prisma');
        config.dataModelPath = prismaPath;
        config.dataModelFormat = 'prisma';
      } else if (modelChoice.key === 'other') {
        const modelPath = await askPath(rl, 'Path to data model file', '');
        if (modelPath) {
          config.dataModelPath = modelPath;
          config.dataModelFormat = 'other';
        }
      }
    }

    // Step 4: Configuration
    console.log('\n── Step 4: Configuration ──────────────────────');

    const aiChoice = await askChoice(rl, 'AI tools:', AI_TOOLS);
    config.aiTools = aiChoice.key;

    // Default to L1 for existing projects
    const initAutonomyLevels = AUTONOMY_LEVELS.map((l) => ({
      ...l,
      default: l.level === 1, // Override default to L1 for existing projects
    }));
    const autonomyChoice = await askChoice(rl, 'Autonomy level:', initAutonomyLevels);
    config.autonomyLevel = autonomyChoice.level;
    config.autonomyName = autonomyChoice.name;

    // Auto-detect branching or ask
    const detectedBranch = scanResult.gitBranch;
    const detectedStrategy = detectedBranch === 'develop' ? 'gitflow' : 'github-flow';
    const branchChoice = await askChoice(rl, 'Branching strategy:', BRANCHING_STRATEGIES.map((b) => ({
      ...b,
      default: b.key === detectedStrategy,
    })));
    config.branching = branchChoice.key;

    // Step 5: Summary & Confirmation
    console.log('\n── Summary ────────────────────────────────────');
    console.log(`  Adding SDD DevFlow to: ${config.projectName}`);

    if (scanResult.backend.detected) {
      const parts = [scanResult.backend.framework, scanResult.backend.orm, scanResult.backend.db].filter(Boolean);
      console.log(`  Backend:      ${parts.join(' + ')} (detected)`);
    }
    if (scanResult.frontend.detected) {
      const parts = [scanResult.frontend.framework, scanResult.frontend.styling].filter(Boolean);
      console.log(`  Frontend:     ${parts.join(' + ')} (detected)`);
    }
    console.log(`  Architecture: ${scanResult.srcStructure.pattern}`);
    console.log(`  AI tools:     ${aiChoice.label}`);
    console.log(`  Autonomy:     L${config.autonomyLevel} ${config.autonomyName}`);
    console.log(`  Branching:    ${branchChoice.label}`);

    console.log('\n  Files to be created:');
    console.log('    ai-specs/specs/          (4 files — standards adapted to your stack)');
    console.log('    docs/project_notes/      (4 files — sprint tracker, memory)');
    console.log('    docs/specs/              (API spec, UI components)');
    console.log('    docs/tickets/            (.gitkeep)');
    if (config.aiTools !== 'gemini') {
      console.log('    .claude/                 (agents, skills, commands, hooks)');
    }
    if (config.aiTools !== 'claude') {
      console.log('    .gemini/                 (agents, skills, commands)');
    }
    console.log('    AGENTS.md, CLAUDE.md, GEMINI.md');

    console.log('\n  ⚠ Will NOT modify your existing code or configuration.');
    console.log('  ⚠ Will NOT overwrite existing files.');

    const confirm = await ask(rl, '\nProceed? (Y/n)', 'Y');
    if (confirm.toLowerCase() === 'n') {
      console.log('\n  Cancelled.');
      rl.close();
      process.exit(0);
    }

    rl.close();
    return config;
  } catch (err) {
    rl.close();
    throw err;
  }
}

/**
 * Build a default config for --init --yes (non-interactive).
 */
function buildInitDefaultConfig(scanResult) {
  const config = {
    projectDir: process.cwd(),
    projectName: scanResult.projectName,
    description: scanResult.description,
    businessContext: '',
    aiTools: 'both',
    autonomyLevel: 1,
    autonomyName: 'Full Control',
    branching: 'github-flow',
    backendPort: scanResult.backend.port || 3010,
    isInit: true,
    scanResult,
    openAPIPath: scanResult.existingDocs.hasOpenAPI ? scanResult.existingDocs.openAPIPath : null,
    dataModelPath: scanResult.existingDocs.hasPrismaSchema ? scanResult.existingDocs.prismaSchemaPath : null,
    dataModelFormat: scanResult.existingDocs.hasPrismaSchema ? 'prisma' : null,
  };

  if (scanResult.backend.detected && scanResult.frontend.detected) {
    config.projectType = 'fullstack';
  } else if (scanResult.backend.detected) {
    config.projectType = 'backend';
  } else if (scanResult.frontend.detected) {
    config.projectType = 'frontend';
  } else {
    config.projectType = 'fullstack';
  }

  return config;
}

module.exports = { runInitWizard, buildInitDefaultConfig };
