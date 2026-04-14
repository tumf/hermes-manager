---
change_type: implementation
priority: medium
dependencies: []
references:
  - package.json
  - README.md
  - AGENTS.md
  - openspec/specs/documentation/spec.md
---

# Add SemVer bump scripts for release version management

**Change Type**: implementation

## Problem / Context

The repository already treats `package.json` as the version source of truth, and `README.md` documents a SemVer-oriented release policy.

However, the release-number workflow is still underspecified in the repository itself:

1. There are no standard commands for incrementing patch, minor, or major versions.
2. Maintainers must remember raw npm commands or edit `package.json` manually, which makes release handling inconsistent.
3. The user explicitly requested a built-in tool for `bump-patch`, `bump-minor`, and `bump-major` style version management.
4. The project does not currently need heavyweight release automation such as changelog generation or hosted release orchestration.

## Proposed Solution

1. Add lightweight package scripts for patch/minor/major SemVer bumps:
   - `bump-patch`
   - `bump-minor`
   - `bump-major`
2. Implement those scripts using npm-native version bump commands so the workflow stays dependency-light and keeps `package.json` as the canonical version source.
3. Document the expected operator workflow, including clean-git-state expectations and the relationship between bump commands and tagged releases.
4. Add an OpenSpec capability describing the repository's explicit release-version bump workflow so future contributors have a stable contract.

## Acceptance Criteria

- [ ] `package.json` defines `bump-patch`, `bump-minor`, and `bump-major` scripts.
- [ ] The bump scripts increment `package.json` using SemVer-compatible patch/minor/major semantics through npm-native tooling instead of a newly introduced release framework.
- [ ] Repository-facing documentation explains when to use each bump command and how the version bump step relates to the existing tagged-release workflow.
- [ ] `python3 ~/.agents/skills/cflx-proposal/scripts/cflx.py validate add-semver-bump-scripts --strict` passes.

## Out of Scope

- Automatic changelog generation
- GitHub Release creation automation
- Multi-package or monorepo release orchestration
- Publishing binaries or npm packages
