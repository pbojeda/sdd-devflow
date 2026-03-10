'use strict';

const fs = require('fs');
const path = require('path');
const {
  AUTONOMY_LEVELS,
  FRONTEND_AGENTS,
  BACKEND_AGENTS,
  TEMPLATE_AGENTS,
} = require('./config');
const { adaptAgentContentForProjectType } = require('./adapt-agents');
const {
  adaptBaseStandards,
  adaptBackendStandards,
  adaptFrontendStandards,
  adaptAgentsMd,
  adaptCopiedFiles,
  adaptEnvExample,
  adaptCiWorkflowContent,
  updateAutonomy,
  regexReplaceInFile,
} = require('./init-generator');

/**
 * Read the installed SDD version from .sdd-version file.
 */
function readInstalledVersion(dest) {
  const versionFile = path.join(dest, '.sdd-version');
  if (fs.existsSync(versionFile)) {
    return fs.readFileSync(versionFile, 'utf8').trim();
  }
  return 'unknown';
}

/**
 * Read the current package version.
 */
function getPackageVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  return pkg.version;
}

/**
 * Detect which AI tools are installed by checking existing directories.
 */
function detectAiTools(dest) {
  const hasClaude = fs.existsSync(path.join(dest, '.claude'));
  const hasGemini = fs.existsSync(path.join(dest, '.gemini'));
  if (hasClaude && hasGemini) return 'both';
  if (hasClaude) return 'claude';
  if (hasGemini) return 'gemini';
  return 'both'; // fallback: install both
}

/**
 * Detect project type from existing agent files.
 */
function detectProjectType(dest) {
  const toolDir = fs.existsSync(path.join(dest, '.claude')) ? '.claude' : '.gemini';
  const agentsDir = path.join(dest, toolDir, 'agents');
  if (!fs.existsSync(agentsDir)) return 'fullstack';

  const agents = fs.readdirSync(agentsDir);
  const hasFrontend = agents.some((a) => FRONTEND_AGENTS.includes(a));
  const hasBackend = agents.some((a) => BACKEND_AGENTS.includes(a));

  if (hasFrontend && hasBackend) return 'fullstack';
  if (hasBackend) return 'backend';
  if (hasFrontend) return 'frontend';
  return 'fullstack';
}

/**
 * Read autonomy level from CLAUDE.md or GEMINI.md.
 */
function readAutonomyLevel(dest) {
  for (const file of ['CLAUDE.md', 'GEMINI.md']) {
    const filePath = path.join(dest, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const match = content.match(/\*\*Autonomy Level: (\d+) \(([^)]+)\)\*\*/);
      if (match) {
        return { level: parseInt(match[1], 10), name: match[2] };
      }
    }
  }
  return { level: 2, name: 'Trusted' }; // default
}

/**
 * Find custom agent files (not in template list).
 * Returns array of { name, content } objects.
 */
function collectCustomAgents(dest) {
  const customs = [];
  for (const toolDir of ['.claude', '.gemini']) {
    const agentsDir = path.join(dest, toolDir, 'agents');
    if (!fs.existsSync(agentsDir)) continue;
    const files = fs.readdirSync(agentsDir);
    for (const file of files) {
      if (!TEMPLATE_AGENTS.includes(file) && file.endsWith('.md')) {
        customs.push({
          relativePath: path.join(toolDir, 'agents', file),
          content: fs.readFileSync(path.join(agentsDir, file), 'utf8'),
        });
      }
    }
  }
  return customs;
}

/**
 * Find custom command files (not .gitkeep).
 * Returns array of { relativePath, content } objects.
 */
function collectCustomCommands(dest) {
  const customs = [];
  const commandsDir = path.join(dest, '.claude', 'commands');
  if (!fs.existsSync(commandsDir)) return customs;
  const files = fs.readdirSync(commandsDir);
  for (const file of files) {
    if (file === '.gitkeep') continue;
    customs.push({
      relativePath: path.join('.claude', 'commands', file),
      content: fs.readFileSync(path.join(commandsDir, file), 'utf8'),
    });
  }
  return customs;
}

/**
 * Check if a standard file has been modified by the user.
 * Compares existing file against freshly generated version.
 */
function isStandardModified(existingContent, freshContent) {
  return existingContent.trim() !== freshContent.trim();
}

/**
 * Build the upgrade summary for display.
 */
function buildSummary(state) {
  const lines = [];
  lines.push('🔄 SDD DevFlow Upgrade\n');
  lines.push(`  Current version:  ${state.installedVersion}`);
  lines.push(`  New version:      ${state.packageVersion}`);
  lines.push(`  AI tools:         ${state.aiTools === 'both' ? 'Claude Code + Gemini' : state.aiTools === 'claude' ? 'Claude Code' : 'Gemini'}`);
  lines.push(`  Project type:     ${state.projectType}\n`);

  lines.push('  Will replace:');
  if (state.aiTools !== 'gemini') {
    const customNote = state.customAgents.filter((a) => a.relativePath.startsWith('.claude')).length > 0
      ? ` — custom agents preserved` : '';
    lines.push(`    ✓ .claude/ (agents, skills, hooks)${customNote}`);
  }
  if (state.aiTools !== 'claude') {
    lines.push(`    ✓ .gemini/ (agents, skills, commands)`);
  }
  lines.push('    ✓ AGENTS.md, CLAUDE.md / GEMINI.md');
  lines.push('    ✓ .env.example\n');

  lines.push('  Will preserve:');
  if (state.settingsLocal) lines.push('    ⊘ .claude/settings.local.json (personal settings)');
  lines.push('    ⊘ .claude/settings.json permissions (if any)');
  for (const c of state.customCommands) lines.push(`    ⊘ ${c.relativePath} (custom command)`);
  for (const a of state.customAgents) lines.push(`    ⊘ ${a.relativePath} (custom agent)`);
  lines.push('    ⊘ docs/project_notes/* (project memory)');
  lines.push('    ⊘ docs/specs/* (your specs)');
  lines.push('    ⊘ docs/tickets/* (your tickets)');
  lines.push('    ⊘ .gitignore\n');

  if (state.standardsStatus.length > 0) {
    lines.push('  Standards:');
    for (const s of state.standardsStatus) {
      if (s.modified) {
        lines.push(`    ⚠ ${s.name} — modified by you, will be preserved`);
      } else {
        lines.push(`    ✓ ${s.name} — unchanged, will update`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Main upgrade function.
 */
function generateUpgrade(config) {
  const templateDir = path.join(__dirname, '..', 'template');
  const dest = config.projectDir;
  const scan = config.scanResult;
  const aiTools = config.aiTools;
  const projectType = config.projectType;

  console.log(`\nUpgrading SDD DevFlow in ${config.projectName}...\n`);

  // --- a) Preserve user items ---
  const autonomy = readAutonomyLevel(dest);
  const customAgents = collectCustomAgents(dest);
  const customCommands = collectCustomCommands(dest);

  // Preserve settings.local.json
  let settingsLocal = null;
  const settingsLocalPath = path.join(dest, '.claude', 'settings.local.json');
  if (fs.existsSync(settingsLocalPath)) {
    settingsLocal = fs.readFileSync(settingsLocalPath, 'utf8');
  }

  let replaced = 0;
  let preserved = 0;

  // --- b) Replace SDD-owned directories ---
  const toolDirs = [];
  if (aiTools !== 'gemini') toolDirs.push('.claude');
  if (aiTools !== 'claude') toolDirs.push('.gemini');

  for (const dir of toolDirs) {
    const base = path.join(dest, dir);
    // Delete specific SDD-owned subdirectories (NOT commands for .claude)
    for (const sub of ['agents', 'skills', 'hooks', 'styles']) {
      const subDir = path.join(base, sub);
      if (fs.existsSync(subDir)) {
        fs.rmSync(subDir, { recursive: true, force: true });
      }
    }
    // For .gemini, also remove commands (SDD-owned — Gemini TOML commands)
    if (dir === '.gemini') {
      const cmdDir = path.join(base, 'commands');
      if (fs.existsSync(cmdDir)) {
        fs.rmSync(cmdDir, { recursive: true, force: true });
      }
    }

    // Copy fresh from template
    const templateToolDir = path.join(templateDir, dir);
    if (fs.existsSync(templateToolDir)) {
      for (const sub of ['agents', 'skills', 'hooks', 'styles', 'commands']) {
        const srcSub = path.join(templateToolDir, sub);
        const destSub = path.join(base, sub);
        if (fs.existsSync(srcSub)) {
          // For .claude/commands, merge (don't overwrite user's custom commands)
          if (dir === '.claude' && sub === 'commands') {
            // Just ensure directory exists — template only has .gitkeep
            fs.mkdirSync(destSub, { recursive: true });
          } else {
            fs.cpSync(srcSub, destSub, { recursive: true });
          }
          replaced++;
        }
      }

      // Merge settings.json — update hooks from template, preserve user's permissions/additionalDirectories
      const settingsSrc = path.join(templateToolDir, 'settings.json');
      const settingsDest = path.join(base, 'settings.json');
      if (fs.existsSync(settingsSrc)) {
        const templateSettings = JSON.parse(fs.readFileSync(settingsSrc, 'utf8'));
        if (fs.existsSync(settingsDest)) {
          const userSettings = JSON.parse(fs.readFileSync(settingsDest, 'utf8'));
          // Keep user's permissions and additionalDirectories, take template's hooks
          const merged = { ...templateSettings };
          if (userSettings.permissions) merged.permissions = userSettings.permissions;
          if (userSettings.additionalDirectories) merged.additionalDirectories = userSettings.additionalDirectories;
          fs.writeFileSync(settingsDest, JSON.stringify(merged, null, 2) + '\n', 'utf8');
        } else {
          fs.copyFileSync(settingsSrc, settingsDest);
        }
      }
    }
  }
  step('Replaced agents, skills, hooks, and settings');

  // --- c) Restore preserved items ---
  for (const agent of customAgents) {
    const agentPath = path.join(dest, agent.relativePath);
    fs.mkdirSync(path.dirname(agentPath), { recursive: true });
    fs.writeFileSync(agentPath, agent.content, 'utf8');
    preserved++;
  }
  if (customAgents.length > 0) {
    step(`Restored ${customAgents.length} custom agent(s)`);
  }

  // Restore settings.local.json
  if (settingsLocal) {
    fs.writeFileSync(settingsLocalPath, settingsLocal, 'utf8');
    preserved++;
  }

  // --- d) Handle standards (smart diff) ---
  const standardsResults = [];

  // base-standards.mdc
  const baseStdPath = path.join(dest, 'ai-specs', 'specs', 'base-standards.mdc');
  if (fs.existsSync(baseStdPath)) {
    const existing = fs.readFileSync(baseStdPath, 'utf8');
    const template = fs.readFileSync(path.join(templateDir, 'ai-specs', 'specs', 'base-standards.mdc'), 'utf8');
    const fresh = adaptBaseStandards(template, scan, config);
    if (isStandardModified(existing, fresh)) {
      standardsResults.push({ name: 'ai-specs/specs/base-standards.mdc', modified: true });
      preserved++;
    } else {
      fs.writeFileSync(baseStdPath, fresh, 'utf8');
      standardsResults.push({ name: 'ai-specs/specs/base-standards.mdc', modified: false });
      replaced++;
    }
  }

  // backend-standards.mdc
  if (projectType !== 'frontend') {
    const backendStdPath = path.join(dest, 'ai-specs', 'specs', 'backend-standards.mdc');
    if (fs.existsSync(backendStdPath)) {
      const existing = fs.readFileSync(backendStdPath, 'utf8');
      const template = fs.readFileSync(path.join(templateDir, 'ai-specs', 'specs', 'backend-standards.mdc'), 'utf8');
      const fresh = adaptBackendStandards(template, scan);
      if (isStandardModified(existing, fresh)) {
        standardsResults.push({ name: 'ai-specs/specs/backend-standards.mdc', modified: true });
        preserved++;
      } else {
        fs.writeFileSync(backendStdPath, fresh, 'utf8');
        standardsResults.push({ name: 'ai-specs/specs/backend-standards.mdc', modified: false });
        replaced++;
      }
    }
  }

  // frontend-standards.mdc
  if (projectType !== 'backend') {
    const frontendStdPath = path.join(dest, 'ai-specs', 'specs', 'frontend-standards.mdc');
    if (fs.existsSync(frontendStdPath)) {
      const existing = fs.readFileSync(frontendStdPath, 'utf8');
      const template = fs.readFileSync(path.join(templateDir, 'ai-specs', 'specs', 'frontend-standards.mdc'), 'utf8');
      const fresh = adaptFrontendStandards(template, scan);
      if (isStandardModified(existing, fresh)) {
        standardsResults.push({ name: 'ai-specs/specs/frontend-standards.mdc', modified: true });
        preserved++;
      } else {
        fs.writeFileSync(frontendStdPath, fresh, 'utf8');
        standardsResults.push({ name: 'ai-specs/specs/frontend-standards.mdc', modified: false });
        replaced++;
      }
    }
  }

  // documentation-standards.mdc — always replace (unlikely customized, no adaptation)
  const docStdSrc = path.join(templateDir, 'ai-specs', 'specs', 'documentation-standards.mdc');
  const docStdDest = path.join(dest, 'ai-specs', 'specs', 'documentation-standards.mdc');
  if (fs.existsSync(docStdSrc)) {
    fs.copyFileSync(docStdSrc, docStdDest);
    replaced++;
  }

  step('Updated standards files');
  const modifiedStandards = standardsResults.filter((s) => s.modified);
  if (modifiedStandards.length > 0) {
    for (const s of modifiedStandards) {
      console.log(`    ⚠ ${s.name} — customized, preserved`);
    }
  }

  // --- e) Replace top-level configs ---
  // AGENTS.md
  const agentsMdTemplate = fs.readFileSync(path.join(templateDir, 'AGENTS.md'), 'utf8');
  const adaptedAgentsMd = adaptAgentsMd(agentsMdTemplate, config, scan);
  fs.writeFileSync(path.join(dest, 'AGENTS.md'), adaptedAgentsMd, 'utf8');
  replaced++;

  // CLAUDE.md / GEMINI.md
  if (aiTools !== 'gemini') {
    fs.copyFileSync(path.join(templateDir, 'CLAUDE.md'), path.join(dest, 'CLAUDE.md'));
    replaced++;
  }
  if (aiTools !== 'claude') {
    fs.copyFileSync(path.join(templateDir, 'GEMINI.md'), path.join(dest, 'GEMINI.md'));
    replaced++;
  }

  // Restore autonomy level
  const autonomyConfig = {
    autonomyLevel: autonomy.level,
    autonomyName: autonomy.name,
  };
  // Ensure autonomy name matches expected values
  const levelInfo = AUTONOMY_LEVELS.find((l) => l.level === autonomy.level);
  if (levelInfo) {
    autonomyConfig.autonomyName = levelInfo.name;
  }
  updateAutonomy(dest, autonomyConfig);
  step(`Restored autonomy level: L${autonomy.level} (${autonomyConfig.autonomyName})`);

  // .env.example — generate fresh, then append any custom lines from existing
  let envContent = fs.readFileSync(path.join(templateDir, '.env.example'), 'utf8');
  envContent = adaptEnvExample(envContent, config, scan);
  const envPath = path.join(dest, '.env.example');
  if (fs.existsSync(envPath)) {
    const existingEnv = fs.readFileSync(envPath, 'utf8');
    const freshLines = new Set(envContent.split('\n').map((l) => l.trim()));
    const customLines = existingEnv.split('\n').filter((line) => {
      const trimmed = line.trim();
      // Keep lines that are not in the fresh version and are not empty
      return trimmed.length > 0 && !freshLines.has(trimmed);
    });
    if (customLines.length > 0) {
      envContent = envContent.trimEnd() + '\n\n# Project-specific variables (preserved from previous version)\n' + customLines.join('\n') + '\n';
    }
  }
  fs.writeFileSync(envPath, envContent, 'utf8');
  replaced++;

  step('Replaced AGENTS.md, CLAUDE.md/GEMINI.md, .env.example');

  // --- e2) CI workflow — only add if not present (user may have customized) ---
  const ciPath = path.join(dest, '.github', 'workflows', 'ci.yml');
  if (!fs.existsSync(ciPath)) {
    fs.mkdirSync(path.join(dest, '.github', 'workflows'), { recursive: true });
    let ciContent = fs.readFileSync(path.join(templateDir, '.github', 'workflows', 'ci.yml'), 'utf8');
    ciContent = adaptCiWorkflowContent(ciContent, config, scan);
    fs.writeFileSync(ciPath, ciContent, 'utf8');
    step('Added .github/workflows/ci.yml');
    replaced++;
  }

  // --- f) Adapt for project type ---
  // Remove agents for single-stack projects
  if (projectType === 'backend') {
    for (const agent of FRONTEND_AGENTS) {
      for (const dir of toolDirs) {
        const agentPath = path.join(dest, dir, 'agents', agent);
        try { fs.unlinkSync(agentPath); } catch { /* ignore */ }
      }
    }
    // Remove frontend spec doc if it doesn't exist as user-owned
    // (don't touch docs/specs/ — user-owned)
  } else if (projectType === 'frontend') {
    for (const agent of BACKEND_AGENTS) {
      for (const dir of toolDirs) {
        const agentPath = path.join(dest, dir, 'agents', agent);
        try { fs.unlinkSync(agentPath); } catch { /* ignore */ }
      }
    }
  }

  // Adapt agent/skill content for project type
  if (projectType !== 'fullstack') {
    adaptAgentContentForProjectType(dest, config, regexReplaceInFile);
  }

  // Adapt copied files for detected stack (Zod, Prisma, DDD, etc.)
  adaptCopiedFiles(dest, scan, config);

  // Adapt documentation-standards for project type
  const docStdPath2 = path.join(dest, 'ai-specs', 'specs', 'documentation-standards.mdc');
  if (fs.existsSync(docStdPath2)) {
    if (projectType === 'backend') {
      regexReplaceInFile(docStdPath2, [
        [/\| `ai-specs\/specs\/frontend-standards\.mdc` \|[^\n]*\n/, ''],
        [/\| `docs\/specs\/ui-components\.md` \|[^\n]*\n/, ''],
        [/   - UI component changes → `docs\/specs\/ui-components\.md`\n/, ''],
      ]);
    } else if (projectType === 'frontend') {
      regexReplaceInFile(docStdPath2, [
        [/\| `ai-specs\/specs\/backend-standards\.mdc` \|[^\n]*\n/, ''],
        [/\| `docs\/specs\/api-spec\.yaml` \|[^\n]*\n/, ''],
      ]);
    }
  }

  step('Adapted files for project type and stack');

  // --- g2) Create package.json if missing (projects created with v0.8.0 bug) ---
  const pkgJsonPath = path.join(dest, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) {
    const pkg = {
      name: config.projectName,
      version: '0.0.1',
      private: true,
      scripts: {
        test: 'echo "Error: no test specified" && exit 1',
      },
    };
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    step('Created missing package.json');
    replaced++;
  }

  // --- g3) Create .gitignore if missing (projects created with v0.8.0 bug) ---
  const gitignorePath = path.join(dest, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    const gitignoreSrc = path.join(templateDir, 'gitignore');
    if (fs.existsSync(gitignoreSrc)) {
      fs.copyFileSync(gitignoreSrc, gitignorePath);
    }
    step('Created missing .gitignore');
    replaced++;
  }

  // --- g) Write version marker ---
  const newVersion = getPackageVersion();
  fs.writeFileSync(path.join(dest, '.sdd-version'), newVersion + '\n', 'utf8');
  step(`Updated .sdd-version to ${newVersion}`);

  // --- Show result ---
  const updatedCount = standardsResults.filter((s) => !s.modified).length;
  const preservedCount = modifiedStandards.length;

  console.log(`\n✅ Upgraded SDD DevFlow: ${config.installedVersion} → ${newVersion}\n`);
  console.log(`  Replaced: agents, skills, hooks, configs`);
  if (customAgents.length > 0 || customCommands.length > 0 || settingsLocal) {
    const items = [];
    if (customAgents.length > 0) items.push(`${customAgents.length} custom agent(s)`);
    if (customCommands.length > 0) items.push(`${customCommands.length} custom command(s)`);
    if (settingsLocal) items.push('personal settings');
    console.log(`  Preserved: ${items.join(', ')}`);
  }
  if (standardsResults.length > 0) {
    console.log(`  Standards: ${updatedCount} updated, ${preservedCount} preserved (customized)`);
  }

  if (modifiedStandards.length > 0) {
    console.log(`\n  ⚠ Review preserved standards for compatibility:`);
    for (const s of modifiedStandards) {
      console.log(`    - ${s.name} (customized — not updated)`);
    }
  }

  console.log(`\nNext: git add -A && git commit -m "chore: upgrade SDD DevFlow to ${newVersion}"\n`);
}

function step(msg) {
  console.log(`  ✓ ${msg}`);
}

module.exports = {
  generateUpgrade,
  readInstalledVersion,
  getPackageVersion,
  detectAiTools,
  detectProjectType,
  readAutonomyLevel,
  collectCustomAgents,
  collectCustomCommands,
  isStandardModified,
  buildSummary,
};
