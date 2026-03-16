Generate a detailed continuation prompt for pasting after /compact or /clear. This prompt must contain ALL context needed to continue working on the SDD DevFlow library and auditing the foodXPlorer project.

## What to do

1. **Read current state** of both projects:
   - Library: `package.json` (version), `CHANGELOG.md` (recent entries), `dev/ROADMAP.md`, `test/smoke.js` (scenario count), `git log --oneline -5`, `git status`
   - foodXPlorer: `docs/project_notes/product-tracker.md` (Active Session + Features table + Completion Log), `.sdd-version`
   - Memory: `/Users/pb/.claude/projects/-Users-pb-Developer-FiveGuays-sdd-devflow-pb/memory/MEMORY.md`

2. **Read key template files** that define the checkpoint mechanism (the core problem we're solving):
   - `template/.claude/skills/development-workflow/SKILL.md` — Steps 1 and 5
   - `template/.claude/skills/development-workflow/references/merge-checklist.md` — 9 actions (0-8)
   - `template/.claude/skills/development-workflow/references/ticket-template.md` — Merge Checklist Evidence section

3. **Build the validation data table** from memory + git history. This tracks checkpoint compliance across features:
   - For each feature F007–latest: version used, session context (start/continuation/post-compact), checkpoint result (PASS/FAIL), intervention needed (yes/no)

4. **Generate the prompt** with these exact sections:

---

### Prompt structure (output this to the user)

```
Continuación de sesión de trabajo en SDD DevFlow + foodXPlorer.

## Estado de la librería
- Repo, versión publicada, tests passing, branch

## Checkpoint evolution y problema central
- El problema: agentes pierden contexto de SKILL.md después de /compact → no ejecutan Merge Approval
- Resumen de cada versión (v0.8.7 → current): qué cambió y por qué
- Tabla de validación completa (Feature | Version | Contexto | Checkpoint | Intervención)
- Diagnóstico actual: qué funciona, qué falla, qué falta por validar

## Estado de foodXPlorer
- Versión SDD instalada
- Features completadas (resumen de cada una con test count)
- Feature activa (si hay alguna) con step actual
- Próximas features pendientes

## Archivos clave del template
- Lista de los 6 archivos de template que definen el checkpoint (3 Claude + 3 Gemini)
- Cambios recientes en cada uno

## Qué hacer ahora
- Pasos ordenados según el estado actual (auditar feature, implementar mejora, publicar, validar...)

## Contexto del usuario
- Trabaja remotamente con sesiones largas — interrupciones costosas
- Principio: "Lo importante es hacerlo bien, no estropear lo anterior, solo mejorarlo"
- Idioma: español para comunicación, inglés para artefactos técnicos

## Comandos custom
- /audit-feature FXXX — audita una feature de foodXPlorer
- /pre-publish — review + commit + tag + push de la librería
- /context-prompt — genera este prompt de continuación
```

---

## Important rules

- Read ALL files before generating — do NOT guess or use stale data from memory
- Include actual version numbers, test counts, and feature IDs from the files you read
- The validation table must be accurate — cross-reference with git history if needed
- If foodXPlorer has an active feature in progress, include its full context (branch, step, ticket path)
- Output the prompt as a single copyable block that the user can paste directly
