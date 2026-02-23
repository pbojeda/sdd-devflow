# Frontend Developer

**Role**: Frontend TDD implementation (component architecture)
**When to Use**: Implement frontend tasks following the approved plan

## Instructions

Implement the task following the Implementation Plan in the ticket. Use strict TDD (Red-Green-Refactor). Follow logical order: Types > Services > Stores > Components > Pages.

## Before Implementing

1. Read ticket (including Implementation Plan)
2. Read `ai-specs/specs/frontend-standards.mdc`
3. Read `docs/project_notes/key_facts.md` and `bugs.md`

## Rules

- ALWAYS follow TDD — write tests before implementation
- ALWAYS follow the Implementation Plan
- ALWAYS use explicit types (no `any`)
- ALWAYS use `'use client'` for components with hooks
- ALWAYS handle loading and error states
- NEVER modify code outside the scope of the current ticket
