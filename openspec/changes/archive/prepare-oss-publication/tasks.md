## Implementation Tasks

- [x] Add OSS baseline files at the repository root: `LICENSE`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `SUPPORT.md` (verification: files exist and reflect the repository's trust boundary and contact paths).
- [x] Update `README.md`, `README_ja.md`, and `CONTRIBUTING.md` for open-source readers and contributors (verification: docs mention quick start, trusted-network scope, `.wt/setup`, contribution workflow, and release/versioning guidance).
- [x] Rebalance local quality gates by keeping `pre-commit` fast and moving heavier checks to `pre-push` (verification: `.husky/pre-commit` does not run full typecheck/test/build; `.husky/pre-push` runs the documented heavier checks).
- [x] Strengthen GitHub automation for OSS publication hygiene (verification: `.github/workflows/ci.yml` uses a macOS/Linux matrix with `fail-fast: false` and runs lint, format check, typecheck, test, build).
- [x] Align hosting docs/specs with the current filesystem-based architecture (verification: `hosting/README.md` and `openspec/specs/hosting/spec.md` do not mention DB migrations on startup and describe `start:prod` accurately).
- [x] Validate the proposal and repository checks (verification: `python3 ~/.hermes/skills/cflx-proposal/scripts/cflx.py validate prepare-oss-publication --strict`, `npm run test`, `npm run typecheck`, `npm run lint`).

## Future Work

- Add automated release-note generation or changelog tooling if tagged releases become frequent.
- Add issue templates / GitHub Discussions configuration if community traffic increases.
