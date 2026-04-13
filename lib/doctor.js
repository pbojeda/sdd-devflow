'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {
  FRONTEND_AGENTS,
  BACKEND_AGENTS,
  TEMPLATE_AGENTS,
} = require('./config');
const {
  readInstalledVersion,
  getPackageVersion,
  detectAiTools,
  detectProjectType,
  readAutonomyLevel,
} = require('./upgrade-generator');

const PASS = 'pass';
const WARN = 'warn';
const FAIL = 'fail';

const EXPECTED_MEMORY_FILES = [
  'product-tracker.md',
  'bugs.md',
  'decisions.md',
  'key_facts.md',
];

/**
 * Run all doctor checks and return results.
 */
function runDoctor(cwd) {
  const results = [];

  // 1. SDD Installed
  results.push(checkInstalled(cwd));

  // 2. Version
  results.push(checkVersion(cwd));

  // Detect config for subsequent checks
  const aiTools = detectAiTools(cwd);
  const projectType = detectProjectType(cwd);

  // 3. AI Tool Config
  results.push(checkAiToolConfig(cwd, aiTools));

  // 4. Top-level Configs
  results.push(checkTopLevelConfigs(cwd, aiTools));

  // 5. Agents Complete
  results.push(checkAgentsComplete(cwd, aiTools, projectType));

  // 6. Project Type Coherence
  results.push(checkProjectTypeCoherence(cwd, aiTools, projectType));

  // 7. Cross-tool Consistency
  results.push(checkCrossToolConsistency(cwd, aiTools));

  // 8. Standards Present
  results.push(checkStandards(cwd, projectType));

  // 9. Hooks & Dependencies
  results.push(checkHooksAndDeps(cwd, aiTools));

  // 10. Project Memory
  results.push(checkProjectMemory(cwd));

  // 11. Autonomy/Skills Consistency
  results.push(checkAutonomySkillConsistency(cwd, aiTools));

  // 12. Gemini Settings Format
  results.push(checkGeminiSettings(cwd, aiTools));

  return results;
}

/**
 * Print doctor results and return exit code.
 */
function printResults(results) {
  console.log('\n🩺 SDD DevFlow Doctor\n');

  for (const r of results) {
    const icon = r.status === PASS ? '✓' : r.status === WARN ? '⚠' : '✗';
    console.log(`  ${icon} ${r.message}`);
    if (r.details && r.details.length > 0) {
      for (const d of r.details) {
        console.log(`    ${d}`);
      }
    }
  }

  const fails = results.filter((r) => r.status === FAIL).length;
  const warns = results.filter((r) => r.status === WARN).length;

  let overall;
  if (fails > 0) {
    overall = 'UNHEALTHY';
  } else if (warns > 0) {
    overall = 'NEEDS ATTENTION';
  } else {
    overall = 'HEALTHY';
  }

  const parts = [];
  if (fails > 0) parts.push(`${fails} error${fails > 1 ? 's' : ''}`);
  if (warns > 0) parts.push(`${warns} warning${warns > 1 ? 's' : ''}`);

  console.log(`\n  Overall: ${overall}${parts.length > 0 ? ` (${parts.join(', ')})` : ''}\n`);

  return fails > 0 ? 1 : 0;
}

// --- Individual checks ---

function checkInstalled(cwd) {
  const missing = [];
  if (!fs.existsSync(path.join(cwd, 'ai-specs'))) missing.push('ai-specs/');
  if (!fs.existsSync(path.join(cwd, '.sdd-version'))) missing.push('.sdd-version');
  if (!fs.existsSync(path.join(cwd, 'AGENTS.md'))) missing.push('AGENTS.md');

  if (missing.length > 0) {
    return {
      status: FAIL,
      message: 'SDD not installed — missing: ' + missing.join(', '),
      details: ['Run: npx create-sdd-project --init'],
    };
  }

  const version = readInstalledVersion(cwd);
  return {
    status: PASS,
    message: `SDD installed (v${version})`,
    details: [],
  };
}

function checkVersion(cwd) {
  const installed = readInstalledVersion(cwd);
  const pkg = getPackageVersion();

  if (installed === 'unknown') {
    return {
      status: WARN,
      message: 'Version unknown — .sdd-version file missing or empty',
      details: [],
    };
  }

  if (installed !== pkg) {
    return {
      status: WARN,
      message: `Version mismatch: installed ${installed}, package ${pkg}`,
      details: ['Run: npx create-sdd-project --upgrade'],
    };
  }

  return {
    status: PASS,
    message: `Version up to date (${installed})`,
    details: [],
  };
}

function checkAiToolConfig(cwd, aiTools) {
  const issues = [];

  const checkToolDir = (dir, name) => {
    const base = path.join(cwd, dir);
    if (!fs.existsSync(base)) {
      issues.push(`${dir}/ directory missing`);
      return;
    }
    if (!fs.existsSync(path.join(base, 'agents'))) issues.push(`${dir}/agents/ missing`);
    if (!fs.existsSync(path.join(base, 'skills'))) issues.push(`${dir}/skills/ missing`);
  };

  if (aiTools !== 'gemini') checkToolDir('.claude', 'Claude Code');
  if (aiTools !== 'claude') checkToolDir('.gemini', 'Gemini');

  if (issues.length > 0) {
    return {
      status: FAIL,
      message: 'AI tool config incomplete',
      details: issues,
    };
  }

  const label = aiTools === 'both' ? 'Claude Code + Gemini' : aiTools === 'claude' ? 'Claude Code' : 'Gemini';
  return {
    status: PASS,
    message: `AI tools: ${label}`,
    details: [],
  };
}

function checkTopLevelConfigs(cwd, aiTools) {
  const missing = [];

  if (aiTools !== 'gemini' && !fs.existsSync(path.join(cwd, 'CLAUDE.md'))) {
    missing.push('CLAUDE.md');
  }
  if (aiTools !== 'claude' && !fs.existsSync(path.join(cwd, 'GEMINI.md'))) {
    missing.push('GEMINI.md');
  }

  if (missing.length > 0) {
    return {
      status: FAIL,
      message: 'Missing top-level configs: ' + missing.join(', '),
      details: ['Run: npx create-sdd-project --upgrade --force'],
    };
  }

  return {
    status: PASS,
    message: 'Top-level configs present (AGENTS.md' +
      (aiTools !== 'gemini' ? ', CLAUDE.md' : '') +
      (aiTools !== 'claude' ? ', GEMINI.md' : '') + ')',
    details: [],
  };
}

function checkAgentsComplete(cwd, aiTools, projectType) {
  let expectedAgents;
  if (projectType === 'backend') {
    expectedAgents = TEMPLATE_AGENTS.filter((a) => !FRONTEND_AGENTS.includes(a));
  } else if (projectType === 'frontend') {
    expectedAgents = TEMPLATE_AGENTS.filter((a) => !BACKEND_AGENTS.includes(a));
  } else {
    expectedAgents = [...TEMPLATE_AGENTS];
  }

  const toolDir = aiTools !== 'gemini' ? '.claude' : '.gemini';
  const agentsDir = path.join(cwd, toolDir, 'agents');
  if (!fs.existsSync(agentsDir)) {
    return {
      status: FAIL,
      message: 'Agents directory missing',
      details: [],
    };
  }

  const present = fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md'));
  const missing = expectedAgents.filter((a) => !present.includes(a));
  const expectedCount = expectedAgents.length;
  const templatePresent = expectedAgents.filter((a) => present.includes(a)).length;

  if (missing.length > 0) {
    return {
      status: WARN,
      message: `Agents: ${templatePresent}/${expectedCount} template agents present — missing ${missing.length}`,
      details: missing.map((a) => `Missing: ${a}`),
    };
  }

  const customCount = present.length - templatePresent;
  const customNote = customCount > 0 ? ` + ${customCount} custom` : '';
  return {
    status: PASS,
    message: `Agents: ${templatePresent}/${expectedCount} present${customNote}`,
    details: [],
  };
}

function checkProjectTypeCoherence(cwd, aiTools, projectType) {
  const issues = [];
  const toolDir = aiTools !== 'gemini' ? '.claude' : '.gemini';
  const agentsDir = path.join(cwd, toolDir, 'agents');

  if (!fs.existsSync(agentsDir)) {
    return { status: PASS, message: 'Project type coherence: OK (no agents dir)', details: [] };
  }

  const agents = fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md'));

  if (projectType === 'backend') {
    const unexpected = agents.filter((a) => FRONTEND_AGENTS.includes(a));
    if (unexpected.length > 0) {
      issues.push(...unexpected.map((a) => `Frontend agent in backend project: ${a}`));
    }
    if (fs.existsSync(path.join(cwd, 'ai-specs', 'specs', 'frontend-standards.mdc'))) {
      issues.push('frontend-standards.mdc present in backend-only project');
    }
  } else if (projectType === 'frontend') {
    const unexpected = agents.filter((a) => BACKEND_AGENTS.includes(a));
    if (unexpected.length > 0) {
      issues.push(...unexpected.map((a) => `Backend agent in frontend project: ${a}`));
    }
    if (fs.existsSync(path.join(cwd, 'ai-specs', 'specs', 'backend-standards.mdc'))) {
      issues.push('backend-standards.mdc present in frontend-only project');
    }
  }

  if (issues.length > 0) {
    return {
      status: WARN,
      message: `Project type coherence: ${issues.length} issue${issues.length > 1 ? 's' : ''}`,
      details: issues,
    };
  }

  return {
    status: PASS,
    message: `Project type coherence: OK (${projectType})`,
    details: [],
  };
}

function checkCrossToolConsistency(cwd, aiTools) {
  if (aiTools !== 'both') {
    return {
      status: PASS,
      message: 'Cross-tool consistency: N/A (single tool)',
      details: [],
    };
  }

  const issues = [];

  // Compare agents
  const claudeAgentsDir = path.join(cwd, '.claude', 'agents');
  const geminiAgentsDir = path.join(cwd, '.gemini', 'agents');

  if (fs.existsSync(claudeAgentsDir) && fs.existsSync(geminiAgentsDir)) {
    const claudeAgents = new Set(fs.readdirSync(claudeAgentsDir).filter((f) => f.endsWith('.md')));
    const geminiAgents = new Set(fs.readdirSync(geminiAgentsDir).filter((f) => f.endsWith('.md')));

    for (const a of claudeAgents) {
      if (!geminiAgents.has(a)) issues.push(`Agent in .claude but not .gemini: ${a}`);
    }
    for (const a of geminiAgents) {
      if (!claudeAgents.has(a)) issues.push(`Agent in .gemini but not .claude: ${a}`);
    }
  }

  // Compare skills (directory names)
  const claudeSkillsDir = path.join(cwd, '.claude', 'skills');
  const geminiSkillsDir = path.join(cwd, '.gemini', 'skills');

  if (fs.existsSync(claudeSkillsDir) && fs.existsSync(geminiSkillsDir)) {
    const claudeSkills = new Set(fs.readdirSync(claudeSkillsDir).filter((f) =>
      fs.statSync(path.join(claudeSkillsDir, f)).isDirectory()
    ));
    const geminiSkills = new Set(fs.readdirSync(geminiSkillsDir).filter((f) =>
      fs.statSync(path.join(geminiSkillsDir, f)).isDirectory()
    ));

    for (const s of claudeSkills) {
      if (!geminiSkills.has(s)) issues.push(`Skill in .claude but not .gemini: ${s}`);
    }
    for (const s of geminiSkills) {
      if (!claudeSkills.has(s)) issues.push(`Skill in .gemini but not .claude: ${s}`);
    }
  }

  if (issues.length > 0) {
    return {
      status: WARN,
      message: `Cross-tool consistency: ${issues.length} mismatch${issues.length > 1 ? 'es' : ''}`,
      details: issues,
    };
  }

  return {
    status: PASS,
    message: 'Cross-tool consistency: Claude and Gemini in sync',
    details: [],
  };
}

function checkStandards(cwd, projectType) {
  const specsDir = path.join(cwd, 'ai-specs', 'specs');
  if (!fs.existsSync(specsDir)) {
    return {
      status: FAIL,
      message: 'Standards directory missing (ai-specs/specs/)',
      details: [],
    };
  }

  const expected = ['base-standards.mdc', 'documentation-standards.mdc'];
  if (projectType !== 'frontend') expected.push('backend-standards.mdc');
  if (projectType !== 'backend') expected.push('frontend-standards.mdc');

  const missing = expected.filter((f) => !fs.existsSync(path.join(specsDir, f)));

  if (missing.length > 0) {
    return {
      status: FAIL,
      message: `Standards: ${expected.length - missing.length}/${expected.length} present`,
      details: missing.map((f) => `Missing: ${f}`),
    };
  }

  return {
    status: PASS,
    message: `Standards: ${expected.length}/${expected.length} present`,
    details: [],
  };
}

function checkHooksAndDeps(cwd, aiTools) {
  if (aiTools === 'gemini') {
    return {
      status: PASS,
      message: 'Hooks: N/A (Gemini only)',
      details: [],
    };
  }

  const issues = [];

  // Check quick-scan.sh
  const hookPath = path.join(cwd, '.claude', 'hooks', 'quick-scan.sh');
  if (!fs.existsSync(hookPath)) {
    issues.push('quick-scan.sh missing');
  } else {
    try {
      const stats = fs.statSync(hookPath);
      if (!(stats.mode & 0o111)) {
        issues.push('quick-scan.sh is not executable (run: chmod +x .claude/hooks/quick-scan.sh)');
      }
    } catch { /* ignore */ }
  }

  // Check jq
  try {
    execSync('which jq', { stdio: 'pipe' });
  } catch {
    issues.push('jq not installed — quick-scan hook needs it (brew install jq / apt install jq)');
  }

  // Check settings.json
  const settingsPath = path.join(cwd, '.claude', 'settings.json');
  if (!fs.existsSync(settingsPath)) {
    issues.push('settings.json missing');
  } else {
    try {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      if (!settings.hooks) {
        issues.push('settings.json: no hooks configured');
      }
    } catch (e) {
      issues.push(`settings.json: invalid JSON — ${e.message}`);
    }
  }

  if (issues.length > 0) {
    const hasFail = issues.some((i) => i.includes('missing') || i.includes('invalid JSON'));
    return {
      status: hasFail ? FAIL : WARN,
      message: `Hooks: ${issues.length} issue${issues.length > 1 ? 's' : ''}`,
      details: issues,
    };
  }

  return {
    status: PASS,
    message: 'Hooks: quick-scan.sh executable, jq installed, settings.json valid',
    details: [],
  };
}

function checkProjectMemory(cwd) {
  const notesDir = path.join(cwd, 'docs', 'project_notes');
  if (!fs.existsSync(notesDir)) {
    return {
      status: WARN,
      message: 'Project memory: docs/project_notes/ missing',
      details: [],
    };
  }

  const missing = EXPECTED_MEMORY_FILES.filter(
    (f) => !fs.existsSync(path.join(notesDir, f))
  );

  if (missing.length > 0) {
    return {
      status: WARN,
      message: `Project memory: ${EXPECTED_MEMORY_FILES.length - missing.length}/${EXPECTED_MEMORY_FILES.length} files`,
      details: missing.map((f) => `Missing: ${f}`),
    };
  }

  return {
    status: PASS,
    message: `Project memory: ${EXPECTED_MEMORY_FILES.length}/${EXPECTED_MEMORY_FILES.length} files present`,
    details: [],
  };
}

function checkAutonomySkillConsistency(cwd, aiTools) {
  const { level } = readAutonomyLevel(cwd);

  if (level < 5) {
    return {
      status: PASS,
      message: 'Autonomy/skills consistency: OK',
      details: [],
    };
  }

  // L5 set — verify pm-orchestrator skill exists in all configured tools
  const toolDirs = [];
  if (aiTools !== 'gemini') toolDirs.push('.claude');
  if (aiTools !== 'claude') toolDirs.push('.gemini');

  const missing = [];
  for (const dir of toolDirs) {
    const pmSkillPath = path.join(cwd, dir, 'skills', 'pm-orchestrator', 'SKILL.md');
    if (!fs.existsSync(pmSkillPath)) {
      missing.push(`${dir}/skills/pm-orchestrator/SKILL.md`);
    }
  }

  if (missing.length > 0) {
    return {
      status: WARN,
      message: 'L5 (PM Autonomous) set but pm-orchestrator skill missing',
      details: [...missing.map((f) => `Missing: ${f}`), 'Run: npx create-sdd-project --upgrade'],
    };
  }

  return {
    status: PASS,
    message: 'Autonomy/skills consistency: L5 + pm-orchestrator present',
    details: [],
  };
}

function checkGeminiSettings(cwd, aiTools) {
  if (aiTools === 'claude') {
    return {
      status: PASS,
      message: 'Gemini settings: N/A (Claude only)',
      details: [],
    };
  }

  const settingsPath = path.join(cwd, '.gemini', 'settings.json');
  if (!fs.existsSync(settingsPath)) {
    return {
      status: WARN,
      message: 'Gemini settings: .gemini/settings.json missing',
      details: ['Run: npx create-sdd-project --upgrade to recreate from template'],
    };
  }

  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch (e) {
    return {
      status: FAIL,
      message: 'Gemini settings: invalid JSON',
      details: [e.message],
    };
  }

  // Detectably-broken formats only — do NOT enforce stricter rules than upstream Gemini.
  if (typeof settings.model === 'string') {
    return {
      status: FAIL,
      message: 'Gemini settings: obsolete model format (string instead of object)',
      details: [
        `Found: "model": "${settings.model}"`,
        `Expected: "model": { "name": "${settings.model}" }`,
        'Gemini CLI silently falls back to defaults when model is a string, ignoring this file.',
        'Verified against Gemini CLI 0.34.0. Run: npx create-sdd-project --upgrade',
      ],
    };
  }

  if (settings.model !== undefined && (
    settings.model === null ||
    Array.isArray(settings.model) ||
    typeof settings.model !== 'object'
  )) {
    const got = Array.isArray(settings.model)
      ? 'array'
      : settings.model === null
        ? 'null'
        : typeof settings.model;
    return {
      status: FAIL,
      message: 'Gemini settings: model field has invalid type',
      details: [
        'Expected: object with a "name" property (or absent)',
        `Got: ${got}`,
        'Run: npx create-sdd-project --upgrade',
      ],
    };
  }

  if (typeof settings.model === 'object' && !settings.model.name) {
    return {
      status: WARN,
      message: 'Gemini settings: model object is missing "name" property',
      details: [
        'Gemini accepts this but the model is unset. Add: { "name": "gemini-2.5-pro" }',
      ],
    };
  }

  return {
    status: PASS,
    message: 'Gemini settings: valid',
    details: [],
  };
}

module.exports = {
  runDoctor,
  printResults,
};
