## MODIFIED Requirements

### Requirement: Skills tree endpoint returns nested structure

The GET `/api/skills/tree` endpoint MUST walk `~/.agents/skills` recursively and return a hierarchical tree for operator selection. Each node MUST include `name`, `relativePath`, `hasSkill`, and `children`. `hasSkill` is true only when the directory contains `SKILL.md`.

#### Scenario: Tree includes selectable skills and category nodes

Given `~/.agents/skills` contains `dogfood/hermes-config-triage/SKILL.md`
And `~/.agents/skills/dogfood` does not contain `SKILL.md`
When a GET request is made to `/api/skills/tree`
Then the response status is 200
And the `dogfood` node is present with `hasSkill=false`
And the `dogfood/hermes-config-triage` node is present with `hasSkill=true`

#### Scenario: Hidden and non-directory entries are excluded

Given `~/.agents/skills` contains `.hub/` and `QUALITY_STANDARDS.md`
When a GET request is made to `/api/skills/tree`
Then the response tree does not include `.hub`
And the response tree does not include `QUALITY_STANDARDS.md`

### Requirement: Skills links list reflects filesystem reality

The GET `/api/skills/links?agent=<name>` endpoint MUST return all skill link rows for the given agent with `exists` status and a normalized `relativePath` that can be resolved from either `~/.agents/skills` (canonical) or `~/.hermes/skills` (legacy).

#### Scenario: Legacy source path still maps to relative path

Given an agent has a skill_links row whose `sourcePath` is `~/.hermes/skills/refactor`
When GET `/api/skills/links?agent=alice` is called
Then the response includes that row
And its normalized `relativePath` is `refactor`

#### Scenario: Stale link remains visible with exists=false

Given an agent has a skill_links row but the target symlink was removed manually
When GET `/api/skills/links?agent=alice` is called
Then the row is returned with `exists=false`

### Requirement: POST creates symlink and DB record atomically

The POST `/api/skills/links` endpoint MUST accept a JSON body `{agent: string, relativePath: string}`, resolve source as `~/.agents/skills/{relativePath}`, and create the symlink at `{agentHome}/skills/{relativePath}`.

#### Scenario: Hierarchical target path is preserved

Given `relativePath` is `openclaw-imports/refactor`
When POST `/api/skills/links` is called for agent `alice`
Then a symlink is created at `{agentHome}/skills/openclaw-imports/refactor`
And the response status is 200 with `{ok:true}`

#### Scenario: Two same-basename skills can coexist

Given `relativePath` values `refactor` and `openclaw-imports/refactor` both exist in `~/.agents/skills`
When POST `/api/skills/links` is called once for each value
Then both requests succeed
And both symlinks exist under distinct target paths in `{agentHome}/skills`

#### Scenario: Non-skill directory is rejected

Given `relativePath` points to a directory without `SKILL.md`
When POST `/api/skills/links` is called
Then the response status is 400 with a JSON error body

### Requirement: DELETE removes symlink and DB record

The DELETE `/api/skills/links?id=<id>` endpoint MUST remove the target symlink (ignoring ENOENT), delete the DB row, and prune empty parent directories under `{agentHome}/skills` created for hierarchical links.

#### Scenario: Empty parent directories are pruned

Given id=5 points to target `{agentHome}/skills/openclaw-imports/refactor`
And removing that symlink leaves `{agentHome}/skills/openclaw-imports` empty
When DELETE `/api/skills/links?id=5` is called
Then `{agentHome}/skills/openclaw-imports` is removed
And `{agentHome}/skills` remains present
