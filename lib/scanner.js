'use strict';

const fs = require('fs');
const path = require('path');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', 'coverage', '.turbo']);

/**
 * Scan an existing project directory and return detected configuration.
 */
function scan(projectDir) {
  const pkg = readPackageJson(projectDir);

  const result = {
    projectName: pkg.name || path.basename(projectDir),
    description: pkg.description || '',
    language: detectLanguage(projectDir),
    backend: detectBackend(projectDir, pkg),
    frontend: detectFrontend(projectDir, pkg),
    isMonorepo: detectMonorepo(projectDir, pkg),
    rootDirs: listRootDirs(projectDir),
    srcStructure: detectArchitecture(projectDir, pkg),
    tests: detectTests(projectDir, pkg),
    existingDocs: detectExistingDocs(projectDir),
    gitBranch: detectGitBranch(projectDir),
    hasGit: fs.existsSync(path.join(projectDir, '.git')),
  };

  return result;
}

// --- Helpers ---

function readPackageJson(dir) {
  const pkgPath = path.join(dir, 'package.json');
  if (!fs.existsSync(pkgPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch {
    return {};
  }
}

function getAllDeps(pkg) {
  return {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };
}

function detectLanguage(dir) {
  if (fs.existsSync(path.join(dir, 'tsconfig.json'))) return 'typescript';
  // Check for ts files in src/
  const srcDir = path.join(dir, 'src');
  if (fs.existsSync(srcDir)) {
    try {
      const files = fs.readdirSync(srcDir);
      if (files.some((f) => f.endsWith('.ts') || f.endsWith('.tsx'))) return 'typescript';
    } catch { /* ignore */ }
  }
  return 'javascript';
}

function detectBackend(dir, pkg) {
  const deps = getAllDeps(pkg);
  const result = { detected: false, framework: null, orm: null, db: null, port: null };

  // Framework detection
  const frameworks = [
    { dep: 'express', label: 'Express' },
    { dep: 'fastify', label: 'Fastify' },
    { dep: 'koa', label: 'Koa' },
    { dep: '@nestjs/core', label: 'NestJS' },
    { dep: '@hapi/hapi', label: 'Hapi' },
    { dep: '@adonisjs/core', label: 'AdonisJS' },
  ];

  for (const fw of frameworks) {
    if (deps[fw.dep]) {
      result.detected = true;
      result.framework = fw.label;
      break;
    }
  }

  // ORM detection
  const orms = [
    { dep: '@prisma/client', label: 'Prisma' },
    { dep: 'mongoose', label: 'Mongoose' },
    { dep: 'typeorm', label: 'TypeORM' },
    { dep: 'sequelize', label: 'Sequelize' },
    { dep: 'drizzle-orm', label: 'Drizzle' },
    { dep: 'knex', label: 'Knex' },
    { dep: '@mikro-orm/core', label: 'MikroORM' },
    { dep: 'objection', label: 'Objection.js' },
  ];

  for (const orm of orms) {
    if (deps[orm.dep]) {
      result.orm = orm.label;
      break;
    }
  }

  // Database detection from Prisma schema
  if (result.orm === 'Prisma') {
    const prismaDb = detectDatabaseFromPrisma(dir);
    if (prismaDb) result.db = prismaDb;
  }

  // Database detection from Mongoose
  if (result.orm === 'Mongoose') {
    result.db = 'MongoDB';
  }

  // Database detection from env
  if (!result.db) {
    result.db = detectDatabaseFromEnv(dir);
  }

  // Port detection
  result.port = detectPort(dir, pkg);

  // If no framework but has a server-like structure, still mark as detected
  if (!result.detected && (result.orm || result.db)) {
    result.detected = true;
  }

  return result;
}

function detectFrontend(dir, pkg) {
  const deps = getAllDeps(pkg);
  const result = { detected: false, framework: null, styling: null, components: null, state: null };

  // Framework detection (order matters — more specific first)
  const frameworks = [
    { dep: 'next', label: 'Next.js' },
    { dep: 'nuxt', label: 'Nuxt' },
    { dep: '@remix-run/react', label: 'Remix' },
    { dep: 'astro', label: 'Astro' },
    { dep: 'solid-js', label: 'SolidJS' },
    { dep: 'react', label: 'React' },
    { dep: 'vue', label: 'Vue' },
    { dep: '@angular/core', label: 'Angular' },
    { dep: 'svelte', label: 'Svelte' },
  ];

  for (const fw of frameworks) {
    if (deps[fw.dep]) {
      result.detected = true;
      result.framework = fw.label;
      break;
    }
  }

  // Styling
  if (deps['tailwindcss']) result.styling = 'Tailwind CSS';
  else if (deps['styled-components']) result.styling = 'styled-components';
  else if (deps['@emotion/react'] || deps['@emotion/styled']) result.styling = 'Emotion';
  else if (deps['sass'] || deps['node-sass']) result.styling = 'Sass';

  // Component libraries
  if (deps['@radix-ui/react-dialog'] || deps['@radix-ui/react-select'] || hasRadixDep(deps)) {
    result.components = 'Radix UI';
  } else if (deps['@headlessui/react']) {
    result.components = 'Headless UI';
  } else if (deps['@mui/material']) {
    result.components = 'Material UI';
  } else if (deps['@chakra-ui/react']) {
    result.components = 'Chakra UI';
  } else if (deps['antd']) {
    result.components = 'Ant Design';
  }

  // State management
  if (deps['zustand']) result.state = 'Zustand';
  else if (deps['@reduxjs/toolkit'] || deps['redux']) result.state = 'Redux';
  else if (deps['jotai']) result.state = 'Jotai';
  else if (deps['@tanstack/react-query']) result.state = 'TanStack Query';
  else if (deps['recoil']) result.state = 'Recoil';
  else if (deps['pinia']) result.state = 'Pinia';
  else if (deps['mobx']) result.state = 'MobX';

  return result;
}

function hasRadixDep(deps) {
  return Object.keys(deps).some((d) => d.startsWith('@radix-ui/'));
}

function detectMonorepo(dir, pkg) {
  if (pkg.workspaces) return true;
  if (fs.existsSync(path.join(dir, 'lerna.json'))) return true;
  if (fs.existsSync(path.join(dir, 'turbo.json'))) return true;
  if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return true;
  if (fs.existsSync(path.join(dir, 'nx.json'))) return true;
  return false;
}

function listRootDirs(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !SKIP_DIRS.has(d.name) && !d.name.startsWith('.'))
      .map((d) => d.name + '/')
      .sort();
  } catch {
    return [];
  }
}

function detectArchitecture(dir, pkg) {
  const result = {
    hasControllers: false,
    hasRoutes: false,
    hasModels: false,
    hasServices: false,
    hasDomain: false,
    hasMiddleware: false,
    hasFeatures: false,
    hasHandlers: false,
    dirs: [],
    pattern: 'unknown',
  };

  // Find the source root — could be src/, app/, or just root
  const srcRoot = findSrcRoot(dir);
  if (!srcRoot) return result;

  const dirs = listDirsRecursive(srcRoot, 2);
  result.dirs = dirs;

  // Check for known patterns
  const dirNames = new Set(dirs.map((d) => path.basename(d)));

  result.hasControllers = dirNames.has('controllers') || dirNames.has('controller');
  result.hasRoutes = dirNames.has('routes') || dirNames.has('router');
  result.hasModels = dirNames.has('models') || dirNames.has('model');
  result.hasServices = dirNames.has('services') || dirNames.has('service');
  result.hasDomain = dirNames.has('domain');
  result.hasMiddleware = dirNames.has('middleware') || dirNames.has('middlewares');
  result.hasFeatures = dirNames.has('features') || dirNames.has('modules');
  result.hasHandlers = dirNames.has('handlers') || dirNames.has('handler');

  // Determine pattern
  const hasManagers = dirNames.has('managers') || dirNames.has('manager');
  if (result.hasDomain && (dirNames.has('application') || dirNames.has('infrastructure'))) {
    result.pattern = 'ddd';
  } else if (result.hasHandlers && result.hasControllers && hasManagers) {
    result.pattern = 'layered';
  } else if (result.hasControllers && result.hasModels) {
    result.pattern = 'mvc';
  } else if (result.hasFeatures) {
    result.pattern = 'feature-based';
  } else if (result.hasHandlers && result.hasRoutes) {
    result.pattern = 'handler-based';
  } else if (dirs.length <= 3) {
    result.pattern = 'flat';
  }

  return result;
}

function findSrcRoot(dir) {
  // Try common source roots
  const candidates = ['src', 'app', 'server', 'lib'];
  for (const c of candidates) {
    const p = path.join(dir, c);
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return p;
  }
  return dir; // Fall back to project root
}

function listDirsRecursive(dir, maxDepth, currentDepth = 0) {
  if (currentDepth >= maxDepth) return [];
  const result = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
        const rel = entry.name;
        result.push(rel);
        const subDirs = listDirsRecursive(path.join(dir, entry.name), maxDepth, currentDepth + 1);
        result.push(...subDirs.map((d) => `${rel}/${d}`));
      }
    }
  } catch { /* ignore */ }
  return result;
}

function detectTests(dir, pkg) {
  const deps = getAllDeps(pkg);
  const result = {
    framework: 'none',
    e2eFramework: null,
    hasConfig: false,
    testFiles: 0,
    testDirs: [],
    estimatedCoverage: 'none',
  };

  // Unit test framework detection
  if (deps['jest'] || deps['@jest/core'] || deps['ts-jest'] || deps['@types/jest']) {
    result.framework = 'jest';
  } else if (deps['vitest']) {
    result.framework = 'vitest';
  } else if (deps['mocha']) {
    result.framework = 'mocha';
  }

  // E2E test framework detection (supplement, doesn't override unit framework)
  result.e2eFramework = null;
  if (deps['@playwright/test'] || deps['playwright']) {
    result.e2eFramework = 'playwright';
  } else if (deps['cypress']) {
    result.e2eFramework = 'cypress';
  }

  // Config files
  const configFiles = [
    'jest.config.js', 'jest.config.ts', 'jest.config.mjs', 'jest.config.cjs',
    'vitest.config.js', 'vitest.config.ts', 'vitest.config.mjs',
    '.mocharc.yml', '.mocharc.json', '.mocharc.js',
    'playwright.config.ts', 'playwright.config.js',
    'cypress.config.ts', 'cypress.config.js',
  ];
  result.hasConfig = configFiles.some((f) => fs.existsSync(path.join(dir, f)));

  // Count test files and source files
  const counts = countFilesRecursive(dir);
  result.testFiles = counts.testFiles;
  result.testDirs = counts.testDirs;

  // Heuristic coverage
  if (counts.testFiles === 0) {
    result.estimatedCoverage = 'none';
  } else if (counts.sourceFiles > 0) {
    const ratio = counts.testFiles / counts.sourceFiles;
    if (ratio >= 0.5) result.estimatedCoverage = 'high';
    else if (ratio >= 0.2) result.estimatedCoverage = 'medium';
    else result.estimatedCoverage = 'low';
  } else {
    result.estimatedCoverage = 'low';
  }

  return result;
}

function countFilesRecursive(dir, depth = 0, maxDepth = 6) {
  const result = { testFiles: 0, sourceFiles: 0, testDirs: [] };
  if (depth >= maxDepth) return result;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let hasTestFile = false;

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;

        // Track test directories
        if (entry.name === '__tests__' || entry.name === 'tests' || entry.name === 'test') {
          result.testDirs.push(entry.name + '/');
        }

        const sub = countFilesRecursive(path.join(dir, entry.name), depth + 1, maxDepth);
        result.testFiles += sub.testFiles;
        result.sourceFiles += sub.sourceFiles;
        result.testDirs.push(...sub.testDirs);
      } else if (entry.isFile()) {
        const name = entry.name;
        if (name.match(/\.(test|spec)\.(ts|tsx|js|jsx|mjs)$/)) {
          result.testFiles++;
          hasTestFile = true;
        } else if (name.match(/\.(ts|tsx|js|jsx|mjs)$/) && !name.match(/\.(config|setup|d)\./)) {
          result.sourceFiles++;
        }
      }
    }
  } catch { /* ignore */ }

  // Deduplicate testDirs
  result.testDirs = [...new Set(result.testDirs)];
  return result;
}

function detectExistingDocs(dir) {
  const result = {
    hasOpenAPI: false,
    openAPIPath: null,
    hasPrismaSchema: false,
    prismaSchemaPath: null,
    hasReadme: false,
    hasEnvExample: false,
  };

  // OpenAPI / Swagger
  const openApiCandidates = [
    'swagger.json', 'swagger.yaml', 'swagger.yml',
    'openapi.json', 'openapi.yaml', 'openapi.yml',
    'api-spec.yaml', 'api-spec.yml', 'api-spec.json',
    'docs/swagger.json', 'docs/swagger.yaml',
    'docs/openapi.json', 'docs/openapi.yaml',
    'docs/api-spec.yaml',
  ];

  for (const candidate of openApiCandidates) {
    if (fs.existsSync(path.join(dir, candidate))) {
      result.hasOpenAPI = true;
      result.openAPIPath = candidate;
      break;
    }
  }

  // Prisma schema
  const prismaCandidates = [
    'prisma/schema.prisma',
    'src/prisma/schema.prisma',
    'backend/prisma/schema.prisma',
  ];

  for (const candidate of prismaCandidates) {
    if (fs.existsSync(path.join(dir, candidate))) {
      result.hasPrismaSchema = true;
      result.prismaSchemaPath = candidate;
      break;
    }
  }

  result.hasReadme = fs.existsSync(path.join(dir, 'README.md'));
  result.hasEnvExample = fs.existsSync(path.join(dir, '.env.example')) || fs.existsSync(path.join(dir, '.env.sample'));

  return result;
}

function detectDatabaseFromPrisma(dir) {
  const candidates = ['prisma/schema.prisma', 'src/prisma/schema.prisma', 'backend/prisma/schema.prisma'];
  for (const candidate of candidates) {
    const schemaPath = path.join(dir, candidate);
    if (fs.existsSync(schemaPath)) {
      try {
        const content = fs.readFileSync(schemaPath, 'utf8');
        // Match provider only within a datasource block (skip generator blocks)
        const dsBlock = content.match(/datasource\s+\w+\s*\{[^}]*\}/);
        const providerSource = dsBlock ? dsBlock[0] : content;
        const match = providerSource.match(/provider\s*=\s*"(\w+)"/);
        if (match) {
          const provider = match[1];
          const dbMap = {
            postgresql: 'PostgreSQL',
            postgres: 'PostgreSQL',
            mysql: 'MySQL',
            sqlite: 'SQLite',
            sqlserver: 'SQL Server',
            mongodb: 'MongoDB',
            cockroachdb: 'CockroachDB',
          };
          return dbMap[provider] || provider;
        }
      } catch { /* ignore */ }
    }
  }
  return null;
}

function detectDatabaseFromEnv(dir) {
  const envFiles = ['.env', '.env.local', '.env.example', '.env.sample'];
  for (const envFile of envFiles) {
    const envPath = path.join(dir, envFile);
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        // Check DATABASE_URL
        const match = content.match(/DATABASE_URL\s*=\s*(\S+)/);
        if (match) {
          const url = match[1].replace(/["']/g, '');
          if (url.startsWith('postgresql://') || url.startsWith('postgres://')) return 'PostgreSQL';
          if (url.startsWith('mongodb://') || url.startsWith('mongodb+srv://')) return 'MongoDB';
          if (url.startsWith('mysql://')) return 'MySQL';
          if (url.includes('sqlite')) return 'SQLite';
        }
        // Check MONGODB_URI / MONGO_URI
        if (/^MONGO(?:DB)?_URI\s*=/m.test(content)) return 'MongoDB';
        // Check REDIS_URL
        if (/^REDIS_URL\s*=/m.test(content)) return 'Redis';
      } catch { /* ignore */ }
    }
  }
  return null;
}

function detectPort(dir, pkg) {
  // From .env
  const envFiles = ['.env', '.env.local', '.env.example', '.env.sample'];
  for (const envFile of envFiles) {
    const envPath = path.join(dir, envFile);
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        const match = content.match(/^PORT\s*=\s*["']?(\d+)/m);
        if (match) return parseInt(match[1], 10);
      } catch { /* ignore */ }
    }
  }

  // From package.json scripts
  if (pkg.scripts) {
    const scriptValues = Object.values(pkg.scripts).join(' ');
    const match = scriptValues.match(/--port\s+(\d+)|PORT=(\d+)|-p\s+(\d+)/);
    if (match) return parseInt(match[1] || match[2] || match[3], 10);
  }

  return null;
}

function detectGitBranch(dir) {
  const headPath = path.join(dir, '.git', 'HEAD');
  if (fs.existsSync(headPath)) {
    try {
      const content = fs.readFileSync(headPath, 'utf8').trim();
      const match = content.match(/ref: refs\/heads\/(.+)/);
      if (match) return match[1];
    } catch { /* ignore */ }
  }
  return 'main';
}

module.exports = { scan };
