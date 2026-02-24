#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { runWizard, buildDefaultConfig } = require('../lib/wizard');
const { generate } = require('../lib/generator');

const args = process.argv.slice(2);
const projectName = args.find((a) => !a.startsWith('-'));
const useDefaults = args.includes('--yes') || args.includes('-y');

async function main() {
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

main().catch((err) => {
  console.error('\nError:', err.message);
  process.exit(1);
});
