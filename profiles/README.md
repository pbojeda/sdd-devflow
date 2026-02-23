# Stack Profiles

Profiles define the technology stack and methodology settings for a project. They are used by the template to customize stack-specific content.

## Default Profile

`default.json` contains the recommended stack:
- **Backend**: Node.js + Express + Prisma + PostgreSQL
- **Frontend**: Next.js (App Router) + Tailwind CSS + Radix UI
- **Testing**: Jest (unit) + Playwright (e2e)
- **Methodology**: TDD + DDD + Spec-Driven Development

## Creating Custom Profiles

Copy `default.json` and modify to match your stack:

```bash
cp profiles/default.json profiles/my-stack.json
```

### Supported Stack Options

| Field | Options |
|-------|---------|
| `backend` | `node-express`, `fastify`, `nestjs` |
| `frontend` | `nextjs`, `vite-react`, `vue-nuxt` |
| `database` | `postgresql`, `mongodb`, `mysql` |
| `orm` | `prisma`, `mongoose`, `typeorm`, `drizzle` |
| `testing` | `jest`, `vitest` |
| `e2e` | `playwright`, `cypress` |
| `validation` | `zod`, `joi`, `class-validator` |
| `css` | `tailwindcss`, `styled-components`, `css-modules` |

## How Profiles Are Used

Currently, profiles serve as documentation for which stack options the template supports. Files marked with `<!-- CONFIG: ... -->` comments indicate where stack-specific content can be swapped.

Future versions will include a CLI tool that reads the profile and auto-configures template files.
