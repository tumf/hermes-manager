# Add Skills API

**Change Type**: implementation

## Summary

Implement a REST API for managing skill symlinks between the global Hermes skills
library (~/.hermes/skills) and per-agent skill directories. Provides endpoints to
browse the skills tree, list active links, create new symlinks, and remove them,
backed by the skill_links SQLite table.

## Motivation

Agents load skills from their own skills directory via symlinks into the global
library. Without a management API the only way to wire skills is manual shell
commands. This change exposes a clean HTTP interface consumed by the frontend
skill-picker UI.

## Scope

- GET /api/skills/tree — walk ~/.hermes/skills recursively (max 5 levels deep),
  return a nested JSON tree with {name, path, isDir, children?}
- GET /api/skills/links?agent=<name> — list skill_links rows for an agent,
  augmented with exists: bool (symlink presence check at runtime)
- POST /api/skills/links — create a symlink from sourcePath into the agent's
  skills directory, record in skill_links table
- DELETE /api/skills/links?id=<id> — remove symlink from filesystem and delete
  the DB row

## Technical Notes

- Skills root resolved via HERMES_HOME env (default ~/.hermes)
- targetPath computed as {agent.home}/skills/{basename(sourcePath)}
- If sourcePath is a file, the parent directory is linked instead
- Depth limit of 5 prevents runaway traversal of deeply nested directories
- All filesystem operations wrapped in try/catch; missing files return safe
  defaults rather than 500 errors
