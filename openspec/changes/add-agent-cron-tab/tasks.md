## Implementation Tasks

- [ ] Implement `GET /api/cron?agent=<name>` — read `{agent.home}/cron/jobs.json`, return parsed jobs array with derived fields (`relativePath`-like enrichment, `exists` check not needed; return raw job array) (verification: `app/api/cron/route.ts` exists, reads the correct path, and returns 200 with jobs array).
- [ ] Implement `POST /api/cron` — create a job in `{agent.home}/cron/jobs.json` with validated fields (`agent`, `schedule`, `prompt` required, optional `name`, `skills`, `deliver`, `repeat`, `model`, `provider`); atomic write; assign UUID `id` and compute `next_run_at` via cron parsing (verification: route inserts a new job row and persists to disk atomically using `.tmp` + rename).
- [ ] Implement `PUT /api/cron` — update an existing job by `id`; accept partial fields; recompute `next_run_at` if `schedule` changed; atomic write (verification: route patches the target job row and leaves other jobs untouched).
- [ ] Implement `DELETE /api/cron?agent=<name>&id=<id>` — remove job by id; atomic write (verification: route removes only the matching job row).
- [ ] Implement `POST /api/cron/action` — accept `{agent, id, action}` where `action ∈ {pause, resume, run}`; mutate state fields (`state`, `enabled`, `next_run_at` for run); atomic write (verification: `app/api/cron/action/route.ts` exists and updates only the relevant state fields).
- [ ] Implement `GET /api/cron/output?agent=<name>&id=<id>` — list output files for a job under `{agent.home}/cron/output/{id}/`, return filenames sorted newest-first; add optional `?file=<filename>` to return the file content as string (verification: route lists `*.md` files and returns raw text for a given filename).
- [ ] Implement `src/lib/cron.ts` helper — `getCronHome(agentHome)`, `readJobs(agentHome)`, `writeJobsAtomic(agentHome, jobs)`, `parseCronSchedule(expr)` (basic validity check, no croniter dependency; accept `*/N`, standard 5-field cron, ISO timestamp), `computeNextRunAt(schedule)` (verification: helper module exported and used by all four route files).
- [ ] Add `Cron` tab trigger and content shell to `app/agents/[name]/page.tsx` alongside existing tabs (`Memory`, `Config`, `Logs`) (verification: page source includes `TabsTrigger value="cron"` and `TabsContent value="cron"`).
- [ ] Implement `CronTab` UI component (inline or `src/components/cron-tab.tsx`) — job list table with name, schedule, state badge, next/last run, create button, row actions (pause/resume/run/delete with confirmation) (verification: component fetches `GET /api/cron?agent=...` on mount and renders jobs with correct state badges).
- [ ] Implement `CreateCronJobDialog` / inline form — fields: name, schedule (text with hint), prompt (textarea), skills (comma-separated), deliver, repeat; submit calls `POST /api/cron` (verification: dialog sends correct payload and refreshes job list on success).
- [ ] Implement job output viewer — clicking a job row shows a panel/dialog listing output files; selecting a file renders content in a `<pre>` block (verification: `GET /api/cron/output` is called and content renders on file selection).
- [ ] Add API unit tests in `tests/api/cron.test.ts` covering: list empty, create job, duplicate id guard, delete, pause/resume/run action state transitions, output listing (verification: tests exist and pass under `npm run test`).
- [ ] Update `docs/requirements.md` and `docs/design.md` to mention the Cron tab, `/api/cron` API, and `{HERMES_HOME}/cron/jobs.json` as the data source (verification: both docs reference cron management and the new API endpoints).
- [ ] Run `npm run test && npm run typecheck && npm run lint` (verification: all commands exit 0).

## Future Work

- SSE streaming for live job execution status.
- Schedule expression autocomplete / natural language parsing.
- Cross-agent cron dashboard page.
