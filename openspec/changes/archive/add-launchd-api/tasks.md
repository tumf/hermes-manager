# Tasks: add-launchd-api

## Implementation Tasks

- [x] Create `src/app/api/launchd/route.ts` — Next.js App Router POST handler (verification: app/api/launchd/route.ts exists and exports a POST function)
- [x] Define zod request schema: `{agent: string, action: z.enum(['install','uninstall','start','stop','status'])}` (verification: app/api/launchd/route.ts contains zod schema)
- [x] Implement agent lookup from SQLite via `src/lib/db.ts` — return 404 when agent not found (verification: app/api/launchd/route.ts queries agents table)
- [x] Implement `install` action: generate plist XML and write to `~/Library/LaunchAgents/ai.hermes.gateway.{name}.plist`, then run `launchctl bootstrap gui/{uid} {plist}` via `execFile` (verification: app/api/launchd/route.ts contains plist generation and bootstrap logic)
- [x] Implement `uninstall` action: run `launchctl bootout gui/{uid}/{label}` then remove plist file (verification: app/api/launchd/route.ts contains bootout and unlink logic)
- [x] Implement `start` action: run `launchctl start {label}` via `execFile` (verification: app/api/launchd/route.ts contains start branch)
- [x] Implement `stop` action: run `launchctl stop {label}` via `execFile` (verification: app/api/launchd/route.ts contains stop branch)
- [x] Implement `status` action: run `launchctl print gui/{uid}/{label}`, parse `state =` line, return `{running: bool, output: string, stdout, stderr, code}` (verification: app/api/launchd/route.ts contains status parse logic)
- [x] Ensure all child process invocations use `child_process.execFile` with argument arrays (no shell: true) (verification: app/api/launchd/route.ts has no shell:true and no execSync/exec usage)
- [x] Add unit tests for plist generation and status parsing (verification: tests/api/launchd.test.ts passes with `npm test`)
- [x] Run `npm run build` and confirm no TypeScript errors (verification: `npm run build` exits 0)

## Future Work

- Wire launchd controls into the UI (separate frontend change proposal)
- Validate behavior on a real macOS host with a running launchd
