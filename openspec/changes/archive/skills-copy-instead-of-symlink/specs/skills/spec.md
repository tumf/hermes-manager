## ADDED Requirements

### Requirement: Skills links endpoint reflects copied skill directories

The `GET /api/skills/links?agent=<id>` endpoint MUST report equipped skills by scanning real directories under `{agent.home}/skills` that contain `SKILL.md`.

#### Scenario: Copied skills are reported as equipped

Given agent `alice` has a copied directory `{agent.home}/skills/research/arxiv/SKILL.md`
When `GET /api/skills/links?agent=alice` is called
Then the response status is 200
And the response body contains an entry with `relativePath: "research/arxiv"`
And the entry has `exists: true`

#### Scenario: Empty skills directory returns no equipped skills

Given agent `alice` has no copied skills under `{agent.home}/skills`
When `GET /api/skills/links?agent=alice` is called
Then the response status is 200
And the response body is `[]`

### Requirement: POST equips a skill by copying the source directory

The `POST /api/skills/links` endpoint MUST accept `{ agent: string, relativePath: string }`, validate the source under `~/.agents/skills`, and recursively copy that directory into `{agent.home}/skills/{relativePath}`.

#### Scenario: Successful copy-based equip

Given `~/.agents/skills/research/arxiv/SKILL.md` exists
And agent `alice` exists
When `POST /api/skills/links` is called with `{ "agent": "alice", "relativePath": "research/arxiv" }`
Then the response status is 200
And `{agent.home}/skills/research/arxiv/SKILL.md` exists as a real file
And the response body contains `{ ok: true, relativePath: "research/arxiv" }`

#### Scenario: Duplicate copied skill returns conflict

Given `{agent.home}/skills/research/arxiv/SKILL.md` already exists
When `POST /api/skills/links` is called again with `{ "agent": "alice", "relativePath": "research/arxiv" }`
Then the response status is 409
And no additional copy is created

### Requirement: DELETE unequips a skill by removing the copied directory

The `DELETE /api/skills/links?agent=<id>&path=<relativePath>` endpoint MUST remove the copied skill directory rooted at `{agent.home}/skills/{relativePath}` and prune empty ancestor directories under `{agent.home}/skills`.

#### Scenario: Successful copy-based unequip

Given `{agent.home}/skills/research/arxiv/SKILL.md` exists as a copied skill
When `DELETE /api/skills/links?agent=alice&path=research/arxiv` is called
Then the response status is 200
And `{agent.home}/skills/research/arxiv` no longer exists

#### Scenario: Unknown copied skill returns 404

Given `{agent.home}/skills/research/arxiv` does not exist
When `DELETE /api/skills/links?agent=alice&path=research/arxiv` is called
Then the response status is 404

### Requirement: Skills tab works with copied skills

The Skills tab UI MUST determine equipped state from the copy-based `GET /api/skills/links` response and MUST continue to support single-skill and bulk equip/unequip actions.

#### Scenario: Existing copied skills appear checked after page load

Given agent `alice` already has copied skills under `{agent.home}/skills`
When the operator opens the Skills tab
Then the corresponding checkboxes are rendered as checked
And the equipped counter reflects the copied skills
