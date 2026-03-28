# Add Agent Skills Tab with Hierarchical Skill Equipping

## Problem/Context

- The agent detail page currently exposes only `Memory`, `Config`, and `Logs`, so operators cannot equip or remove skills from that screen.
- Existing skills API behavior is based on `~/.hermes/skills` and flattens symlink targets to `{agent.home}/skills/{basename}`.
- The requested behavior requires scanning `~/.agents/skills`, supporting nested skill paths, and equipping by creating symlinks into `{agent.home}/skills` while preserving hierarchy.
- Flat basename linking can collide for different skills sharing the same leaf directory name (for example `refactor` and `openclaw-imports/refactor`).

## Proposed Solution

- Add a `Skills` tab to the agent detail page (`app/agents/[name]/page.tsx`) and provide tree-based skill selection with checkboxes for equip/unequip.
- Update `GET /api/skills/tree` to scan `~/.agents/skills`, return hierarchical nodes, and mark whether each directory is equipable (`SKILL.md` present).
- Update `POST /api/skills/links` to accept `{ agent, relativePath }` and create symlinks at `{agent.home}/skills/{relativePath}` so nested structure is preserved.
- Update link listing to return per-agent equipped relative paths and stale-link visibility, including compatibility handling for existing `~/.hermes/skills/*` rows.
- Keep `DELETE /api/skills/links?id=...` as the unlink entrypoint, with parent directory cleanup only when directories become empty.
- Update docs and OpenSpec specs to align with the new root path and hierarchical behavior.

## Acceptance Criteria

- Agent detail UI includes a `Skills` tab and displays hierarchical skill directories from `~/.agents/skills`.
- Only directories containing `SKILL.md` are selectable as equipable skills; category directories are not directly equipable.
- Equipping `relativePath` creates a symlink at `{agent.home}/skills/{relativePath}` and records the link row.
- Two skills with different relative paths but the same basename can be equipped simultaneously without collision.
- Link listing indicates stale entries (`exists: false`) and still resolves relative path information for legacy rows sourced from `~/.hermes/skills`.
- Docs/specs mention `~/.agents/skills` and hierarchical target paths consistently.

## Out of Scope

- Automatic migration rewriting all historical `skill_links.source_path` rows in the database.
- Redesigning skill package format beyond detecting `SKILL.md` presence.
