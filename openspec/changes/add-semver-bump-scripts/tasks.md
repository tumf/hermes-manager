## Implementation Tasks

- [ ] Add `bump-patch`, `bump-minor`, and `bump-major` scripts to `package.json` using npm-native version bump commands (verification: manual - inspect `package.json` scripts and confirm each command maps to the intended SemVer increment).
- [ ] Update contributor-facing release/versioning documentation to explain the bump workflow, expected clean-git-state precondition, and how the version bump step relates to tagged releases (verification: manual - confirm `README.md` and any touched contributor docs describe the three commands and their intended usage).
- [ ] Validate the OpenSpec proposal after authoring the delta (verification: manual - run `python3 /Users/tumf/.agents/skills/cflx-proposal/scripts/cflx.py validate add-semver-bump-scripts --strict`).

## Future Work

- Add changelog automation if tagged releases become frequent enough to justify a dedicated release tool.
- Consider GitHub Release note automation separately from the version bump command workflow.
