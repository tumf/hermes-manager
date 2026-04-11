---
change_type: implementation
priority: medium
dependencies: []
references:
  - README.md
  - README_ja.md
  - CONTRIBUTING.md
  - .github/workflows/ci.yml
  - .husky/pre-commit
  - hosting/README.md
  - openspec/specs/documentation/spec.md
  - openspec/specs/hosting/spec.md
---

# Prepare repository for open-source publication

**Change Type**: implementation

## Problem / Context

The repository is already useful as an internal tool, but its publication hygiene is incomplete for open-source readers and contributors.

Current gaps discovered during review:

1. The repository root is missing baseline OSS artifacts such as `LICENSE`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, and contributor support guidance.
2. `README.md` / `README_ja.md` explain local development, but they do not clearly communicate the trusted-network operating model, release/versioning policy, or OSS contribution entrypoints.
3. The local quality-gate split is inverted: `.husky/pre-commit` currently runs `lint-staged`, `typecheck`, `test`, and `build`, making commits slow instead of reserving heavier checks for push/CI.
4. CI currently runs only on Ubuntu and does not verify formatting, which is weaker than the macOS/Linux support surface described in the project documents.
5. Hosting documentation/specs still contain stale database-migration wording from a previous architecture, which conflicts with the current filesystem-based runtime design.

## Proposed Solution

1. Add baseline OSS publication files at the repository root:
   - `LICENSE` (MIT)
   - `CODE_OF_CONDUCT.md`
   - `SECURITY.md`
   - `SUPPORT.md`
2. Expand `README.md` and `README_ja.md` so a first-time reader can quickly understand:
   - what the project is
   - who it is for
   - its trusted-network safety boundary
   - quick-start / development commands
   - versioning and release policy
   - where contributors and users should go next
3. Update `CONTRIBUTING.md` to document the stable bootstrap path, repository quality gates, and contribution expectations for tests and docs.
4. Rebalance quality gates:
   - keep `pre-commit` fast (`lint-staged` only)
   - move slower checks to `pre-push`
   - strengthen CI with formatting checks and a macOS/Linux matrix
5. Add lightweight release metadata guidance for GitHub Releases so tagged releases produce cleaner notes.
6. Correct hosting documentation/spec language so it no longer implies DB migration on startup.

## Acceptance Criteria

- [ ] Repository root contains `LICENSE`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, and `SUPPORT.md` with project-appropriate guidance.
- [ ] `README.md` and `README_ja.md` describe overview, quick start, trusted-network safety scope, contributor entrypoints, and versioning/release policy.
- [ ] `CONTRIBUTING.md` documents `.wt/setup`, fast-vs-slow quality gates, and repository verification commands.
- [ ] `.husky/pre-commit` is limited to fast staged-file checks, and a `pre-push` hook performs heavier verification.
- [ ] GitHub CI verifies formatting and runs on both Ubuntu and macOS with `fail-fast: false`.
- [ ] Hosting docs/specs no longer refer to database migration during `start:prod`.
- [ ] `python3 ~/.hermes/skills/cflx-proposal/scripts/cflx.py validate prepare-oss-publication --strict` passes.

## Out of Scope

- Publishing to npm or distributing installable binaries
- Adding external authentication or changing the app's trusted-network runtime model
- Public issue/PR/release creation on GitHub as part of this change
