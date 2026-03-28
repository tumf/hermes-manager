# Design: Add Agent Skills Tab with Hierarchical Equipping

## Context

The existing skills API was designed around direct `sourcePath` input and flattened target linking by basename. The new requirement changes both UX and data-flow assumptions:

- canonical skill catalog root changes to `~/.agents/skills`
- equip operations must preserve nested relative paths
- UI must expose a tree and equipability boundaries (`SKILL.md`)

## Goals

- Keep API and UI behavior aligned with hierarchical skill directories.
- Preserve compatibility with already-stored rows that still reference `~/.hermes/skills`.
- Avoid introducing DB migrations unless required by behavior.

## Non-Goals

- Full historical DB rewrite for legacy rows.
- Cross-agent bulk operations.

## API/Data Design

### Skill catalog tree

`GET /api/skills/tree` returns a hierarchical tree rooted at `~/.agents/skills`.

Node fields:

- `name`: directory name
- `relativePath`: path relative to catalog root
- `hasSkill`: whether `SKILL.md` exists in that directory
- `children`: nested nodes

Filtering rules:

- skip hidden entries and non-directory entries in the catalog tree
- include category directories even when `hasSkill=false`

### Equip operation

`POST /api/skills/links` input:

- `agent: string`
- `relativePath: string`

Server flow:

1. resolve source as `~/.agents/skills/{relativePath}`
2. verify source directory exists and contains `SKILL.md`
3. compute target as `{agent.home}/skills/{relativePath}`
4. create parent directories as needed
5. create symlink and insert DB row

Collision rule:

- if target exists and is not the intended symlink destination, return conflict

### Link listing compatibility

`GET /api/skills/links?agent=...` continues to use `skill_links` rows, with response enrichment:

- `exists`: target symlink presence
- derived `relativePath`
- optional compatibility marker for legacy source roots

Relative path derivation accepts:

- `~/.agents/skills/*` (canonical)
- `~/.hermes/skills/*` (legacy)

## UI Design

Agent details adds `Skills` tab:

- left-to-right hierarchy display with expand/collapse
- checkbox only for `hasSkill=true` directories
- checked state from equipped-link set (by `relativePath`)
- action disables row while request in-flight
- stale-link badge when listed link has `exists=false`

## Risks and Mitigations

- Risk: duplicate basename collisions from old flat links
  - Mitigation: nested target path by relative path, explicit conflict handling
- Risk: mixed canonical and legacy source paths
  - Mitigation: normalize at read time, canonicalize new writes
- Risk: accidental traversal
  - Mitigation: strict relative-path validation + root-bounded resolve checks
