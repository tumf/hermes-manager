# Contributing

Thank you for contributing to hermes-agents.
This document outlines the minimum workflow from proposal through implementation and verification.

For detailed development rules and design guidance, always refer to the following documents:

- Developer guide: [`AGENTS.md`](./AGENTS.md)
- Requirements: [`docs/requirements.md`](./docs/requirements.md)
- Design: [`docs/design.md`](./docs/design.md)

## 1. Development Environment Setup

Prerequisites:

- Node.js 20+
- npm

Preferred bootstrap entrypoint:

```bash
./.wt/setup
```

This script installs dependencies when needed, prepares runtime directories, and installs available local hooks.

Start the development server:

```bash
npm run dev
```

## 2. Core Coding Rules

- Review the rules in `AGENTS.md` before making any implementation changes
- If requirements or design need to change, **update the documents under `docs/` before implementing code changes**
- Validate API inputs with zod
- Prevent path traversal in all path handling (`resolve` + `startsWith`)
- Use `execFile` (argument arrays) for `launchctl` / `systemctl` / `hermes` execution
- Keep heavy tests out of the default suite unless they are explicitly marked and isolated

## 3. Conflux Workflow (Brief)

1. Create or review a change proposal (`openspec/changes/<change-id>/`)
2. Update proposal / tasks / specs
3. Implement the change and progress the tasks
4. Archive the proposal after acceptance is confirmed

List existing proposals:

```bash
python3 ~/.hermes/skills/cflx-proposal/scripts/cflx.py list
```

## 4. Quality Gates

### Fast local checks (`pre-commit`)

The repository keeps `pre-commit` lightweight so contributors can commit frequently.
It should stay focused on staged-file checks such as `lint-staged` and formatting-related validation.

### Slower checks (`pre-push` / CI)

Heavier validation belongs in `pre-push` and CI:

```bash
npm run test
npm run typecheck
npm run lint
npm run format:check
npm run build
```

Run Playwright separately when browser coverage is present:

```bash
npm run test:e2e
```

## 5. Checks Before a PR

Before opening or updating a PR, run at least:

```bash
npm run test
npm run typecheck
npm run lint
```

Recommended full verification for broad changes:

```bash
npm run format:check
npm run build
npm run test:e2e
```

## 6. Documentation Consistency

- Keep README / CONTRIBUTING focused on high-level guidance only, and link detailed rules to `AGENTS.md` and `docs/`
- If implementation and documentation differ, resolve the discrepancy before requesting review
- Rules about test boundaries must be documented in this file and in `README.md` (English) / `README.ja.md` (Japanese)
- If a change affects trust boundaries, hosting, or operator workflows, update the relevant docs in the same change

## 7. Support and Security

- Use public GitHub issues for reproducible bugs, feature requests, and documentation problems
- Use the private reporting path in [`SECURITY.md`](./SECURITY.md) for vulnerabilities or sensitive findings
