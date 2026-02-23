# Workflow Example: Task B0.1

This document walks through a complete example of executing the development workflow for task B0.1: "Initialize Express + TypeScript project".

---

## Context

**Task ID:** B0.1
**Sprint:** 0 - Project Setup & Infrastructure
**Task:** Initialize Express + TypeScript project
**Priority:** High
**Type:** Setup

---

## Step 0: Spec (Skipped for Simple task)

This is a Simple setup task, so spec update is skipped.

---

## Step 1: Setup

### 1.1 Verify Sprint Tracker

Check `docs/project_notes/sprint-0-tracker.md` exists and no active task.

### 1.2 Check Dependencies

**Result:** No dependencies. B0.1 is the first task.

### 1.3 Create Branch

```bash
git checkout -b feature/sprint0-B0.1-express-setup
```

### 1.4 Update Sprint Tracker

Set task B0.1 status to In Progress and update "Active Task" section.

---

## Step 2: Plan (Skipped for Simple task)

---

## Step 3: Implement (TDD)

### 3.1 TDD Cycle 1: Express App Creation

**RED - Write Failing Test:**

```typescript
// backend/src/app.test.ts
import app from './app';

describe('Express App', () => {
  it('should create an Express application', () => {
    expect(app).toBeDefined();
  });
});
```

```bash
npm test
# FAIL - Cannot find module './app'
```

**GREEN - Minimum Implementation:**

```typescript
// backend/src/app.ts
import express from 'express';

const app = express();

export default app;
```

```bash
npm test
# PASS
```

### 3.2 TDD Cycle 2: Health Check Endpoint

**RED - Write Failing Test:**

```typescript
import request from 'supertest';
import app from './app';

describe('GET /health', () => {
  it('should return 200 OK', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
  });

  it('should return status ok', async () => {
    const response = await request(app).get('/health');
    expect(response.body.status).toBe('ok');
  });
});
```

**GREEN - Minimum Implementation:**

```typescript
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});
```

---

## Step 4: Finalize

### 4.1 Run Production Validator

```
[SEVERITY: HIGH]
File: backend/src/index.ts
Line: 6
Issue: console.log statement
Recommendation: Use proper logging library
```

### 4.2 Fix Issues

Replace `console.log` with proper logger.

### 4.3 Re-validate

```
Status: READY FOR PRODUCTION
- All checks passed
```

### 4.4 Commit

```bash
git commit -m "$(cat <<'EOF'
feat(backend): initialize Express + TypeScript project

- Setup Express server with TypeScript configuration
- Add health check endpoint at GET /health
- Configure Jest for testing
- Add proper logging

Tests: 3 passing

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Step 5: Review

### 5.1 Push and Create PR

```bash
git push -u origin feature/sprint0-B0.1-express-setup
gh pr create --title "feat(backend): initialize Express + TypeScript project" --body "..."
```

### 5.2 Update Sprint Tracker

- Task status: Completed
- Completion Log entry added

---

## Summary

### Task Completed

```
B0.1: Initialize Express + TypeScript project

Branch: feature/sprint0-B0.1-express-setup
Tests: 3 passing
Validation: PASSED
```

### Files Created

```
backend/
├── package.json
├── tsconfig.json
├── .env.example
└── src/
    ├── index.ts
    ├── app.ts
    └── app.test.ts
```

### Lessons Learned

1. **Console.log caught by validator** - Always use proper logging from the start
2. **TDD works** - Tests drove the implementation naturally
3. **Memory system helps** - Having a record of what's done is useful
