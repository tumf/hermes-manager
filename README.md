# Hermes Agents WebApp

A Next.js application for managing multiple Hermes Agents running on a mini environment via Web UI.
Provides unified control for agent creation/duplication/deletion, start/stop, config file editing, environment variable management, skill link management, and log viewing.

For detailed operational rules and design guidelines, see:

- Developer Guide: [`AGENTS.md`](./AGENTS.md)
- Requirements: [`docs/requirements.md`](./docs/requirements.md)
- Design: [`docs/design.md`](./docs/design.md)
- Japanese README: [`README_ja.md`](./README_ja.md)

## Tech Stack

- Next.js (App Router)
- React / TypeScript
- Tailwind CSS + shadcn/ui
- Zod (API input validation)
- File-system-based data layer (`runtime/` is the source of truth)

## Setup

Prerequisites:

- Node.js 20+
- npm

Install:

```bash
npm install
```

Build:

```bash
npm run build
```

Start in production (port 18470):

```bash
PORT=18470 npm run start
```

## Development Commands

```bash
npm run dev
npm run test
npm run test:e2e
npm run typecheck
npm run lint
npm run format:check
npm run build
```

## Test Suite Boundaries

- `npm run test` (Vitest): unit/component/integration-style tests under `tests/api`, `tests/components`, `tests/hooks`, `tests/lib`, `tests/ui`.
- `npm run test:e2e` (Playwright): browser E2E tests under `tests/e2e`.
- Playwright tests require a pre-running app server (`npm run dev` or equivalent) because `playwright.config.ts` does not auto-start `webServer`.

## Directory Structure

```text
hermes-agents/
├── app/                    # Next.js App Router (UI / API)
├── components/             # Shared UI components
├── src/lib/                # Filesystem/Env/SkillLink helpers
├── docs/                   # Requirements & design docs
├── openspec/changes/       # Conflux change proposals
├── tests/
│   ├── api|components|hooks|lib|ui/  # Vitest unit/component/integration-style tests
│   └── e2e/                         # Playwright browser E2E tests (requires running app server)
├── runtime/                # Runtime data (agents/globals/logs)
└── AGENTS.md               # Developer guide (must-read)
```

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for contribution guidelines.
