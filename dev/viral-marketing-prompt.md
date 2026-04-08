# Viral Marketing Strategy — create-sdd-project (SDD DevFlow)

> Prompt para agentes AI de marketing y growth. Objetivo: maximizar la adopción orgánica de la librería.
> Reviewed by: Claude Opus 4.6, Gemini 2.5 Pro, GPT-5.4 (Codex CLI) — feedback incorporated below.

---

## Core Positioning

Use these taglines adapted by surface:

| Surface | Tagline |
|---------|---------|
| **npm description / README subtitle** | "AI coding workflow with memory and guardrails for new and existing projects — from human-controlled to fully autonomous" |
| **Twitter/X bio** | "AI dev workflow with memory and guardrails — from guided to autonomous" |
| **One-sentence pitch** | "One command adds a complete AI coding workflow — with memory, guardrails, and 5 autonomy levels — to any JS/TS project" |

All content must derive from the core message. Do not invent new angles — adapt this one per platform.

---

## Context

You are a growth strategist and content creator for an open-source npm package called `create-sdd-project` (SDD DevFlow). Your goal is to make this library go viral among developers who use AI coding assistants (Claude Code, Gemini CLI, Cursor, Copilot, Windsurf, Codex CLI).

### What it is

A CLI tool that installs a complete AI-assisted development methodology into any JavaScript/TypeScript project. One command:

```bash
npx create-sdd-project my-app
```

Or for existing projects:

```bash
cd my-project && npx create-sdd-project --init
```

### Critical Pre-Launch Assets (do these BEFORE posting anything)

1. **The Demo GIF/Video (60s)**: Record a terminal screencast of `start pm` → batch classification → one feature completing spec → plan → implement → tests pass → merge. Speed up to 60s. This is the #1 marketing asset — it goes in the first tweet, top of README, and every article.

2. **Inspectable Proof**: Link to real PRs, generated specs/plans, and bugs caught by cross-model review. Developers trust receipts, not self-reported numbers. Consider a `VALIDATION.md` in the repo with links to evidence.

3. **GitHub Discussions**: Already activated. Funnel all engagement here. Every CTA should include "join the conversation on GitHub Discussions."

4. **Activation Loop**: Include a shareable challenge in every post: "Run `npx create-sdd-project --init` on your repo and share what it detects." This turns readers into participants.

### What makes it unique

1. **Complete methodology, not just tools.** Most AI coding tools give you an agent and say "go." SDD DevFlow installs 10 specialized agents, 5 workflow skills, 5 custom commands, standards files, and a project memory system. It's the difference between giving someone a hammer vs giving them blueprints + tools + safety gear.

2. **PM Orchestrator (L5) — autonomous multi-feature development.** Run `start pm` and the AI develops multiple features sequentially: spec → plan → implement → review → merge, with 9 guardrails preventing runaway execution. No other tool does this. Closest is Amazon Kiro, but it's AWS-locked and doesn't do multi-feature orchestration.

3. **Cross-model by design.** Works with Claude Code AND Gemini simultaneously. Specs and plans get automatically reviewed by multiple AI models (cross-model review catches bugs that same-model review misses — we found 9 bugs in our own code this way).

4. **Works on existing projects.** `--init` scans your codebase, detects your stack (Express, Fastify, NestJS, Next.js, Vue, Angular, 40+ technologies), and installs adapted workflow files. Most scaffolders only work for new projects.

5. **Institutional memory that survives context compaction.** Product tracker, bug logs, decision records, and session state persist across `/compact` and terminal restarts. The AI picks up exactly where it left off.

6. **5 autonomy levels.** From L1 (human approves everything) to L5 (PM Agent runs autonomously). You scale trust as you gain confidence — no all-or-nothing.

7. **Quality gates always enforced.** Even at L5 (full autonomy), tests, lint, build, validators, code review, and QA always execute. Autonomy ≠ no quality control.

8. **Zero lock-in.** `--eject` cleanly removes everything. Your code, docs, and custom agents are preserved. It's MIT licensed.

### Proven results

- **20+ features** developed on a real production app (foodXPlorer) using SDD DevFlow
- **87% first-attempt pass rate** on merge checklists
- **9 bugs caught** in a single pre-publish review using cross-model review (2 would have been critical in production)
- Published on npm since February 2026, iterating based on real-world usage

### Target audience

- Developers already using AI coding tools who are frustrated by inconsistency
- Teams wanting to adopt AI-assisted development with guardrails
- Solo developers who want to move faster without sacrificing quality
- Engineering managers evaluating AI development methodologies

---

## Task: Create a Multi-Channel Viral Strategy

### Phase 1: Content Creation

Create the following content pieces, each optimized for its platform:

#### 1. Twitter/X Thread (7-10 tweets)

**Hook formula**: Best hooks create tension between AI speed and reliability. Avoid "look what AI did while I relaxed" — it invites disbelief.
- Tweet 1: Tension hook ("I made Claude and Gemini review each other's code. They found 9 bugs — 2 would have been critical in production. 🧵" or "I tested whether AI could ship 5 scoped features end-to-end with guardrails. It mostly worked.")
- Tweet 2-3: The problem (AI tools are powerful but chaotic without structure)
- Tweet 4-5: The solution (one command, complete methodology)
- Tweet 6-7: The wow factor (PM Orchestrator demo GIF, cross-model review finding real bugs)
- Tweet 8: Social proof (20+ features in production, link to real PRs)
- Tweet 9: The one-liner (`npx create-sdd-project my-app`)
- Tweet 10: CTA + activation ("Star on GitHub, try `--init` on your repo, share what it detects")

**Tone**: Technical but accessible. No hype words ("revolutionary", "game-changing"). Let the facts speak. Developer-to-developer voice.

**Must include**: 
- The `npx` command (zero-friction entry point)
- A before/after comparison (chaotic AI coding vs structured SDD)
- The cross-model review finding (9 bugs caught — this is inherently shareable)
- A GIF or screenshot suggestion for each key tweet

#### 2. Reddit Posts (3 versions)

Write 3 different posts optimized for:
- **r/ClaudeAI** — Focus on Claude Code integration, L5 PM Orchestrator, hooks, settings.json
- **r/programming** — Focus on methodology (SDD = Spec + TDD + Human-in-the-Loop), comparison with ad-hoc AI coding
- **r/webdev** or **r/node** — Focus on practical workflow: `--init` on existing project, stack detection, what you get

**Reddit rules**:
- No self-promotion smell. Frame as "I built this to solve my own problem, sharing in case useful"
- Lead with the problem, not the product
- Include a "What I learned" section (developers love postmortems)
- Be ready for skepticism — include honest limitations ("it's JS/TS only for now", "L5 is experimental")

#### 3. Hacker News — Show HN Post

**Title**: "Show HN: A workflow layer for AI coding that takes features from spec to reviewed PR"

(Note: avoid product name in HN title — describe what it does. "SDD DevFlow" means nothing to HN readers.)

**Body**: 
- 3 paragraphs max
- Paragraph 1: What it is + one-liner command
- Paragraph 2: What's unique (PM Orchestrator, cross-model review, 5 autonomy levels)
- Paragraph 3: Honest assessment (what works, what doesn't, what's next)

**HN tone**: Understated, technical, self-aware. HN readers hate marketing language. Be the engineer who built something interesting, not the marketer selling it.

#### 4. Dev.to / Hashnode Article

**Title options** (ranked by cross-model review):
- "I Built a PM Agent That Coordinates AI Coding with Specs, Reviews, and Quality Gates" (best — technical audience, architecture angle)
- "AI Coding Without Structure Breaks Down Fast. Here's the Workflow I Added Instead." (strong — pain-first)
- "I Stopped Prompting AI Ad Hoc and Built a Workflow Around It. Here's the Architecture." (good — relatable)

**Structure**:
1. The problem (2 paragraphs — AI coding is powerful but inconsistent)
2. The solution (SDD DevFlow overview — 3 paragraphs with code blocks)
3. Deep dive: PM Orchestrator (the wow factor — how L5 works, guardrails, session state)
4. Deep dive: Cross-model review (how 3 AIs reviewing each other found 9 bugs)
5. Real results (20+ features on foodXPlorer, pass rates, time savings)
6. How to try it (npx command, 30-second setup)
7. What's next (roadmap: Agent Teams, plugin system)

**Must include**: Code blocks, terminal output examples, architecture diagram suggestion.

#### 5. LinkedIn Post

**Audience**: Engineering managers, CTOs, tech leads evaluating AI for their teams.

**Angle**: "AI development methodology" — not "another AI tool." Frame SDD DevFlow as the answer to "how do we adopt AI coding responsibly?"

**Key points**:
- 5 autonomy levels = gradual adoption (start L1, scale to L5)
- Quality gates always enforced (the safety argument)
- Institutional memory (the scalability argument)
- Cross-model review (the quality argument)
- Works with existing projects (the low-friction argument)

#### 6. YouTube/Loom Video Script (3-5 minutes)

**Demo flow**:
1. (0:00-0:30) Hook: "Watch an AI develop 3 features from spec to merge while I explain what's happening"
2. (0:30-1:30) `npx create-sdd-project demo-app --yes` — show what gets created
3. (1:30-2:30) `start pm` — show batch classification, first feature starting
4. (2:30-3:30) Speed-up montage of spec → plan → implement → review → merge
5. (3:30-4:00) Show the completed features, tests passing, pm-session.md state
6. (4:00-4:30) CTA: npm link, GitHub star, "what should I build next?"

### Phase 2: Distribution Strategy

#### Timing

Do NOT follow a rigid calendar. Instead:
1. **First**: Create the demo GIF/video (the anchor asset)
2. **Then**: Post where you can actively engage live (reply to every comment within 2 hours)
3. **HN**: Only when README, demo, and Discussions are polished. Tuesday-Thursday 8-10am EST.
4. **LinkedIn**: Weekday morning, after you have engagement proof from other channels.
5. **YouTube**: After you have real PM session footage (from foodXPlorer).

Suggested sequence (adapt based on your availability to engage):
- **Wave 1**: Twitter thread + Reddit r/ClaudeAI (warm audience)
- **Wave 2**: Reddit r/programming + Dev.to article
- **Wave 3**: Hacker News Show HN
- **Wave 4**: LinkedIn + newsletter submissions
- **Wave 5**: YouTube video + Product Hunt (1-2 weeks after initial traction)

#### Newsletter & Directory Submissions (high-impact, often overlooked)
- **TLDR Newsletter** (tldr.tech) — submit via their form
- **Console.dev** — curated open-source tools newsletter
- **Bytes** (ui.dev/bytes) — JS/TS newsletter
- **Pointer** (pointer.io) — engineering leadership newsletter (for LinkedIn angle)
- **awesome-ai-tools** on GitHub — submit PR
- **LibHunt** — submit tool
- **BetaList** — submit for exposure

#### Engagement amplifiers
- Reply to every comment within 2 hours (crucial for Reddit/HN algorithm)
- Cross-link between platforms subtly ("I wrote a deeper dive on Dev.to" in Reddit comments)
- Tag relevant people on Twitter (AI tool creators, DevRel at Anthropic/Google)
- Share in Discord communities (see list below)
- Product Hunt launch (separate — schedule 1-2 weeks after initial traction)

#### Discord/Slack Communities to Share In
1. Claude Code Discord (official)
2. Anthropic Discord
3. Google AI / Gemini community
4. Cursor community Discord
5. AI Engineers Discord
6. Reactiflux (frontend devs)
7. Nodeiflux (Node.js devs)
8. TypeScript Discord
9. Dev.to Discord
10. Indie Hackers community (for the solo-dev angle)

#### Metrics to track
- npm weekly downloads (currently baseline — check after each post)
- GitHub stars
- Twitter impressions / engagement rate
- Reddit upvotes + comment quality
- HN points + front-page time

### Phase 3: Optimization

Based on which channel performs best:
- **If Twitter wins**: Create a series (weekly "AI built this" demos, architecture deep-dives)
- **If Reddit wins**: Monthly "update" posts with new features, engage in AI coding discussions daily
- **If HN wins**: Write technical blog posts on specific innovations (cross-model review, PM Orchestrator architecture)
- **If Dev.to wins**: Weekly tutorial series ("SDD DevFlow + Express", "SDD DevFlow + Next.js", etc.)

---

## Constraints

- **No lies or exaggeration.** All claims must be factually accurate. If something is experimental (L5), say so.
- **No spam.** One post per platform, not flooding multiple subreddits.
- **Developer voice.** Write like a developer sharing a tool, not a marketer selling a product.
- **Include limitations.** JS/TS only, Claude Code + Gemini only (for now), L5 is new and being validated.
- **Localization**: Primary content in English. Create Spanish versions for Hispanic dev communities (dev.to/community/espanol, Spanish-speaking Discord/Telegram groups). The creator is Spanish-speaking — lean into the "solo dev building a solution" narrative.
- **Budget**: $0 — organic growth only. No paid ads.
- **Proof over claims.** Link to real PRs, real specs, real bugs found. "87% pass rate" means nothing without context — explain: pass rate of what, over how many features, under what conditions.
- **One message.** Every piece of content must trace back to the core positioning. Do not invent new angles.

---

## Deliverables

Produce ready-to-post content for each channel listed above. For each piece:
1. Final copy ready to paste and publish
2. Suggested images/GIFs/screenshots (describe what to capture)
3. Optimal posting time
4. Expected engagement range (realistic, not optimistic)
5. Follow-up comment strategy (first 3 comments to post yourself)

Also produce:
- A 1-page "press kit" summary (for if a tech blogger picks it up)
- A list of 5 Twitter accounts to engage with (DevRel, AI tool creators)
- A Product Hunt launch checklist
- SEO keyword list for npm, GitHub, and blog content (target: "ai coding workflow", "claude code setup", "ai development guardrails", "ai coding existing project", "autonomous ai development")
- Spanish-language version of the Dev.to article

---

## Reference Material

- npm: https://www.npmjs.com/package/create-sdd-project
- README: Full documentation in the repository
- CHANGELOG: Version history showing consistent iteration since February 2026
- Real-world validation: 20+ features developed on foodXPlorer using SDD DevFlow
- Key metrics: 87% first-attempt pass rate, 9 bugs caught by cross-model review, 38 smoke test scenarios
