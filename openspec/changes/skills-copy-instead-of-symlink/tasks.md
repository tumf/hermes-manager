## Implementation Tasks

- [x] Refactor `src/lib/skill-links.ts`: replace `listSkillLinks` to scan real directories (rglob for `SKILL.md`) instead of scanning for symlinks. Return `SkillLink[]` with `relativePath` derived from directory position under `{agent.home}/skills`. Remove symlink-specific helpers (`findSymlinks`, hybrid `.skill-link` logic).
- [x] Refactor `src/lib/skill-links.ts`: replace `createSkillLink` to use `fs.cp(source, dest, { recursive: true })` instead of `fs.symlink`. Validate source exists and contains `SKILL.md`. Create parent directories as needed.
- [x] Refactor `src/lib/skill-links.ts`: replace `deleteSkillLink` to use `fs.rm(targetPath, { recursive: true, force: true })` instead of `fs.unlink`. Prune empty ancestor directories under `{agent.home}/skills`.
- [x] Refactor `src/lib/skill-links.ts`: replace `skillLinkExists` to check for directory existence (not symlink existence).
- [x] Update `app/api/skills/links/route.ts` GET handler: call refactored `listSkillLinks` and verify response shape is compatible with current `SkillsTab` frontend expectations.
- [x] Update `app/api/skills/links/route.ts` POST handler: replace symlink creation call with copy-based `createSkillLink`. Remove symlink-specific collision checks, add directory-exists checks.
- [x] Update `app/api/skills/links/route.ts` DELETE handler: replace symlink removal call with directory-removal `deleteSkillLink`. Replace `skillLinkExists` check with directory-exists check.
- [x] Update `tests/api/skills.test.ts`: rewrite mock expectations from symlink-oriented to copy-oriented behavior. Cover: list discovers copied skills, create copies directory, delete removes directory, duplicate equip returns 409, traversal rejected.
- [x] Verify `src/components/skills-tab.tsx` works without changes (it consumes `relativePath` and `exists` from API — confirm interface compatibility).
- [x] Update `docs/design.md` §3 (skill_links → skill copies) and §5 (API notes) to reflect copy-based behavior.
- [x] Update `docs/requirements.md` FR-6 description to reference directory copy instead of symlink management.
- [x] Run `npm run test && npm run typecheck && npm run lint` — all must pass.

## Future Work

- Build and restart webapp, then verify Skills tab on a live agent shows correct equipped state for already-copied skills (requires launchd-managed live runtime and operator environment outside this repository sandbox).

## Migration Notes

- Existing agents already have real copied skill directories (migrated manually). The new `listSkillLinks` must detect these correctly on first load — no migration script needed.
- If any agents still have stale symlinks, `listSkillLinks` should ignore them (they won't contain `SKILL.md` as a real file via lstat).
