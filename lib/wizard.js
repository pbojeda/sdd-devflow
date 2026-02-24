'use strict';

const readline = require('readline');
const path = require('path');
const {
  DEFAULTS,
  PROJECT_TYPES,
  BACKEND_STACKS,
  FRONTEND_STACKS,
  AI_TOOLS,
  AUTONOMY_LEVELS,
  BRANCHING_STRATEGIES,
} = require('./config');

function createRL() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function ask(rl, question, defaultValue) {
  const suffix = defaultValue ? ` (${defaultValue})` : '';
  return new Promise((resolve) => {
    rl.question(`  ${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

function askChoice(rl, question, options) {
  return new Promise((resolve) => {
    console.log(`\n  ${question}`);
    options.forEach((opt, i) => {
      const marker = opt.default ? ' (default)' : '';
      const desc = opt.desc ? ` — ${opt.desc}` : '';
      console.log(`    ${i + 1}. ${opt.label || opt.name}${marker}${desc}`);
    });

    const defaultIndex = options.findIndex((o) => o.default);
    const defaultNum = defaultIndex >= 0 ? String(defaultIndex + 1) : '1';

    rl.question(`  Choice [${defaultNum}]: `, (answer) => {
      const num = parseInt(answer.trim(), 10);
      if (num >= 1 && num <= options.length) {
        resolve(options[num - 1]);
      } else {
        resolve(options[defaultIndex >= 0 ? defaultIndex : 0]);
      }
    });
  });
}

function askMultiline(rl, question) {
  return new Promise((resolve) => {
    console.log(`\n  ${question}`);
    console.log('  (Enter text below. Empty line to finish, or press Enter to skip)');
    const lines = [];
    let firstLine = true;

    const onLine = (line) => {
      if (firstLine && line.trim() === '') {
        rl.removeListener('line', onLine);
        resolve('');
        return;
      }
      firstLine = false;
      if (line.trim() === '') {
        rl.removeListener('line', onLine);
        resolve(lines.join('\n'));
      } else {
        lines.push(line);
      }
    };

    process.stdout.write('  > ');
    rl.on('line', (line) => {
      if (lines.length > 0 || line.trim() !== '') {
        process.stdout.write('  > ');
      }
      onLine(line);
    });
  });
}

async function runWizard(initialName) {
  const rl = createRL();
  const config = { ...DEFAULTS };

  try {
    console.log('\n🚀 Create SDD DevFlow Project\n');
    console.log('  Spec-Driven Development workflow for AI-assisted coding.\n');

    // Step 1: Project basics
    console.log('── Step 1: Project Basics ──────────────────────');
    config.projectName = await ask(rl, 'Project name', initialName || '');
    if (!config.projectName) {
      console.log('\n  Error: Project name is required.');
      rl.close();
      process.exit(1);
    }

    const defaultDir = `./${config.projectName}`;
    config.projectDir = await ask(rl, 'Project directory', defaultDir);
    config.projectDir = path.resolve(config.projectDir);

    config.description = await ask(rl, 'Brief project description', '');

    // Step 2: Business context
    console.log('\n── Step 2: Business Context ────────────────────');
    config.businessContext = await askMultiline(
      rl,
      'Business context — helps AI agents understand your project (optional):'
    );

    // Step 3: Project type + Tech stack
    console.log('\n── Step 3: Project Type & Tech Stack ──────────');
    const projectType = await askChoice(rl, 'Project type:', PROJECT_TYPES);
    config.projectType = projectType.key;

    // Backend stack (if applicable)
    if (config.projectType !== 'frontend') {
      const backendChoice = await askChoice(rl, 'Backend stack:', BACKEND_STACKS);
      config.backendStack = backendChoice.key;
      config.backendPreset = backendChoice;

      if (backendChoice.key === 'custom') {
        config.customBackend = await ask(rl, 'Describe your backend stack', '');
      }
    }

    // Frontend stack (if applicable)
    if (config.projectType !== 'backend') {
      const frontendChoice = await askChoice(rl, 'Frontend stack:', FRONTEND_STACKS);
      config.frontendStack = frontendChoice.key;
      config.frontendPreset = frontendChoice;

      if (frontendChoice.key === 'custom') {
        config.customFrontend = await ask(rl, 'Describe your frontend stack', '');
      }
    }

    // Show standards update note if non-default stack
    const needsBackendUpdate = config.backendPreset && config.backendPreset.needsStandardsUpdate;
    const needsFrontendUpdate = config.frontendPreset && config.frontendPreset.needsStandardsUpdate;
    if (needsBackendUpdate || needsFrontendUpdate) {
      console.log('\n  📝 Note: Remember to update the following files with your stack details:');
      if (needsBackendUpdate) {
        console.log('     - ai-specs/specs/backend-standards.mdc  (backend patterns & conventions)');
      }
      if (needsFrontendUpdate) {
        console.log('     - ai-specs/specs/frontend-standards.mdc (frontend patterns & conventions)');
      }
    }

    // Step 4: Configuration
    console.log('\n── Step 4: Configuration ──────────────────────');

    const aiChoice = await askChoice(rl, 'AI tools:', AI_TOOLS);
    config.aiTools = aiChoice.key;

    const autonomyChoice = await askChoice(rl, 'Autonomy level:', AUTONOMY_LEVELS);
    config.autonomyLevel = autonomyChoice.level;
    config.autonomyName = autonomyChoice.name;

    const branchChoice = await askChoice(rl, 'Branching strategy:', BRANCHING_STRATEGIES);
    config.branching = branchChoice.key;

    // Port configuration
    if (config.projectType !== 'frontend') {
      const portStr = await ask(rl, 'Backend port', String(DEFAULTS.backendPort));
      config.backendPort = parseInt(portStr, 10) || DEFAULTS.backendPort;
    }

    // Step 5: Confirmation
    console.log('\n── Summary ────────────────────────────────────');
    console.log(`  Project:    ${config.projectName}`);
    console.log(`  Directory:  ${config.projectDir}`);
    if (config.description) {
      console.log(`  Description: ${config.description}`);
    }
    console.log(`  Type:       ${projectType.label}`);
    if (config.projectType !== 'frontend') {
      const bLabel = BACKEND_STACKS.find((s) => s.key === config.backendStack);
      console.log(`  Backend:    ${bLabel ? bLabel.label : config.customBackend}`);
    }
    if (config.projectType !== 'backend') {
      const fLabel = FRONTEND_STACKS.find((s) => s.key === config.frontendStack);
      console.log(`  Frontend:   ${fLabel ? fLabel.label : config.customFrontend}`);
    }
    console.log(`  AI tools:   ${aiChoice.label}`);
    console.log(`  Autonomy:   L${config.autonomyLevel} ${config.autonomyName}`);
    console.log(`  Branching:  ${branchChoice.label}`);
    if (config.projectType !== 'frontend') {
      console.log(`  Port:       ${config.backendPort}`);
    }

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

function buildDefaultConfig(projectName) {
  return {
    ...DEFAULTS,
    projectName,
    projectDir: path.resolve(`./${projectName}`),
    backendPreset: BACKEND_STACKS[0],
    frontendPreset: FRONTEND_STACKS[0],
    autonomyName: 'Trusted',
  };
}

module.exports = { runWizard, buildDefaultConfig };
