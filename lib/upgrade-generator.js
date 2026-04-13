'use strict';

const fs = require('fs');
const path = require('path');
const {
  AUTONOMY_LEVELS,
  FRONTEND_AGENTS,
  BACKEND_AGENTS,
  TEMPLATE_AGENTS,
  TEMPLATE_COMMANDS,
} = require('./config');
const {
  adaptAgentContentForProjectType,
  adaptAgentContentString,
} = require('./adapt-agents');
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
// v0.17.0: hash-based smart-diff + shared stack adaptations
const {
  readMeta,
  writeMeta,
  computeHash,
  hashFileOnDisk,
  toPosix,
  pruneExpectedAbsent,
  expectedSmartDiffTrackedPaths,
  normalizeForCompare: metaNormalizeForCompare,
} = require('./meta');
const {
  applyStackAdaptations,
  applyStackAdaptationsToContent,
} = require('./stack-adaptations');

// --- v0.16.10: backup-before-replace helpers ---
//
// Nuclear safety net for smart-diff protection (Changes #1 + #2 + #3).
// Ensures no user file is overwritten during upgrade without a recoverable
// backup. Idempotent per run — each path is backed up at most once even if
// touched by multiple stages of the upgrade pipeline.

const backedUpPaths = new Set(); // reset at the start of every generateUpgrade call

/**
 * Build a collision-safe backup directory name.
 *
 * Format: YYYYMMDD-HHMMSS-NNNN where NNNN is the last 4 digits of the
 * current epoch millisecond count. Two upgrades within the same second get
 * distinct directory names because the millisecond suffix differs.
 *
 * Examples:
 *   20260413-150000-1234
 *   20260413-150000-5678 (one millisecond later)
 */
function buildBackupTimestamp() {
  const now = new Date();
  const iso = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+$/, '')
    .replace('T', '-');
  const msSuffix = Date.now().toString().slice(-4);
  return `${iso}-${msSuffix}`;
}

/**
 * Normalize text for smart-diff comparison.
 *
 * v0.17.0: delegates to `lib/meta.js` which only strips CR/CRLF (Windows
 * git core.autocrlf compatibility). Trailing whitespace is NO LONGER
 * stripped — that would destroy markdown hard-breaks (two trailing
 * spaces = <br>) and silently wipe legitimate customizations (Gemini M2
 * fix from plan v1.0 review). A local re-export here keeps the old
 * symbol available for any pre-v0.17.0 code paths that still call it.
 */
const normalizeForCompare = metaNormalizeForCompare;

/**
 * Copy a user file to .sdd-backup/<timestamp>/<relativePath> before it is
 * modified or replaced. Returns the absolute backup path, or null if the
 * source doesn't exist, was already backed up this run, or the copy failed
 * (non-fatal — warning printed).
 *
 * Contract:
 *   - Idempotent per run: calling twice for the same path is a no-op
 *   - Non-fatal on failure: upgrade continues even if backup can't be written
 *   - Does NOT mkdir the backup parent directory until we know the source
 *     file exists, to avoid leaving empty directories on failure
 */
function backupBeforeReplace(dest, relativePath, backupTimestamp) {
  const key = `${backupTimestamp}::${relativePath}`;
  if (backedUpPaths.has(key)) return null;

  const sourcePath = path.join(dest, relativePath);
  if (!fs.existsSync(sourcePath)) return null;

  const backupRoot = path.join(dest, '.sdd-backup', backupTimestamp);
  const backupPath = path.join(backupRoot, relativePath);
  try {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(sourcePath, backupPath);
    backedUpPaths.add(key);
    return backupPath;
  } catch (e) {
    console.warn(`    ⚠ Backup of ${relativePath} failed: ${e.code || e.message}`);
    return null;
  }
}

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
 * Find custom command files (not .gitkeep, not template-owned).
 * Returns array of { relativePath, content } objects.
 */
function collectCustomCommands(dest) {
  const customs = [];
  const commandsDir = path.join(dest, '.claude', 'commands');
  if (!fs.existsSync(commandsDir)) return customs;
  const files = fs.readdirSync(commandsDir);
  for (const file of files) {
    if (file === '.gitkeep') continue;
    if (TEMPLATE_COMMANDS.includes(file)) continue;
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

  // v0.16.10: Reset per-run backup tracking and build a collision-safe timestamp.
  // Every file replaced by this upgrade will be backed up to .sdd-backup/<ts>/
  // before modification, so the user can always recover.
  backedUpPaths.clear();
  const backupTimestamp = buildBackupTimestamp();

  // Track which template agents and AGENTS.md were preserved due to customization,
  // so we can surface the list in the upgrade result summary.
  const modifiedAgentsResults = [];

  // v0.17.0: provenance tracking. Read existing hashes at the start; track
  // new/updated hashes as we go. Preserved files leave their entry untouched
  // (Codex M1 invariant: only write canonical hashes for tool-written content).
  // `filesToAdapt` collects POSIX paths of files that were replaced or newly
  // written in this run; applyStackAdaptations will be called with this
  // allowlist after the write loop so only these files get re-adapted.
  const meta = readMeta(dest);
  const newHashes = { ...(meta?.hashes ?? {}) };
  const filesToAdapt = new Set();

  console.log(`\nUpgrading SDD DevFlow in ${config.projectName}...\n`);
  console.log(`  Backup directory: .sdd-backup/${backupTimestamp}/\n`);

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
    // v0.16.10: we NO LONGER wholesale-delete agents/. The smart-diff loop below
    // iterates TEMPLATE_AGENTS and preserves customized files individually.
    // skills/hooks/styles remain SDD-owned with wholesale delete-and-replace.
    for (const sub of ['skills', 'hooks', 'styles']) {
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
        if (!fs.existsSync(srcSub)) continue;

        // v0.16.10: smart-diff per template agent file (see Change #2 in
        // /Users/pb/.claude/plans/validated-wobbling-blum.md).
        //
        // Invariant: this loop only processes files listed in TEMPLATE_AGENTS.
        // Custom agents (files NOT in TEMPLATE_AGENTS) are left untouched on
        // disk — they're also captured by collectCustomAgents earlier, so the
        // existing restore loop at step (c) below will rewrite them from memory
        // (redundant but harmless, same content).
        if (sub === 'agents') {
          fs.mkdirSync(destSub, { recursive: true });

          const templateAgentFiles = fs
            .readdirSync(srcSub, { withFileTypes: true })
            .filter((e) => e.isFile() && TEMPLATE_AGENTS.includes(e.name))
            .map((e) => e.name);

          for (const file of templateAgentFiles) {
            const templateAgentPath = path.join(srcSub, file);
            const existingAgentPath = path.join(destSub, file);
            const relativePath = path.relative(dest, existingAgentPath);
            const posixPath = toPosix(relativePath);

            const rawTemplate = fs.readFileSync(templateAgentPath, 'utf8');
            const adaptedCoreTarget = adaptAgentContentString(rawTemplate, file, projectType);

            // --- v0.17.0 decision tree ---
            //
            // Case 1: file missing or --force-template → unconditional write.
            // Case 2: meta has a hash for this path → hash-based path.
            //   2a. hash matches → pristine, replace with adaptedCoreTarget.
            //   2b. hash mismatches → customized, preserve + .new backup.
            //       IMPORTANT (Codex M1): do NOT update newHashes here.
            // Case 3: no meta or no hash for this path → fallback path.
            //   3a. Compute adaptedFullTarget by applying stack adaptations
            //       in-memory so init-adapted files don't false-positive
            //       (Gemini M1 fix).
            //   3b. Content match → replace.
            //   3c. Content mismatch → preserve + .new backup. Same Codex M1
            //       rule: preserved files do NOT get a new hash.

            if (!fs.existsSync(existingAgentPath)) {
              // Missing — write fresh and track for stack adaptations.
              fs.writeFileSync(existingAgentPath, adaptedCoreTarget, 'utf8');
              filesToAdapt.add(posixPath);
              replaced++;
              continue;
            }

            if (config.forceTemplate) {
              backupBeforeReplace(dest, relativePath, backupTimestamp);
              fs.writeFileSync(existingAgentPath, adaptedCoreTarget, 'utf8');
              filesToAdapt.add(posixPath);
              replaced++;
              continue;
            }

            const existingContent = fs.readFileSync(existingAgentPath, 'utf8');
            const storedHash = meta && meta.hashes[posixPath];

            const preserveFile = (target) => {
              backupBeforeReplace(dest, relativePath, backupTimestamp);
              const newBackupPath = path.join(
                dest,
                '.sdd-backup',
                backupTimestamp,
                `${relativePath}.new`
              );
              try {
                fs.mkdirSync(path.dirname(newBackupPath), { recursive: true });
                fs.writeFileSync(newBackupPath, target, 'utf8');
              } catch (e) {
                console.warn(
                  `    ⚠ Failed to write .new backup for ${relativePath}: ${e.code || e.message}`
                );
              }
              modifiedAgentsResults.push({ name: relativePath, modified: true });
              preserved++;
              // Codex M1 invariant: do NOT update newHashes[posixPath]
              // for preserved files. The existing hash (if any) persists.
            };

            if (storedHash) {
              // Case 2: primary hash path.
              const currentHash = computeHash(existingContent);
              if (currentHash === storedHash) {
                // Pristine — replace with core-adapted target. Stack
                // adaptations will be applied via filesToAdapt after the
                // smart-diff loop.
                backupBeforeReplace(dest, relativePath, backupTimestamp);
                fs.writeFileSync(existingAgentPath, adaptedCoreTarget, 'utf8');
                filesToAdapt.add(posixPath);
                replaced++;
                continue;
              }
              // Hash mismatch → preserve. The .new backup target is the
              // FULL adapted target (core + stack) so the user can diff
              // apples to apples against their customized file.
              const adaptedFullTarget = applyStackAdaptationsToContent(
                adaptedCoreTarget,
                posixPath,
                scan,
                config
              );
              preserveFile(adaptedFullTarget);
              continue;
            }

            // Case 3: fallback path — no hash available. Compare against
            // the FULL adapted target (core + stack) so init-adapted files
            // from pre-v0.17.0 projects don't false-positive (Gemini M1).
            const adaptedFullTargetFallback = applyStackAdaptationsToContent(
              adaptedCoreTarget,
              posixPath,
              scan,
              config
            );

            if (
              normalizeForCompare(existingContent) ===
              normalizeForCompare(adaptedFullTargetFallback)
            ) {
              // Pristine per content compare — replace with core target.
              // Stack adaptations run after the loop to finalize the file.
              backupBeforeReplace(dest, relativePath, backupTimestamp);
              fs.writeFileSync(existingAgentPath, adaptedCoreTarget, 'utf8');
              filesToAdapt.add(posixPath);
              replaced++;
              continue;
            }

            // Content mismatch → preserve. Same rule: no hash update.
            preserveFile(adaptedFullTargetFallback);
          }
          continue;
        }

        // For .claude/commands, merge: overwrite SDD template commands, preserve user's custom commands
        if (dir === '.claude' && sub === 'commands') {
          fs.mkdirSync(destSub, { recursive: true });
          for (const file of fs.readdirSync(srcSub)) {
            // Always overwrite template-owned files (they may have been updated)
            fs.cpSync(path.join(srcSub, file), path.join(destSub, file));
          }
        } else {
          fs.cpSync(srcSub, destSub, { recursive: true });
        }
        replaced++;
      }

      // Merge settings.json — strategy depends on the tool:
      // .claude: template-owned (hooks from template), preserve user permissions/additionalDirectories
      // .gemini: user-owned, only migrate the model field if it's in the obsolete string format
      const settingsSrc = path.join(templateToolDir, 'settings.json');
      const settingsDest = path.join(base, 'settings.json');
      if (fs.existsSync(settingsSrc)) {
        const templateSettings = JSON.parse(fs.readFileSync(settingsSrc, 'utf8'));
        if (fs.existsSync(settingsDest)) {
          const userSettings = JSON.parse(fs.readFileSync(settingsDest, 'utf8'));
          let merged;
          if (dir === '.claude') {
            // Claude: take template, restore user's permissions/additionalDirectories
            merged = { ...templateSettings };
            if (userSettings.permissions) merged.permissions = userSettings.permissions;
            if (userSettings.additionalDirectories) merged.additionalDirectories = userSettings.additionalDirectories;
          } else {
            // Gemini: preserve all user keys, only migrate model field
            merged = { ...userSettings };
            if (typeof userSettings.model === 'string') {
              // Obsolete format: convert "model": "name" → "model": { "name": "name" }
              merged.model = { name: userSettings.model };
            } else if (
              userSettings.model !== undefined && (
                userSettings.model === null ||
                Array.isArray(userSettings.model) ||
                typeof userSettings.model !== 'object' ||
                !userSettings.model.name
              )
            ) {
              // Malformed (null, array, primitive, object without name) → reset to template default
              merged.model = { ...templateSettings.model };
            }
            // Otherwise (valid object with name, or absent): leave as-is
          }
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
  // AGENTS.md — hash-based smart-diff (v0.17.0 upgrade of v0.16.10 Change #3).
  //
  // Decision tree identical to the template-agent loop above:
  //   1. Missing or --force-template → unconditional write.
  //   2. meta has a hash for AGENTS.md → hash-based path:
  //      2a. hash match → pristine, replace.
  //      2b. hash mismatch → preserve + .new backup. Codex M1 invariant:
  //          do NOT update newHashes['AGENTS.md'].
  //   3. No hash → fallback content compare against the full adapted
  //      target. AGENTS.md has no stack adaptations (adaptAgentsMd already
  //      includes project-type pruning), so the comparison target is the
  //      adaptAgentsMd output itself.
  const agentsMdTemplate = fs.readFileSync(path.join(templateDir, 'AGENTS.md'), 'utf8');
  const adaptedAgentsMd = adaptAgentsMd(agentsMdTemplate, config, scan);
  const agentsMdDestPath = path.join(dest, 'AGENTS.md');
  const AGENTS_MD_POSIX = 'AGENTS.md';

  const preserveAgentsMd = () => {
    backupBeforeReplace(dest, 'AGENTS.md', backupTimestamp);
    const newBackupPath = path.join(dest, '.sdd-backup', backupTimestamp, 'AGENTS.md.new');
    try {
      fs.mkdirSync(path.dirname(newBackupPath), { recursive: true });
      fs.writeFileSync(newBackupPath, adaptedAgentsMd, 'utf8');
    } catch (e) {
      console.warn(`    ⚠ Failed to write .new backup for AGENTS.md: ${e.code || e.message}`);
    }
    modifiedAgentsResults.push({ name: 'AGENTS.md', modified: true });
    preserved++;
    // Codex M1 invariant: do NOT update newHashes[AGENTS_MD_POSIX].
  };

  if (!fs.existsSync(agentsMdDestPath)) {
    // Missing — write and hash fresh.
    fs.writeFileSync(agentsMdDestPath, adaptedAgentsMd, 'utf8');
    newHashes[AGENTS_MD_POSIX] = computeHash(adaptedAgentsMd);
    replaced++;
  } else if (config.forceTemplate) {
    backupBeforeReplace(dest, 'AGENTS.md', backupTimestamp);
    fs.writeFileSync(agentsMdDestPath, adaptedAgentsMd, 'utf8');
    newHashes[AGENTS_MD_POSIX] = computeHash(adaptedAgentsMd);
    replaced++;
  } else {
    const existingAgentsMd = fs.readFileSync(agentsMdDestPath, 'utf8');
    const storedAgentsMdHash = meta && meta.hashes[AGENTS_MD_POSIX];

    if (storedAgentsMdHash) {
      const currentHash = computeHash(existingAgentsMd);
      if (currentHash === storedAgentsMdHash) {
        backupBeforeReplace(dest, 'AGENTS.md', backupTimestamp);
        fs.writeFileSync(agentsMdDestPath, adaptedAgentsMd, 'utf8');
        newHashes[AGENTS_MD_POSIX] = computeHash(adaptedAgentsMd);
        replaced++;
      } else {
        preserveAgentsMd();
      }
    } else if (
      normalizeForCompare(existingAgentsMd) === normalizeForCompare(adaptedAgentsMd)
    ) {
      // Fallback content-compare.
      backupBeforeReplace(dest, 'AGENTS.md', backupTimestamp);
      fs.writeFileSync(agentsMdDestPath, adaptedAgentsMd, 'utf8');
      newHashes[AGENTS_MD_POSIX] = computeHash(adaptedAgentsMd);
      replaced++;
    } else {
      preserveAgentsMd();
    }
  }

  // CLAUDE.md / GEMINI.md (back up before replace, not smart-diff'd)
  if (aiTools !== 'gemini') {
    backupBeforeReplace(dest, 'CLAUDE.md', backupTimestamp);
    fs.copyFileSync(path.join(templateDir, 'CLAUDE.md'), path.join(dest, 'CLAUDE.md'));
    replaced++;
  }
  if (aiTools !== 'claude') {
    backupBeforeReplace(dest, 'GEMINI.md', backupTimestamp);
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
      // Keep lines that are not in the fresh version, not empty, and not our own injected header
      return trimmed.length > 0 && !freshLines.has(trimmed) && trimmed !== '# Project-specific variables (preserved from previous version)';
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

  // --- e3) .gitignore — idempotent append of .sdd-backup/ (v0.16.10)
  //          and .sdd-meta.json (v0.17.0) ---
  // Existing projects created before these versions don't have the
  // entries in their .gitignore. Append them once so the files aren't
  // accidentally committed.
  const userGitignorePath = path.join(dest, '.gitignore');
  if (fs.existsSync(userGitignorePath)) {
    let existingGitignore = fs.readFileSync(userGitignorePath, 'utf8');
    let updatedGitignore = false;

    if (!/^\s*\/?\.sdd-backup\/?\s*$/m.test(existingGitignore)) {
      const appendBlock = '\n\n# sdd-devflow upgrade backups (ignored — kept locally for recovery only)\n.sdd-backup/\n';
      existingGitignore = existingGitignore.trimEnd() + appendBlock;
      updatedGitignore = true;
      step('Updated .gitignore with .sdd-backup/ entry');
    }

    if (!/^\s*\/?\.sdd-meta\.json\s*$/m.test(existingGitignore)) {
      const appendBlock = '\n\n# sdd-devflow provenance tracking (local-only, content-addressable hashes)\n.sdd-meta.json\n';
      existingGitignore = existingGitignore.trimEnd() + appendBlock;
      updatedGitignore = true;
      step('Updated .gitignore with .sdd-meta.json entry');
    }

    if (updatedGitignore) {
      fs.writeFileSync(userGitignorePath, existingGitignore, 'utf8');
    }
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

  // Adapt agent/skill content for project type (single-stack pruning —
  // removes frontend/backend refs). Separate from stack substitutions
  // (Zod/ORM/DDD). Safe to run on all files because the pruning rules
  // use literal template strings that only appear in raw template.
  if (projectType !== 'fullstack') {
    adaptAgentContentForProjectType(dest, config, regexReplaceInFile);
  }

  // v0.17.0: Stack adaptations run ONLY on files that were replaced or
  // newly written in this run. Preserved (customized) files MUST NOT be
  // touched by stack adaptations, otherwise their user edits could be
  // mangled by the rule replacements (Codex M1 + plan v1.1 § Allowlist
  // semantics).
  //
  // SKILL.md, ticket-template.md, and documentation-standards.mdc were
  // wholesale-recopied earlier in the upgrade (via fs.cpSync and the
  // standards pipeline), so they are always in the "replaced" state and
  // must be in the allowlist.
  for (const dir of toolDirs) {
    filesToAdapt.add(toPosix(`${dir}/skills/development-workflow/SKILL.md`));
    filesToAdapt.add(
      toPosix(`${dir}/skills/development-workflow/references/ticket-template.md`)
    );
  }
  filesToAdapt.add(toPosix('ai-specs/specs/documentation-standards.mdc'));

  applyStackAdaptations(dest, scan, config, filesToAdapt);

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

  // --- g1) v0.17.0: update .sdd-meta.json ---
  //
  // For every smart-diff-tracked file that was replaced or newly written
  // in this run (i.e. in filesToAdapt AND in the expected tracked set),
  // recompute its hash from the post-adaptation on-disk content and merge
  // into newHashes. Preserved files are NOT in filesToAdapt, so their old
  // hash (if any) is left alone — Codex M1 invariant.
  //
  // Then prune hashes for paths that are no longer expected for this
  // (aiTools, projectType) combination (e.g. single-stack removed a
  // frontend agent). User-deleted files that ARE expected keep their
  // hash, since the next upgrade will recreate the file from template.
  {
    const trackedSet = expectedSmartDiffTrackedPaths(aiTools, projectType);
    for (const posixPath of filesToAdapt) {
      if (!trackedSet.has(posixPath)) continue;
      const absPath = path.join(dest, ...posixPath.split('/'));
      const h = hashFileOnDisk(absPath);
      if (h !== null) {
        newHashes[posixPath] = h;
      }
    }
    const prunedHashes = pruneExpectedAbsent(newHashes, aiTools, projectType);
    writeMeta(dest, prunedHashes);
  }

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

  if (modifiedAgentsResults.length > 0) {
    console.log(
      `\n  ⚠ Review preserved customizations (backups in .sdd-backup/${backupTimestamp}/):`
    );
    for (const r of modifiedAgentsResults) {
      console.log(
        `    - ${r.name} (not updated; new adapted version saved as ${r.name}.new)`
      );
    }
    console.log(
      `\n    Note: this is EXPECTED on cross-version upgrades (e.g. ${config.installedVersion} → ${newVersion}).`
    );
    console.log(
      `    v0.16.10 uses conservative preserve semantics — any file that does not exactly`
    );
    console.log(
      `    match the new template's adapted output is preserved, even if you never edited it.`
    );
    console.log(
      `    Provenance tracking (v0.17.0) will eliminate these false positives.`
    );
    console.log(`\n    If you have NOT customized these files:`);
    console.log(
      `      → re-run with --force-template to accept the new template content in bulk`
    );
    console.log(`\n    If you HAVE customized these files:`);
    console.log(
      `      → diff .sdd-backup/${backupTimestamp}/<path>.new against your file and merge manually`
    );
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
