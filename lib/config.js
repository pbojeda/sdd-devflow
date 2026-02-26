'use strict';

const DEFAULTS = {
  projectName: '',
  projectDir: '',
  description: '',
  businessContext: '',
  projectType: 'fullstack', // 'fullstack' | 'backend' | 'frontend'
  backendStack: 'express-prisma-pg',
  frontendStack: 'nextjs-tailwind-radix',
  aiTools: 'both', // 'both' | 'claude' | 'gemini'
  autonomyLevel: 2,
  branching: 'github-flow',
  backendPort: 3010,
  frontendPort: 3000,
  dbPort: 5432,
};

const PROJECT_TYPES = [
  { key: 'fullstack', label: 'Backend + Frontend (monorepo)', default: true },
  { key: 'backend', label: 'Backend only' },
  { key: 'frontend', label: 'Frontend only' },
];

const BACKEND_STACKS = [
  {
    key: 'express-prisma-pg',
    label: 'Node.js + Express + Prisma + PostgreSQL',
    default: true,
    db: 'PostgreSQL',
    orm: 'Prisma',
    framework: 'Express',
    runtime: 'Node.js',
    dbPort: 5432,
    databaseUrl: 'postgresql://user:password@localhost:5432/dbname',
    needsStandardsUpdate: false,
  },
  {
    key: 'express-mongo-mongoose',
    label: 'Node.js + Express + MongoDB + Mongoose',
    db: 'MongoDB',
    orm: 'Mongoose',
    framework: 'Express',
    runtime: 'Node.js',
    dbPort: 27017,
    databaseUrl: 'mongodb://localhost:27017/dbname',
    needsStandardsUpdate: true,
  },
  {
    key: 'custom',
    label: 'Custom (enter your own)',
    needsStandardsUpdate: true,
  },
];

const FRONTEND_STACKS = [
  {
    key: 'nextjs-tailwind-radix',
    label: 'Next.js + Tailwind CSS + Radix UI + Zustand',
    default: true,
    framework: 'Next.js (App Router)',
    styling: 'Tailwind CSS',
    components: 'Radix UI',
    state: 'Zustand',
    needsStandardsUpdate: false,
  },
  {
    key: 'custom',
    label: 'Custom (enter your own)',
    needsStandardsUpdate: true,
  },
];

const AI_TOOLS = [
  { key: 'both', label: 'Claude Code + Gemini', default: true },
  { key: 'claude', label: 'Claude Code only' },
  { key: 'gemini', label: 'Gemini only' },
];

const AUTONOMY_LEVELS = [
  { level: 1, name: 'Full Control', desc: 'Human approves every checkpoint (first feature, learning SDD)' },
  { level: 2, name: 'Trusted', desc: 'Human reviews plans + merges only (normal development)', default: true },
  { level: 3, name: 'Autopilot', desc: 'Human only approves merges (well-defined, repetitive tasks)' },
  { level: 4, name: 'Full Auto', desc: 'No human checkpoints, CI/CD gates only (bulk simple tasks)' },
];

const BRANCHING_STRATEGIES = [
  { key: 'github-flow', label: 'GitHub Flow', desc: 'main + feature branches (recommended for MVPs)', default: true },
  { key: 'gitflow', label: 'GitFlow', desc: 'main + develop + feature/release/hotfix branches (larger projects)' },
];

// Agent files categorized by scope
const FRONTEND_AGENTS = ['frontend-developer.md', 'frontend-planner.md'];
const BACKEND_AGENTS = ['backend-developer.md', 'backend-planner.md', 'database-architect.md'];

module.exports = {
  DEFAULTS,
  PROJECT_TYPES,
  BACKEND_STACKS,
  FRONTEND_STACKS,
  AI_TOOLS,
  AUTONOMY_LEVELS,
  BRANCHING_STRATEGIES,
  FRONTEND_AGENTS,
  BACKEND_AGENTS,
};
