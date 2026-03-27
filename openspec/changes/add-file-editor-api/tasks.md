# Tasks: add-file-editor-api

## Implementation Tasks

- [ ] Install `js-yaml` package for YAML validation: `npm install js-yaml` and `npm install --save-dev @types/js-yaml` (verification: package.json contains js-yaml dependency)
- [ ] Create `src/app/api/files/route.ts` — Next.js App Router GET and PUT handlers (verification: src/app/api/files/route.ts exists and exports GET and PUT functions)
- [ ] Define zod allowed-path enum: `z.enum(['AGENTS.md', 'SOUL.md', 'config.yaml'])` used in both GET and PUT (verification: src/app/api/files/route.ts contains zod enum for allowed paths)
- [ ] Implement GET handler: resolve agent home from SQLite, join with requested path, validate no traversal, read file, return `{content: string}` (verification: src/app/api/files/route.ts contains GET handler with traversal check)
- [ ] Implement path-traversal guard: `path.resolve(agentHome, requestedPath)` must start with `agentHome` (verification: src/app/api/files/route.ts contains startsWith traversal guard)
- [ ] Implement PUT handler: validate body with zod, run YAML check for config.yaml via js-yaml, write atomically to `.tmp` then rename (verification: src/app/api/files/route.ts contains atomic write logic with rename)
- [ ] Return HTTP 422 with error message when config.yaml content fails YAML parse (verification: src/app/api/files/route.ts returns 422 on yaml error)
- [ ] Return HTTP 404 when agent is not found in the database (verification: src/app/api/files/route.ts returns 404 for missing agent)
- [ ] Add unit tests covering: successful read, disallowed path, traversal attempt, YAML validation failure, atomic write (verification: tests/api/files.test.ts passes with `npm test`)
- [ ] Run `npm run build` and confirm no TypeScript errors (verification: `npm run build` exits 0)

## Future Work

- Integrate with a rich text editor UI component (separate frontend change)
- Support additional file types as requirements evolve
