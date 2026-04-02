# Switch Skills tab equip/unequip to real directory copies

**Change Type**: implementation

## Summary

Change the Skills tab equip/unequip behavior from symlink-based management to real directory copy/remove management.

When an operator equips a skill from the WebApp, the server should copy the selected skill directory from the global catalog (`~/.agents/skills`) into `{agent.home}/skills/{relativePath}`. When unequipping, the server should remove that copied directory from the agent’s skills tree.

The Skills tab should continue to present the same hierarchical skill tree and checkbox-based UX, but its equipped-state detection and server APIs must reflect copied directories rather than symlink presence.

## Motivation

Hermes itself discovers skills by scanning `HERMES_HOME/skills/**/SKILL.md`. In practice, symlinked skill directories are not reliably discovered because the upstream discovery path uses recursive globbing that does not follow directory symlinks. As a result:

- WebApp can show a skill as equipped,
- but Hermes runtime may fail to discover and load it.

Copying real directories into each agent’s `skills/` directory avoids this mismatch and makes WebApp-managed skills align with Hermes runtime behavior.

## Problem Statement

The current implementation assumes skill activation is represented by filesystem symlinks under `{agent.home}/skills/`.

That assumption no longer holds operationally because:

- actual runtime discovery depends on real directories containing `SKILL.md`,
- existing agents had to be manually migrated from symlinks to real copies,
- `GET /api/skills/links` now reports empty state after migration because it only scans symlinks,
- Skills tab equip/unequip no longer matches the deployed storage model.

## Proposed Solution

Replace the symlink-oriented skill management backend with copy-oriented management while preserving the current user-facing workflow.

### API behavior changes

1. `GET /api/skills/links?agent=...`
   - Scan `{agent.home}/skills` recursively for real skill directories containing `SKILL.md`
   - Return equipped entries based on copied directories, using `relativePath` as the canonical identifier
   - Continue returning enough metadata for the current UI to mark checkboxes as checked

2. `POST /api/skills/links`
   - Validate `{ agent, relativePath }`
   - Resolve the source directory under `~/.agents/skills`
   - Reject traversal and non-skill directories
   - Copy the source directory recursively to `{agent.home}/skills/{relativePath}`
   - If the destination already exists as a real equipped skill, return 409
   - If a destination exists but is stale/partial, support safe replacement semantics only if explicitly defined in implementation

3. `DELETE /api/skills/links?agent=...&path=...`
   - Remove the copied skill directory at `{agent.home}/skills/{relativePath}`
   - Prune empty parent directories under `{agent.home}/skills`
   - Refuse deletion if the target escapes the skills root

### Data model changes

The current `SkillLink` abstraction is symlink-centric (`sourcePath`, `targetPath`, symlink scan, `.skill-link` hybrid behavior).
It should be refactored into a copy-oriented model representing equipped skills discovered from the agent-local filesystem.

We do not need to preserve symlink-specific behavior such as hybrid `.skill-link` sentinels once equip state is represented by copied directories.

### UI behavior

The Skills tab should keep the current workflow:

- browse hierarchical skill tree,
- filter skills,
- check/uncheck a skill,
- bulk select / clear by subtree,
- show equipped counts.

However, all equipped-state reads and write actions must operate against the copy-based backend.

## Acceptance Criteria

- Equipping a skill from the Skills tab creates a real directory under `{agent.home}/skills/{relativePath}` containing `SKILL.md`
- Unequipping a skill removes that copied directory and prunes empty ancestor folders
- Reloading the Skills tab after equipping shows the skill as equipped based on copied-directory discovery
- Reloading the Skills tab after unequipping shows the skill as not equipped
- Bulk equip and bulk unequip continue to work with copied directories
- Existing copied skills created outside the current API are detected correctly by `GET /api/skills/links`
- No symlink-specific `.skill-link` behavior is required for copied skills
- Path traversal is prevented for all source and target path handling

## Technical Notes

- Keep the global catalog read-only; only copy from `~/.agents/skills`
- Use recursive copy and recursive delete primitives from Node fs/promises
- Ignore hidden entries only where appropriate; copied skills must preserve required files/directories under each skill
- Discovery should be based on presence of `SKILL.md` in directories under `{agent.home}/skills`
- Tests should cover migration-compatible behavior where agent skills already exist as real directories

## Out of Scope

- Changing Hermes upstream skill discovery itself
- Deduplicating copied skill contents across agents
- Automatic sync when the source skill in `~/.agents/skills` changes later
- Introducing a separate database for equipped skills
