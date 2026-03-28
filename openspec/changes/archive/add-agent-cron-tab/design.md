# Design: Add Agent Cron Tab

## Context

Hermes Agent's cron scheduler persists job state as JSON at `{HERMES_HOME}/cron/jobs.json`. The file is owned by the Hermes runtime (gateway + scheduler tick loop); the webapp must read and write it compatibly without breaking the running agent.

The webapp already uses atomic file writes (`.tmp` → `rename`) for `AGENTS.md`, `SOUL.md`, and `config.yaml` via `app/api/files/route.ts`. The same pattern applies here.

## Data Format (jobs.json)

```jsonc
{
  "jobs": [
    {
      "id": "76f1666c11e8", // UUID (12-char hex)
      "name": "my-job",
      "prompt": "...",
      "skills": [],
      "skill": null, // legacy single-skill alias
      "model": null,
      "provider": null,
      "base_url": null,
      "schedule": {
        "kind": "cron",
        "expr": "0 20 * * *",
        "display": "0 20 * * *",
      },
      "schedule_display": "0 20 * * *",
      "repeat": { "times": null, "completed": 0 },
      "enabled": true,
      "state": "scheduled", // scheduled | paused | completed
      "paused_at": null,
      "paused_reason": null,
      "created_at": "2026-03-25T15:53:32.522020+09:00",
      "next_run_at": "2026-03-28T20:00:00+09:00",
      "last_run_at": null,
      "last_status": null,
      "last_error": null,
      "deliver": "telegram:971980613",
      "origin": null,
    },
  ],
  "updated_at": "2026-03-27T22:22:10.847024+09:00",
}
```

## API Design

All routes are under `app/api/cron/`.

| Route              | Method | Body / Query                                                                      | Description                      |
| ------------------ | ------ | --------------------------------------------------------------------------------- | -------------------------------- |
| `/api/cron`        | GET    | `?agent=<name>`                                                                   | Return jobs array from jobs.json |
| `/api/cron`        | POST   | `{agent, schedule, prompt, name?, skills?, deliver?, repeat?, model?, provider?}` | Append new job                   |
| `/api/cron`        | PUT    | `{agent, id, ...partial fields}`                                                  | Patch existing job by id         |
| `/api/cron`        | DELETE | `?agent=<name>&id=<id>`                                                           | Remove job by id                 |
| `/api/cron/action` | POST   | `{agent, id, action: pause\|resume\|run, reason?}`                                | Mutate job state                 |
| `/api/cron/output` | GET    | `?agent=<name>&id=<id>[&file=<filename>]`                                         | List or read output files        |

### Schedule parsing (`src/lib/cron.ts`)

- Accept 5-field cron expressions: `* * * * *`
- Accept shorthand intervals: `30m`, `2h`, `1d` (store as `{ kind: "interval", expr: "30m" }`)
- Accept ISO 8601 timestamp (one-shot): store as `{ kind: "once", expr: "<ts>" }`
- `computeNextRunAt` returns ISO string or `null` if indeterminate (interval/once on create)
- No external dependency required — basic regex validation is sufficient; exact scheduling is left to the Hermes runtime

### Atomic writes

Use `fs.writeFileSync(tmpPath)` + `fs.renameSync(tmpPath, jobsPath)` pattern, same as `app/api/files/route.ts`.

## UI Design

Agent detail page gains a **Cron** tab:

```
┌─────────────────────────────────────────────────────────────┐
│ Memory │ Config │ Cron │ Logs                               │
└─────────────────────────────────────────────────────────────┘

[+ New Job]

┌────────────────┬────────────────┬────────────┬──────────────┬────────┐
│ Name           │ Schedule       │ State      │ Next Run     │        │
├────────────────┼────────────────┼────────────┼──────────────┼────────┤
│ daily-summary  │ 0 20 * * *     │ ● active   │ 2026-03-28   │ ⋮      │
│ hourly-check   │ 0 * * * *      │ ⏸ paused   │ —            │ ⋮      │
└────────────────┴────────────────┴────────────┴──────────────┴────────┘
```

Row action menu (`⋮`): Run Now / Pause / Resume / View Output / Edit / Delete (with confirm dialog).

Output viewer: slide-in panel or dialog listing `{timestamp}.md` files, rendering selected file content as `<pre>` (plain text, not full markdown rendering, to keep implementation minimal).

## Security Notes

- Schedule expressions are validated server-side (regex) to reject obviously malformed input.
- Prompt is NOT scanned on the webapp side (that responsibility belongs to the Hermes runtime's `_scan_cron_prompt`).
- Path traversal protection: agent home is resolved via `db.select(agents).where(name=...)` and all file paths are constructed from it — no user-supplied paths accepted.

## Dependency Notes

- Independent of `add-agent-skills-tab` and `add-agent-env-tab-ui`.
- Can be implemented in parallel with those proposals.
- No DB schema change required; all data lives in `jobs.json`.
