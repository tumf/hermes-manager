## Implementation Tasks

- [x] Introduce a platform-aware service-manager layer for agent lifecycle operations and definition generation, keeping the current API contract stable where possible (verification: inspect `app/api/launchd/route.ts` and extracted helper modules to confirm platform branching no longer hard-codes `launchctl` paths/commands)
- [x] Implement Linux systemd agent service definition generation and lifecycle command execution, including install/uninstall/start/stop/restart/status behavior and api_server environment injection parity with macOS (verification: inspect new platform helpers and add/extend unit tests covering generated unit content and `systemctl` command arguments)
- [x] Preserve and regression-test macOS launchd behavior after the abstraction split (verification: `npm run test -- tests/api/launchd.test.ts` passes with expectations for launchd-specific artifacts unchanged)
- [x] Add Linux hosting artifacts and operator documentation for running the webapp itself under systemd while retaining existing launchd hosting assets (verification: inspect `hosting/` for a Linux unit file/template and `hosting/README.md` for separate macOS/Linux sections)
- [x] Update product requirements, design docs, and relevant canonical specs to describe cross-platform local service management constraints and terminology (verification: diff shows `docs/requirements.md`, `docs/design.md`, and affected `openspec/specs/*` updated consistently)
- [x] Validate full regression suite (verification: `npm run test && npm run typecheck && npm run lint`)

## Future Work

- Operator validation on a real Linux host with journald inspection and boot-persistence verification
- Optional future API cleanup to rename `/api/launchd` to a supervisor-neutral route after backward-compatibility strategy is decided
