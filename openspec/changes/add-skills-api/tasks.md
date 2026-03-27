# Tasks — add-skills-api

## Implementation Tasks

- [ ] Create src/lib/skills.ts with walkSkillsTree(root, depth) helper that
  recursively walks ~/.hermes/skills up to 5 levels and returns the nested tree
  structure {name, path, isDir, children?}
- [ ] Implement GET /api/skills/tree route in app/api/skills/tree/route.ts that
  calls walkSkillsTree and returns JSON response
- [ ] Implement GET /api/skills/links route in app/api/skills/links/route.ts
  that queries skill_links for a given agent and checks symlink existence via
  fs.lstatSync for each row
- [ ] Implement POST /api/skills/links handler in the same route file: parse
  {agent, sourcePath} body, resolve targetPath, create symlink with fs.symlinkSync,
  insert row into skill_links table, return {ok: true, targetPath}
- [ ] Implement DELETE /api/skills/links handler: parse id query param, look up
  row, remove symlink with fs.unlinkSync (ignore ENOENT), delete DB row
- [ ] Add zod schemas for request/response validation in src/lib/skills.ts
- [ ] Write unit tests in tests/api/skills.test.ts covering tree walk depth
  limit, link creation, and link deletion
- [ ] Validate proposal with cflx validate add-skills-api --strict
