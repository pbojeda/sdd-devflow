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

  // 13. Gemini TOML Commands Format
  results.push(checkGeminiCommands(cwd, aiTools));

  // 14. AGENTS.md Standards References (v0.16.10)
  results.push(checkAgentsMdStandardsRefs(cwd));

  // 15. .sdd-meta.json structural integrity (v0.17.0)
  results.push(checkMetaJson(cwd, aiTools, projectType));

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

/**
 * Validate a .gemini/commands/*.toml file using a strict subset of TOML
 * grammar sufficient for our narrow use case.
 *
 * Scope: the templates we ship only use two top-level keys (`description`,
 * `prompt`) with string values — standard quoted (`"..."`), single-quoted
 * literal (`'...'`), or triple-quoted multiline (`"""..."""` / `'''...'''`).
 * This validator enforces that subset strictly:
 *
 * - Each non-blank, non-comment line must be either a top-level assignment
 *   `key = <string-literal>` or the start of a multiline string
 * - Top-level keys must match `[A-Za-z][A-Za-z0-9_-]*` (bare keys only —
 *   quoted keys like `"prompt" = "x"` are flagged as invalid; our templates
 *   never use them)
 * - Duplicate top-level keys are rejected (TOML spec forbids them)
 * - Strings must be properly closed on the same line (except triple-quoted,
 *   which can span lines)
 * - Trailing content after a closed string is rejected (only a `#` comment
 *   is allowed after the value)
 * - Values that are not string literals (numbers, booleans, arrays, etc.)
 *   are flagged as non-string
 * - Assignments inside `[table]` or `[[array-table]]` sections are not
 *   considered top-level and the scan stops there (our templates don't use
 *   tables)
 *
 * This validator is intentionally stricter than full TOML and looser in a
 * few edge cases (e.g., escape sequences inside basic strings are accepted
 * as `\\.`). The goal is to catch files that Gemini CLI's FileCommandLoader
 * would silently skip — not to be a general-purpose TOML parser. If our
 * templates ever need richer TOML features, upgrade to `@iarna/toml` as
 * a runtime dependency at that point.
 *
 * Returns:
 *   { ok: true, keys: { prompt?: 'string' | 'non-string', description?: 'string' | 'non-string' } }
 *   { ok: false, error: '<message>', line: N }
 */
function validateTomlCommandFile(content) {
  const keysSeen = {};
  const lines = content.split(/\r?\n|\r/);
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // Blank line or full-line comment
    if (trimmed === '' || trimmed.startsWith('#')) {
      i++;
      continue;
    }

    // Table / array-table — end of top-level scope, stop scanning
    if (/^\[\[?/.test(trimmed)) {
      break;
    }

    // Top-level assignment: bare key = value
    const keyMatch = trimmed.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*=\s*(.*)$/);
    if (!keyMatch) {
      return {
        ok: false,
        error: `line ${i + 1}: not a valid top-level assignment: ${trimmed.slice(0, 60)}`,
      };
    }

    const key = keyMatch[1];
    const value = keyMatch[2];

    if (keysSeen[key] !== undefined) {
      return { ok: false, error: `line ${i + 1}: duplicate top-level key '${key}'` };
    }

    // Multi-line basic string: """..."""
    if (value.startsWith('"""')) {
      const after = value.slice(3);
      const closeIdx = after.indexOf('"""');
      if (closeIdx !== -1) {
        // Closed on same line — check no trailing content except optional comment
        const trailing = after.slice(closeIdx + 3).trim();
        if (trailing !== '' && !trailing.startsWith('#')) {
          return {
            ok: false,
            error: `line ${i + 1}: trailing content after """ close: ${trailing.slice(0, 40)}`,
          };
        }
        keysSeen[key] = 'string';
        i++;
        continue;
      }
      // Scan forward for closing """
      let j = i + 1;
      let closed = false;
      while (j < lines.length) {
        const idx2 = lines[j].indexOf('"""');
        if (idx2 !== -1) {
          const trailing2 = lines[j].slice(idx2 + 3).trim();
          if (trailing2 !== '' && !trailing2.startsWith('#')) {
            return {
              ok: false,
              error: `line ${j + 1}: trailing content after """ close: ${trailing2.slice(0, 40)}`,
            };
          }
          closed = true;
          i = j + 1;
          break;
        }
        j++;
      }
      if (!closed) {
        return {
          ok: false,
          error: `line ${i + 1}: unterminated triple-quoted basic string (""" never closed)`,
        };
      }
      keysSeen[key] = 'string';
      continue;
    }

    // Multi-line literal string: '''...'''
    if (value.startsWith("'''")) {
      const after = value.slice(3);
      const closeIdx = after.indexOf("'''");
      if (closeIdx !== -1) {
        const trailing = after.slice(closeIdx + 3).trim();
        if (trailing !== '' && !trailing.startsWith('#')) {
          return {
            ok: false,
            error: `line ${i + 1}: trailing content after ''' close: ${trailing.slice(0, 40)}`,
          };
        }
        keysSeen[key] = 'string';
        i++;
        continue;
      }
      let j = i + 1;
      let closed = false;
      while (j < lines.length) {
        const idx2 = lines[j].indexOf("'''");
        if (idx2 !== -1) {
          const trailing2 = lines[j].slice(idx2 + 3).trim();
          if (trailing2 !== '' && !trailing2.startsWith('#')) {
            return {
              ok: false,
              error: `line ${j + 1}: trailing content after ''' close: ${trailing2.slice(0, 40)}`,
            };
          }
          closed = true;
          i = j + 1;
          break;
        }
        j++;
      }
      if (!closed) {
        return {
          ok: false,
          error: `line ${i + 1}: unterminated triple-quoted literal string (''' never closed)`,
        };
      }
      keysSeen[key] = 'string';
      continue;
    }

    // Basic string: "..." with standard escapes; must close on same line
    // and allow only a trailing comment after the closing quote.
    if (value.startsWith('"')) {
      const basicMatch = value.match(/^"((?:[^"\\]|\\.)*)"(?:\s*(?:#.*)?)?$/);
      if (!basicMatch) {
        return {
          ok: false,
          error: `line ${i + 1}: invalid basic string value (unterminated or trailing content): ${value.slice(0, 60)}`,
        };
      }
      keysSeen[key] = 'string';
      i++;
      continue;
    }

    // Literal string: '...' with no escapes; must close on same line
    if (value.startsWith("'")) {
      const litMatch = value.match(/^'([^']*)'(?:\s*(?:#.*)?)?$/);
      if (!litMatch) {
        return {
          ok: false,
          error: `line ${i + 1}: invalid literal string value (unterminated or trailing content): ${value.slice(0, 60)}`,
        };
      }
      keysSeen[key] = 'string';
      i++;
      continue;
    }

    // Any other value is not a string literal (int, bool, array, table, etc.)
    keysSeen[key] = 'non-string';
    i++;
  }

  return { ok: true, keys: keysSeen };
}

function checkGeminiCommands(cwd, aiTools) {
  if (aiTools === 'claude') {
    return {
      status: PASS,
      message: 'Gemini commands: N/A (Claude only)',
      details: [],
    };
  }

  const commandsDir = path.join(cwd, '.gemini', 'commands');
  if (!fs.existsSync(commandsDir)) {
    return {
      status: WARN,
      message: 'Gemini commands: .gemini/commands/ missing',
      details: ['Run: npx create-sdd-project --upgrade to recreate template commands'],
    };
  }

  // readdirSync with withFileTypes so we can filter symlinks before reading.
  // Symlinks in .gemini/commands/ would make doctor read arbitrary files on
  // the user's machine — low severity in a local CLI, but worth guarding.
  const entries = fs
    .readdirSync(commandsDir, { withFileTypes: true })
    .filter((e) => e.name.endsWith('.toml'))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (entries.length === 0) {
    return {
      status: WARN,
      message: 'Gemini commands: no .toml files in .gemini/commands/',
      details: ['Gemini CLI slash commands require .toml files. Run: npx create-sdd-project --upgrade'],
    };
  }

  const issues = [];
  let validCount = 0;

  for (const entry of entries) {
    const file = entry.name;
    const filePath = path.join(commandsDir, file);

    // Reject symlinks (Dirent can lie about isFile() when followed; use lstat).
    let lst;
    try {
      lst = fs.lstatSync(filePath);
    } catch (e) {
      issues.push(`${file}: cannot lstat (${e.code || e.message})`);
      continue;
    }
    if (lst.isSymbolicLink()) {
      issues.push(`${file}: is a symlink — refusing to follow (security). Delete and run --upgrade to restore template`);
      continue;
    }
    if (!lst.isFile()) {
      issues.push(`${file}: not a regular file`);
      continue;
    }

    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch (e) {
      issues.push(`${file}: cannot read (${e.code || e.message})`);
      continue;
    }

    if (content.trim() === '') {
      issues.push(`${file}: empty file (Gemini CLI will skip this command silently)`);
      continue;
    }

    // Validate using the strict grammar subset for our templates.
    // Gemini CLI's FileCommandLoader schema is:
    //   z.object({ prompt: z.string(), description: z.string().optional() })
    const result = validateTomlCommandFile(content);

    if (!result.ok) {
      issues.push(`${file}: ${result.error}`);
      continue;
    }

    const promptKind = result.keys.prompt;
    const descriptionKind = result.keys.description;

    if (promptKind === undefined) {
      issues.push(
        `${file}: missing required field 'prompt' (Gemini CLI will silently skip this command)`
      );
      continue;
    }
    if (promptKind !== 'string') {
      issues.push(
        `${file}: 'prompt' field must be a string (Gemini CLI requires z.string())`
      );
      continue;
    }
    if (descriptionKind !== undefined && descriptionKind !== 'string') {
      issues.push(
        `${file}: 'description' field is present but is not a string`
      );
      continue;
    }

    validCount++;
  }

  if (issues.length > 0) {
    return {
      status: FAIL,
      message: `Gemini commands: ${issues.length} invalid TOML file${issues.length > 1 ? 's' : ''}`,
      details: [
        ...issues,
        'Gemini CLI silently skips invalid TOML commands — they will not appear as slash commands in the UI.',
        'Run: npx create-sdd-project --upgrade to restore template commands.',
      ],
    };
  }

  return {
    status: PASS,
    message: `Gemini commands: ${validCount}/${entries.length} valid`,
    details: [],
  };
}

/**
 * Check #14 (v0.16.10): detect adapter-failure artifacts in AGENTS.md.
 *
 * The specific broken state seen in foodXPlorer after the v0.16.9 upgrade
 * was `Standards References` containing `"Backend patterns ()"` — empty
 * parens left behind after the template substitution failed. This check
 * looks for that pattern plus any unsubstituted placeholders of the shape
 * `[Something]` that don't match a known-good markdown link.
 *
 * Severity: WARN — an empty-parens AGENTS.md doesn't break the project,
 * it just leaves the agents without full stack context.
 */
function checkAgentsMdStandardsRefs(cwd) {
  const agentsMdPath = path.join(cwd, 'AGENTS.md');
  if (!fs.existsSync(agentsMdPath)) {
    return {
      status: WARN,
      message: 'AGENTS.md: missing',
      details: ['Run: npx create-sdd-project --upgrade to recreate'],
    };
  }

  const content = fs.readFileSync(agentsMdPath, 'utf8');
  const issues = [];

  // Detect adapter failure: "Backend patterns ()" or "Frontend patterns ()"
  const emptyParensMatch = content.match(/(?:Backend|Frontend) patterns \(\s*\)/g);
  if (emptyParensMatch) {
    issues.push(
      `Adapter failure: ${emptyParensMatch.join(', ')} (empty parens after template substitution)`
    );
  }

  // v0.17.1 observability (Gemini Q10): warn on sparse Backend/Frontend patterns
  // — exactly 1 entry — suggesting scanner detection missed framework or ORM.
  // Permissive: non-failing, informational. Two+ entries are assumed OK because
  // projects legitimately vary (ORM-only backends, component-less frontends).
  const sparseRe = /(Backend|Frontend) patterns \(([^)]+)\)/g;
  let sparseMatch;
  while ((sparseMatch = sparseRe.exec(content)) !== null) {
    const rawEntries = sparseMatch[2]
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (rawEntries.length === 1) {
      issues.push(
        `${sparseMatch[1]} patterns has only 1 entry (${rawEntries[0]}) — scanner detection may be incomplete; run \`npx create-sdd-project --upgrade\` after installing your stack deps to re-detect`
      );
    }
  }

  // Detect unsubstituted placeholders that look like "[Framework, runtime, version]".
  // Template placeholders are distinctive: (a) they contain at least one
  // comma-separated descriptor or the literal word "your", (b) they are NOT
  // the target of a markdown link (no `(` or `:` immediately after the `]`).
  //
  // Gemini cross-model review (v0.16.10) caught the original broad regex
  // /\[[A-Z][^\]]{5,60}\]/g catching legitimate user-added markdown links
  // like `[Architecture Doc](./docs/arch.md)`. AGENTS.md is explicitly meant
  // to be user-customized, so the doctor must not warn on every link.
  //
  // Match only placeholder-shaped strings that are followed by whitespace,
  // end-of-line, or punctuation (not `(` for a link target or `:` for a
  // footnote reference), AND contain either a comma or the word "your" or
  // "example" to distinguish them from section headers.
  const PLACEHOLDER_RE = /\[[A-Z][^\]]{3,60}[,\s](?:[^\]]{0,60})\](?!\(|:)/g;
  const HINT_WORDS_RE = /\b(?:your|example|framework|runtime|version|name|path)\b/i;
  const candidates = content.match(PLACEHOLDER_RE) || [];
  const unsubstituted = candidates.filter((c) => HINT_WORDS_RE.test(c));
  if (unsubstituted.length > 0) {
    issues.push(`Unsubstituted placeholders: ${unsubstituted.slice(0, 3).join(', ')}`);
  }

  if (issues.length > 0) {
    return {
      status: WARN,
      message: `AGENTS.md: ${issues.length} issue${issues.length > 1 ? 's' : ''}`,
      details: [...issues, 'Run: npx create-sdd-project --upgrade --force to re-adapt'],
    };
  }

  return {
    status: PASS,
    message: 'AGENTS.md: standards references valid',
    details: [],
  };
}

/**
 * Check #15 (v0.17.0): .sdd-meta.json structural integrity.
 *
 * v0.17.0 introduces content-addressable hashing via .sdd-meta.json to
 * track "the last time the tool wrote this file". The upgrade path uses
 * the hashes to answer "did the user edit since last tool-write" without
 * comparing against the new template's adapted output (which would drift
 * across versions — the Codex P1 from v0.16.10 cross-model review).
 *
 * This doctor check validates the METADATA STRUCTURE ONLY:
 *   - Valid JSON
 *   - schemaVersion ≤ current
 *   - hashes is a sensible object shape
 *   - Every hash value matches sha256:<64 hex>
 *   - Every key that's NOT in the expected set is flagged as orphan
 *
 * It does NOT validate hashes against current on-disk content (Codex M3
 * from plan v1.0 review). Hash mismatches are the EXPECTED result of
 * legitimate user customization; reporting them here would generate
 * permanent noise and bury real integrity issues.
 *
 * Severity:
 *   - File absent → PASS with informational message (pre-v0.17.0 project)
 *   - Present and valid → PASS
 *   - Parse/shape errors → WARN (not FAIL — upgrade still falls back safely)
 *   - Orphan entries → WARN (non-fatal, upgrade prunes them next run)
 */
function checkMetaJson(cwd, aiTools, projectType) {
  const metaPath = path.join(cwd, '.sdd-meta.json');
  if (!fs.existsSync(metaPath)) {
    return {
      status: PASS,
      message: 'Provenance metadata: not present (pre-v0.17.0 project or fresh install)',
      details: [],
    };
  }

  let raw;
  try {
    raw = fs.readFileSync(metaPath, 'utf8');
  } catch (e) {
    return {
      status: WARN,
      message: '.sdd-meta.json: unreadable',
      details: [e.code || e.message],
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return {
      status: WARN,
      message: '.sdd-meta.json: invalid JSON',
      details: [e.message, 'Next upgrade will regenerate it via the fallback path.'],
    };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      status: WARN,
      message: '.sdd-meta.json: root is not an object',
      details: ['Next upgrade will regenerate it.'],
    };
  }

  // Validate schemaVersion. Absent = v1 (forward-compat). Newer than
  // supported = still WARN (fallback path handles it).
  const {
    CURRENT_SCHEMA_VERSION,
    expectedSmartDiffTrackedPaths,
  } = require('./meta');
  const schemaVersion = parsed.schemaVersion ?? 1;
  if (typeof schemaVersion !== 'number' || schemaVersion < 1) {
    return {
      status: WARN,
      message: `.sdd-meta.json: invalid schemaVersion ${schemaVersion}`,
      details: [],
    };
  }
  if (schemaVersion > CURRENT_SCHEMA_VERSION) {
    return {
      status: WARN,
      message: `.sdd-meta.json: schemaVersion ${schemaVersion} newer than supported ${CURRENT_SCHEMA_VERSION}`,
      details: ['Upgrade the sdd-devflow CLI to the latest version.'],
    };
  }

  const hashes = parsed.hashes;
  if (typeof hashes !== 'object' || hashes === null || Array.isArray(hashes)) {
    return {
      status: WARN,
      message: '.sdd-meta.json: hashes field is not an object',
      details: ['Next upgrade will regenerate it.'],
    };
  }

  // Validate each entry's shape.
  const HASH_RE = /^sha256:[0-9a-f]{64}$/;
  const issues = [];
  for (const [k, v] of Object.entries(hashes)) {
    if (typeof k !== 'string') {
      issues.push(`invalid key: ${typeof k}`);
      continue;
    }
    // Reject absolute paths and `..` traversal.
    if (k.startsWith('/') || k.includes('..')) {
      issues.push(`suspicious key: ${k}`);
      continue;
    }
    if (typeof v !== 'string' || !HASH_RE.test(v)) {
      issues.push(`invalid hash for ${k}`);
    }
  }

  if (issues.length > 0) {
    return {
      status: WARN,
      message: `.sdd-meta.json: ${issues.length} shape issue${issues.length > 1 ? 's' : ''}`,
      details: [...issues.slice(0, 5), 'Next upgrade will regenerate affected entries.'],
    };
  }

  // Detect orphan entries (keys not expected for the current tool/type).
  const expected = expectedSmartDiffTrackedPaths(aiTools, projectType);
  const orphans = Object.keys(hashes).filter((k) => !expected.has(k));
  if (orphans.length > 0) {
    return {
      status: WARN,
      message: `.sdd-meta.json: ${orphans.length} orphan entr${orphans.length > 1 ? 'ies' : 'y'}`,
      details: [
        ...orphans.slice(0, 5).map((o) => `Orphan: ${o}`),
        'Non-fatal — next upgrade will prune these automatically.',
      ],
    };
  }

  return {
    status: PASS,
    message: `Provenance metadata: valid (${Object.keys(hashes).length} tracked files)`,
    details: [],
  };
}

module.exports = {
  runDoctor,
  printResults,
};
