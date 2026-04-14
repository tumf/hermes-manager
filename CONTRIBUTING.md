# Contributing

Thank you for contributing to hermes-manager.
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

## 7. Versioning and Releases

This project uses SemVer-based versioning as it matures.

- Version source of truth: `package.json`
- Release notes: GitHub Releases (user-facing changes and operator upgrade notes)

### Version bump commands

Use the following npm scripts to increment the version in `package.json`:

| Command              | When to use                                                                          |
| -------------------- | ------------------------------------------------------------------------------------ |
| `npm run bump-patch` | Bug fixes and minor corrections that do not change the public API or feature surface |
| `npm run bump-minor` | New features or enhancements that are backward-compatible                            |
| `npm run bump-major` | Breaking changes that require operator attention on upgrade                          |

Each command runs `npm version <patch|minor|major>`, which updates the `version` field in `package.json` and creates a corresponding git tag (e.g. `v1.2.3`).

Prerequisite: ensure the working tree is clean (`git status` shows no uncommitted changes) before running a bump command. `npm version` will refuse to run on a dirty tree.

### Tagged release workflow

1. Ensure all checks pass: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run format:check`.
2. Run the appropriate bump command (e.g. `npm run bump-patch`).
3. Push the commit and tag: `git push && git push --tags`.
4. Create a GitHub Release from the new tag with user-facing change notes.

## 8. Support and Security

- Use public GitHub issues for reproducible bugs, feature requests, and documentation problems
- Use the private reporting path in [`SECURITY.md`](./SECURITY.md) for vulnerabilities or sensitive findings
