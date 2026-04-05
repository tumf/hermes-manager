## Implementation Tasks

- [ ] Update agent creation flow to persist `SOUL.src.md` as the source-of-truth for new agents and generate assembled `SOUL.md` during creation (verification: `app/api/agents/route.ts`, `src/lib/agents.ts`)
- [ ] Keep template resolution behavior intact while redirecting new-agent SOUL template output into `SOUL.src.md` initial content (verification: `app/api/agents/route.ts`, `src/lib/templates.ts`)
- [ ] Preserve agent detail partial mode detection so newly created agents report `partialModeEnabled=true` without changing legacy agents (verification: `app/api/agents/[id]/route.ts`)
- [ ] Add or update automated tests covering new-agent creation defaults, API shape, and initial Memory tab behavior (verification: `tests/api/agents.test.ts`, `tests/ui/agents-page.test.tsx`, related UI/API tests)
- [ ] Run `npm run test`, `npm run typecheck`, and `npm run lint` after implementation (verification: command output)

## Future Work

- Review whether Add Agent dialog wording should explicitly describe `SOUL.src.md` as the new default editing target
- Consider a follow-up proposal if existing legacy agents should be bulk-migrated to partial mode
