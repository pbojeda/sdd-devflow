#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const projectName = args.find((a) => !a.startsWith('-'));
const useDefaults = args.includes('--yes') || args.includes('-y');
const isInit = args.includes('--init');
const isUpgrade = args.includes('--upgrade');
const isForce = args.includes('--force');

async function main() {
  if (isUpgrade) {
    return runUpgrade();
  }
  if (isInit) {
    return runInit();
  }
  return runCreate();
}

async function runCreate() {
  const { runWizard, buildDefaultConfig } = require('../lib/wizard');
  const { generate } = require('../lib/generator');

  let config;

  if (useDefaults) {
    if (!projectName) {
      console.error('Error: Project name required with --yes flag.');
      console.error('Usage: create-sdd-project <project-name> --yes');
      process.exit(1);
    }
    config = buildDefaultConfig(projectName);
    console.log(`\nCreating SDD DevFlow project with defaults in ./${projectName}...\n`);
  } else {
    config = await runWizard(projectName);
    console.log(`\nCreating SDD DevFlow project in ${config.projectDir}...\n`);
  }

  // Check if destination already exists
  if (fs.existsSync(config.projectDir)) {
    const entries = fs.readdirSync(config.projectDir);
    if (entries.length > 0) {
      console.error(`Error: Directory ${config.projectDir} is not empty.`);
      console.error('Please choose a different directory or remove existing files.');
      process.exit(1);
    }
  }

  generate(config);
}

async function runInit() {
  const { scan } = require('../lib/scanner');
  const { runInitWizard, buildInitDefaultConfig } = require('../lib/init-wizard');
  const { generateInit } = require('../lib/init-generator');

  const cwd = process.cwd();

  // Validate: must be in an existing project
  if (!fs.existsSync(path.join(cwd, 'package.json'))) {
    console.error('Error: No package.json found in current directory.');
    console.error('The --init flag must be run from inside an existing project.');
    console.error('\nTo create a new project, run: create-sdd-project <project-name>');
    process.exit(1);
  }

  // Validate: SDD not already installed
  if (fs.existsSync(path.join(cwd, 'ai-specs'))) {
    console.error('Error: ai-specs/ directory already exists.');
    console.error('SDD DevFlow appears to already be installed in this project.');
    process.exit(1);
  }

  // Validate: no project name with --init
  if (projectName) {
    console.error('Error: Cannot specify a project name with --init.');
    console.error('Usage: create-sdd-project --init');
    process.exit(1);
  }

  // Scan the project
  const scanResult = scan(cwd);

  let config;
  if (useDefaults) {
    config = buildInitDefaultConfig(scanResult);
  } else {
    config = await runInitWizard(scanResult);
  }

  generateInit(config);
}

async function runUpgrade() {
  const { scan } = require('../lib/scanner');
  const { buildInitDefaultConfig } = require('../lib/init-wizard');
  const readline = require('readline');
  const {
    generateUpgrade,
    readInstalledVersion,
    getPackageVersion,
    detectAiTools,
    detectProjectType,
    readAutonomyLevel,
    collectCustomAgents,
    collectCustomCommands,
    buildSummary,
  } = require('../lib/upgrade-generator');

  const cwd = process.cwd();

  // Validate: must be in an existing project
  if (!fs.existsSync(path.join(cwd, 'package.json'))) {
    console.error('Error: No package.json found in current directory.');
    console.error('The --upgrade flag must be run from inside an existing project.');
    process.exit(1);
  }

  // Validate: SDD must be installed
  if (!fs.existsSync(path.join(cwd, 'ai-specs'))) {
    console.error('Error: ai-specs/ directory not found.');
    console.error('SDD DevFlow does not appear to be installed. Use --init first.');
    process.exit(1);
  }

  // Validate: no project name with --upgrade
  if (projectName) {
    console.error('Error: Cannot specify a project name with --upgrade.');
    console.error('Usage: create-sdd-project --upgrade');
    process.exit(1);
  }

  // Read current state
  const installedVersion = readInstalledVersion(cwd);
  const packageVersion = getPackageVersion();

  // Same version check
  if (installedVersion === packageVersion && !isForce) {
    console.log(`\nSDD DevFlow is already at version ${packageVersion}.`);
    console.log('Use --force to re-install the same version.\n');
    return;
  }

  // Scan project
  const scanResult = scan(cwd);

  // Detect current config from installed files
  const aiTools = detectAiTools(cwd);
  const projectType = detectProjectType(cwd);
  const autonomy = readAutonomyLevel(cwd);
  const customAgents = collectCustomAgents(cwd);
  const customCommands = collectCustomCommands(cwd);
  const settingsLocal = fs.existsSync(path.join(cwd, '.claude', 'settings.local.json'));

  // Build config (reuse init defaults as base)
  const config = buildInitDefaultConfig(scanResult);
  config.aiTools = aiTools;
  config.projectType = projectType;
  config.autonomyLevel = autonomy.level;
  config.autonomyName = autonomy.name;
  config.installedVersion = installedVersion;

  // Build and show summary
  const state = {
    installedVersion,
    packageVersion,
    aiTools,
    projectType,
    customAgents,
    customCommands,
    settingsLocal,
    standardsStatus: [], // computed during generation
  };

  if (!useDefaults) {
    console.log('\n' + buildSummary(state));
    console.log('');

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise((resolve) => {
      rl.question('  Proceed? (y/N) ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('\nUpgrade cancelled.\n');
      return;
    }
  }

  generateUpgrade(config);
}

main().catch((err) => {
  console.error('\nError:', err.message);
  process.exit(1);
});
