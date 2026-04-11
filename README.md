# Hermes Agents WebApp

[![日本語](https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-blue?style=flat-square)](./README.ja.md) [![English](https://img.shields.io/badge/English-blue?style=flat-square)](./README.md) [![简体中文](https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-blue?style=flat-square)](./README.zh-CN.md) [![Español](https://img.shields.io/badge/Espa%C3%B1ol-blue?style=flat-square)](./README.es.md) [![Português%20(BR)](<https://img.shields.io/badge/Portugu%C3%AAs%20(BR)-blue?style=flat-square>)](./README.pt-BR.md) [![한국어](https://img.shields.io/badge/%ED%95%9C%EA%B5%AD%EC%96%B4-blue?style=flat-square)](./README.ko.md) [![Français](https://img.shields.io/badge/Fran%C3%A7ais-blue?style=flat-square)](./README.fr.md) [![Deutsch](https://img.shields.io/badge/Deutsch-blue?style=flat-square)](./README.de.md) [![Русский](https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-blue?style=flat-square)](./README.ru.md) [![Tiếng%20Việt](https://img.shields.io/badge/Ti%E1%BA%BFng%20Vi%E1%BB%87t-blue?style=flat-square)](./README.vi.md)

![Hermes Agents WebApp screenshot](./docs/images/ss-agents-1.png)

Hermes Agents WebApp is a Next.js application for centrally managing Hermes Agents operated in the mini environment from a web UI.
It integrates agent creation, duplication, deletion, start/stop control, configuration editing, environment variable management, skill management, cron job operations, chat history inspection, and log viewing.

The Web UI supports the following 10 languages:

- Japanese (`ja`)
- English (`en`)
- Simplified Chinese (`zh-CN`)
- Spanish (`es`)
- Portuguese (Brazil) (`pt-BR`)
- Vietnamese (`vi`)
- Korean (`ko`)
- Russian (`ru`)
- French (`fr`)
- German (`de`)

You can switch languages from the Language Switcher in the shared app shell. The selected locale is stored in `localStorage`, and invalid or missing values fall back to Japanese.

Note: only the application UI is localized. Operational content such as `SOUL.md`, memory files, logs, and chat transcripts is not translated automatically.

> **Trusted-network application** — Hermes Agents WebApp is designed for trusted-network / intranet operation. It does not include public-internet authentication or multi-tenant access control. If you expose it outside a trusted network, add your own authentication and access-control layer in front of it.

For detailed operational rules and design policies, refer to the following:

- Developer guide: [`AGENTS.md`](./AGENTS.md)
- Requirements: [`docs/requirements.md`](./docs/requirements.md)
- Design: [`docs/design.md`](./docs/design.md)
- Contribution guide: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Security reporting: [`SECURITY.md`](./SECURITY.md)
- Support: [`SUPPORT.md`](./SUPPORT.md)

## Key Features

- Centrally manage multiple Hermes Agents from the web UI
- Create, duplicate, delete, start, stop, and restart agents
- Edit `SOUL.md`, `SOUL.src.md`, `memories/MEMORY.md`, `memories/USER.md`, and `config.yaml`
- Manage agent/global environment variables with visibility metadata
- Equip / unequip skills by copying skill directories
- Manage cron jobs and inspect their outputs
- Inspect chat sessions and history through the agent API server
- View gateway / webapp logs with tail / stream
- Switch the UI across 10 supported languages

## Documentation Map

- Overview: this `README.md`
- Japanese README: [`README.ja.md`](./README.ja.md)
- Development workflow and repository rules: [`AGENTS.md`](./AGENTS.md)
- Requirements: [`docs/requirements.md`](./docs/requirements.md)
- Architecture / API design: [`docs/design.md`](./docs/design.md)
- Contribution workflow: [`CONTRIBUTING.md`](./CONTRIBUTING.md)

## Screenshots

### Agents list

![Hermes Agents WebApp screenshot](./docs/images/ss-agents-1.png)

### Memory management

![Hermes Agents memory management screen](./docs/images/ss-agent_memory-1.png)

## Tech Stack

- Next.js (App Router)
- React / TypeScript
- Tailwind CSS + shadcn/ui
- Zod (API input validation)
- Filesystem-based data layer (`runtime/` is the source of truth)

## Setup

Prerequisites:

- Node.js 20+
- npm

Preferred bootstrap entrypoint:

```bash
./.wt/setup
```

This script installs dependencies when needed, prepares runtime directories, and installs available local hooks.

Or manually:

```bash
npm install
npm run build
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

## Test Boundaries

- `npm run test` (Vitest): unit, component, and integration-leaning tests under `tests/api`, `tests/components`, `tests/hooks`, `tests/lib`, and `tests/ui`.
- `npm run test:e2e` (Playwright): browser E2E tests under `tests/e2e`.
- At present there are no committed Playwright specs in `tests/e2e`, so `npm run test:e2e` currently only verifies the execution path via `--pass-with-no-tests`.
- Playwright tests assume the app is already running beforehand (for example with `npm run dev`).

## Directory Structure (Overview)

```text
hermes-agents/
├── app/                    # Next.js App Router (UI / API)
├── components/             # Shared UI components
├── src/lib/                # Filesystem / Env / SkillLink helpers
├── docs/                   # Requirements and design documents
├── openspec/changes/       # Conflux change proposals
├── tests/
│   ├── api|components|hooks|lib|ui/  # Vitest unit/component/integration-leaning tests
│   └── e2e/                         # Playwright browser E2E tests (requires a running app)
├── runtime/                # Runtime data (agents/globals/logs)
└── AGENTS.md               # Must-read guide for developers
```

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the contribution workflow. This document is maintained in English.

## Versioning and Releases

This project uses SemVer-based versioning as it matures.

- Version source of truth: `package.json`
- Release notes: GitHub Releases (user-facing changes and operator upgrade notes)

Until automated release tooling is added, create tagged releases from clean commits that pass `npm run test`, `npm run typecheck`, `npm run lint`, and `npm run format:check`.

## License

MIT. See [`LICENSE`](./LICENSE).
