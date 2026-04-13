'use strict';

/**
 * SDD DevFlow provenance tracking — v0.17.0+
 *
 * The `.sdd-meta.json` file stores content-addressable hashes of files the
 * tool considers "canonically tool-owned" (template agents + AGENTS.md in
 * v0.17.0). The upgrade path uses these hashes to answer the question
 * "has the user edited this file since the last time the tool wrote it?"
 * precisely, without comparing against the new template's adapted output
 * (which drifts across versions and causes false-positive preserve
 * warnings on cross-version upgrades — the Codex P1 finding from the
 * v0.16.10 cross-model review).
 *
 * Core invariant (Codex M1 from plan v1.0 review): a hash in this file
 * represents "the last time the tool wrote this file, the content hashed
 * to X". Hashes are ONLY written/updated when the tool actually wrote
 * canonical output to a file in the current run (replaced, new, or
 * --force-template paths). Preserved files leave their hash entry
 * untouched — otherwise the user's customized content would be hashed and
 * silently overwritten on the next upgrade.
 *
 * File format (schemaVersion: 1):
 *   {
 *     "schemaVersion": 1,
 *     "hashes": {
 *       ".claude/agents/backend-planner.md": "sha256:abc...",
 *       "AGENTS.md": "sha256:def...",
 *       ...
 *     }
 *   }
 *
 * Path keys are POSIX-normalized (forward slashes) on ALL platforms so
 * lookups work consistently on Windows where path.join would otherwise
 * produce backslashes (Gemini M2 fix).
 */

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const { FRONTEND_AGENTS, BACKEND_AGENTS, TEMPLATE_AGENTS } = require('./config');

const META_FILE = '.sdd-meta.json';
const CURRENT_SCHEMA_VERSION = 1;

/**
 * Normalize text for content-addressable hashing.
 *
 * v0.17.0: only strip CR / CRLF line endings (Windows git core.autocrlf
 * compatibility). Do NOT strip trailing whitespace per line — that would
 * destroy markdown hard-breaks (two trailing spaces render as <br>) and
 * silently wipe user customizations that only touched whitespace
 * (Gemini M2 fix).
 *
 * Trade-off: editors configured to "trim trailing whitespace on save"
 * (e.g. VSCode files.trimTrailingWhitespace=true) will produce a hash
 * mismatch even without semantic edits. This is a conservative false
 * positive — the upgrade preserves the file and the user can re-run
 * with --force-template to accept the new template content. The
 * alternative (silent wipe of markdown hard-breaks) is strictly worse.
 */
function normalizeForCompare(text) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Compute the content-addressable hash of a string.
 *
 * Returns 'sha256:<hex>'. The prefix is mandatory so v0.17.x can
 * introduce additional algorithms (e.g. 'blake3:...') without breaking
 * old readers — equality comparison on the full string handles upgrades
 * naturally.
 */
function computeHash(content) {
  const digest = createHash('sha256').update(normalizeForCompare(content), 'utf8').digest('hex');
  return `sha256:${digest}`;
}

/**
 * Compute the hash of a file on disk, or null if it doesn't exist.
 * Reads as UTF-8 (all tracked files are text).
 */
function hashFileOnDisk(absPath) {
  if (!fs.existsSync(absPath)) return null;
  try {
    return computeHash(fs.readFileSync(absPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Normalize a platform-relative path to POSIX form for use as a hash map
 * key. On Windows this converts backslashes to forward slashes; on POSIX
 * it's a no-op.
 */
function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/');
}

/**
 * Read and validate .sdd-meta.json. Returns null on ANY read/parse/shape
 * failure so callers can fall back to v0.16.10 content-compare behavior.
 * Never throws.
 *
 * Returns { schemaVersion, hashes } on success.
 */
function readMeta(dest) {
  const p = path.join(dest, META_FILE);
  if (!fs.existsSync(p)) return null;

  let raw;
  try {
    raw = fs.readFileSync(p, 'utf8');
  } catch (e) {
    console.warn(`    ⚠ .sdd-meta.json unreadable (${e.code || e.message}). Falling back to content compare.`);
    return null;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.warn(`    ⚠ .sdd-meta.json is not valid JSON (${e.message}). Falling back to content compare.`);
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    console.warn(`    ⚠ .sdd-meta.json root is not an object. Falling back.`);
    return null;
  }

  // Schema version: absent → assume v1 (forward-compat with writers that
  // might omit the field). Greater than current → log a warning and fall
  // back (don't try to interpret future schemas).
  const schemaVersion = parsed.schemaVersion ?? 1;
  if (typeof schemaVersion !== 'number' || schemaVersion < 1) {
    console.warn(`    ⚠ .sdd-meta.json has invalid schemaVersion ${schemaVersion}. Falling back.`);
    return null;
  }
  if (schemaVersion > CURRENT_SCHEMA_VERSION) {
    console.warn(
      `    ⚠ .sdd-meta.json schemaVersion ${schemaVersion} is newer than supported ${CURRENT_SCHEMA_VERSION}. ` +
      `Falling back to content compare. Upgrade the sdd-devflow CLI to a newer version.`
    );
    return null;
  }

  const hashes = parsed.hashes;
  if (typeof hashes !== 'object' || hashes === null || Array.isArray(hashes)) {
    console.warn(`    ⚠ .sdd-meta.json hashes field is not an object. Falling back.`);
    return null;
  }

  // Shallow-validate each entry: key is a string, value matches the
  // sha256:<hex> shape. Malformed entries are dropped silently (they'll
  // be recomputed on the next upgrade).
  const cleaned = {};
  const HASH_RE = /^sha256:[0-9a-f]{64}$/;
  for (const [k, v] of Object.entries(hashes)) {
    if (typeof k !== 'string' || typeof v !== 'string') continue;
    if (!HASH_RE.test(v)) continue;
    // Normalize keys to POSIX in case an older writer produced
    // backslashed paths on Windows.
    cleaned[k.split('\\').join('/')] = v;
  }

  return { schemaVersion, hashes: cleaned };
}

/**
 * Write .sdd-meta.json with the given hashes map. Non-fatal on failure —
 * logs a warning but does NOT throw. The next upgrade will recompute and
 * try again.
 */
function writeMeta(dest, hashes) {
  const p = path.join(dest, META_FILE);
  const payload = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    hashes,
  };
  try {
    fs.writeFileSync(p, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  } catch (e) {
    console.warn(
      `    ⚠ Failed to write .sdd-meta.json: ${e.code || e.message}. ` +
      `Next upgrade will fall back to content compare.`
    );
  }
}

/**
 * Compute the full set of POSIX paths that SHOULD have a hash entry for
 * the given (aiTools, projectType) combination. Used for two purposes:
 *
 * 1. Pruning: remove hash entries for files that are expected-absent
 *    (e.g., single-stack project removed frontend agents) — but NOT for
 *    files the user temporarily deleted manually (those get recreated
 *    on the next upgrade, so their hash should persist).
 *
 * 2. Install-time hashing: iterate this set, compute each file's hash
 *    if the file exists on disk.
 *
 * v0.17.0 scope: template agents (.claude/agents/*, .gemini/agents/*)
 * + AGENTS.md. SKILL.md / ticket-template.md / documentation-standards.mdc
 * are tracked with wholesale-recopy + stack-adaptations on every upgrade
 * (v0.16.10 behavior); they are NOT in this set.
 */
function expectedSmartDiffTrackedPaths(aiTools, projectType) {
  const paths = new Set();

  const toolDirs = [];
  if (aiTools !== 'gemini') toolDirs.push('.claude');
  if (aiTools !== 'claude') toolDirs.push('.gemini');

  const agents = TEMPLATE_AGENTS.filter((a) => {
    if (projectType === 'backend' && FRONTEND_AGENTS.includes(a)) return false;
    if (projectType === 'frontend' && BACKEND_AGENTS.includes(a)) return false;
    return true;
  });

  for (const dir of toolDirs) {
    for (const agent of agents) {
      paths.add(`${dir}/agents/${agent}`);
    }
  }

  paths.add('AGENTS.md');

  return paths;
}

/**
 * Remove hash entries from `hashes` that are NOT in the expected set
 * for the current (aiTools, projectType). Returns a new object.
 *
 * This does NOT prune based on on-disk presence — a user who temporarily
 * deletes an agent file keeps its hash so the next upgrade can recreate
 * the file from the template and restore the hash map cleanly
 * (Gemini M3 fix).
 */
function pruneExpectedAbsent(hashes, aiTools, projectType) {
  const expected = expectedSmartDiffTrackedPaths(aiTools, projectType);
  const pruned = {};
  for (const [k, v] of Object.entries(hashes)) {
    if (expected.has(k)) pruned[k] = v;
  }
  return pruned;
}

/**
 * Compute install-time hashes for a newly-populated project. Walks the
 * expected set and hashes any file that exists on disk, EXCLUDING any
 * path that's in `excludeSet` (e.g., `--init` encountered a pre-existing
 * file and skipped it — the user owns that content, we must NOT mark it
 * as tool-canonical or the next upgrade would overwrite user content.
 * Codex round 2 P1 fix).
 *
 * @param {string} dest - Project root
 * @param {string} aiTools - 'claude' | 'gemini' | 'both'
 * @param {string} projectType - 'backend' | 'frontend' | 'fullstack'
 * @param {Set<string>|Iterable<string>|null} excludeSet - POSIX paths to exclude. Null → no exclusion.
 */
function computeInstallHashes(dest, aiTools, projectType, excludeSet = null) {
  const excluded = excludeSet ? new Set(excludeSet) : null;
  const hashes = {};
  for (const posixPath of expectedSmartDiffTrackedPaths(aiTools, projectType)) {
    if (excluded && excluded.has(posixPath)) continue;
    const absPath = path.join(dest, ...posixPath.split('/'));
    const hash = hashFileOnDisk(absPath);
    if (hash !== null) {
      hashes[posixPath] = hash;
    }
  }
  return hashes;
}

module.exports = {
  META_FILE,
  CURRENT_SCHEMA_VERSION,
  computeHash,
  hashFileOnDisk,
  toPosix,
  normalizeForCompare,
  readMeta,
  writeMeta,
  expectedSmartDiffTrackedPaths,
  pruneExpectedAbsent,
  computeInstallHashes,
};
