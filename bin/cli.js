#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const projectName = args.find((a) => !a.startsWith('-'));
const useDefaults = args.includes('--yes') || args.includes('-y');
const isInit = args.includes('--init');

async function main() {
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

main().catch((err) => {
  console.error('\nError:', err.message);
  process.exit(1);
});
