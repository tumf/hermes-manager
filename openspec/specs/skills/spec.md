# Skills API Spec

## Requirements

### Requirement: Skills tree endpoint returns nested structure

The GET /api/skills/tree endpoint MUST walk ~/.hermes/skills recursively up to
a maximum depth of 5 levels and return a JSON body with a top-level "tree" array
where each node has the shape {name: string, path: string, isDir: boolean,
children?: Node[]}.

#### Scenario: Shallow skills directory

Given the ~/.hermes/skills directory contains two skill directories "coding" and
"writing" each with a SKILL.md file,
When a GET request is made to /api/skills/tree,
Then the response status is 200 and the body contains a "tree" array with two
entries where isDir is true and children is an array.

#### Scenario: Depth limit prevents runaway traversal

Given ~/.hermes/skills contains a directory nested more than 5 levels deep,
When a GET request is made to /api/skills/tree,
Then the response does not include nodes deeper than 5 levels and returns 200
with a partial tree.

#### Scenario: Missing skills root

Given the ~/.hermes/skills directory does not exist,
When a GET request is made to /api/skills/tree,
Then the response status is 200 and the body is {"tree": []}.

### Requirement: Skills links list reflects filesystem reality

The GET /api/skills/links?agent=<name> endpoint MUST return all skill_links rows
for the given agent, each augmented with an "exists" boolean indicating whether
the symlink is currently present on the filesystem.

#### Scenario: All links present

Given an agent "alice" has two skill_links rows and both symlinks exist on disk,
When GET /api/skills/links?agent=alice is called,
Then the response body contains an array of two objects each with exists: true.

#### Scenario: Stale link detected

Given an agent "alice" has one skill_links row but the symlink has been manually
deleted from disk,
When GET /api/skills/links?agent=alice is called,
Then the response body contains one object with exists: false.

#### Scenario: Missing agent parameter

Given a GET request to /api/skills/links without an agent query parameter,
When the server processes the request,
Then the response status is 400 with a JSON error body.

### Requirement: POST creates symlink and DB record atomically

The POST /api/skills/links endpoint MUST accept a JSON body {agent: string,
sourcePath: string}, resolve the targetPath as {agentHome}/skills/{basename},
create the symlink on the filesystem, insert a row into skill_links, and return
{ok: true, targetPath: string}.

#### Scenario: Successful directory link creation

Given sourcePath points to an existing skill directory,
When POST /api/skills/links is called with {agent: "alice", sourcePath: "/path/to/skill"},
Then a symlink is created at {agentHome}/skills/skill, a row is inserted in
skill_links, and the response is {ok: true, targetPath: "..."}.

#### Scenario: File path causes parent directory to be linked

Given sourcePath points to a SKILL.md file rather than a directory,
When POST /api/skills/links is called with that sourcePath,
Then the symlink target is the parent directory of the file, not the file itself.

#### Scenario: Duplicate link returns 409

Given a skill_links row already exists for the same agent and sourcePath,
When POST /api/skills/links is called again with the same body,
Then the response status is 409 with a JSON error body.

### Requirement: DELETE removes symlink and DB record

The DELETE /api/skills/links?id=<id> endpoint MUST remove the symlink from the
filesystem (ignoring ENOENT) and delete the corresponding skill_links row, then
return {ok: true}.

#### Scenario: Successful deletion

Given a skill_links row with id=5 exists and the symlink is present on disk,
When DELETE /api/skills/links?id=5 is called,
Then the symlink is removed, the DB row is deleted, and the response is {ok: true}.

#### Scenario: Deletion with missing symlink

Given a skill_links row with id=7 exists but the symlink was already removed manually,
When DELETE /api/skills/links?id=7 is called,
Then the DB row is deleted, no error is thrown for the missing file, and the
response is {ok: true}.

#### Scenario: Unknown id returns 404

Given no skill_links row exists with id=99,
When DELETE /api/skills/links?id=99 is called,
Then the response status is 404 with a JSON error body.
