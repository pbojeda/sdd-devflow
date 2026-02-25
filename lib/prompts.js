'use strict';

const readline = require('readline');

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
    let done = false;

    const handler = (line) => {
      if (done) return;
      if (firstLine && line.trim() === '') {
        done = true;
        rl.removeListener('line', handler);
        resolve('');
        return;
      }
      firstLine = false;
      if (line.trim() === '') {
        done = true;
        rl.removeListener('line', handler);
        resolve(lines.join('\n'));
      } else {
        lines.push(line);
        process.stdout.write('  > ');
      }
    };

    process.stdout.write('  > ');
    rl.on('line', handler);
  });
}

function askYesNo(rl, question, defaultYes = true) {
  const hint = defaultYes ? 'Y/n' : 'y/N';
  return new Promise((resolve) => {
    rl.question(`  ${question} (${hint}): `, (answer) => {
      const a = answer.trim().toLowerCase();
      if (a === '') resolve(defaultYes);
      else resolve(a === 'y' || a === 'yes');
    });
  });
}

function askPath(rl, question, defaultValue) {
  return new Promise((resolve) => {
    const suffix = defaultValue ? ` (${defaultValue})` : '';
    rl.question(`  ${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

module.exports = { createRL, ask, askChoice, askMultiline, askYesNo, askPath };
