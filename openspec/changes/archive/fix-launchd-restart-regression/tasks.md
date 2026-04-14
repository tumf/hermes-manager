## Implementation Tasks

- [x] Restore macOS launchd restart semantics in `src/lib/service-lifecycle.ts` so `restart` does not require unconditional `bootout -> bootstrap` for an already registered service (verification: integration - `tests/api/launchd-route.test.ts` exercises running-service restart path and inspects invoked launchctl commands)
- [x] Preserve dynamic plist/service definition generation without coupling it to unsafe restart-time re-registration of an already running launchd job (verification: integration - `tests/api/launchd-route.test.ts`; manual - inspect updated orchestration flow in `src/lib/service-lifecycle.ts`)
- [x] Add regression coverage for the reported failure mode where a running agent restart returns bootstrap code 5 and leaves the service stopped (verification: integration - new/updated `tests/api/launchd-route.test.ts` cases fail before fix and pass after fix)
- [x] Reconcile launchd-related canonical specs if needed so restart, install/start bootstrapping, and dynamic plist generation boundaries stay consistent (verification: manual - spec delta review under `openspec/changes/fix-launchd-restart-regression/specs/`)
- [x] Run repository checks for the proposal implementation change once code work begins (verification: manual - `npm run test && npm run typecheck && npm run lint`)

## Future Work

- Manual verification on a real macOS launchd environment with an actually running agent, because CI/unit mocks alone cannot fully reproduce launchctl runtime behavior.
